import boto3
import json
import logging
s3_client = boto3.client('s3')

def get_presigned_url(bucket_name, object_key, expiration=3600):
    """Generates a presigned URL for an S3 object."""
    try:
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': bucket_name,
                                                            'Key': object_key},
                                                    ExpiresIn=expiration)
        return response
    except Exception as e:
        print(f"Error generating presigned URL for {object_key}: {e}")
        return None
# --- Global Scope Best Practices ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

lambda_client = boto3.client('lambda')
dynamodb_client = boto3.resource('dynamodb')
USER_TABLE = dynamodb_client.Table('vidyantra-ai-users')

# S3 bucket name for storing generated content (used by video synthesizer)
OUTPUT_BUCKET = 'vidyantra-ai-generated-assets-ab'

DEFAULT_KNOWLEDGE_BASE_ID = "NYF5KXZAYW"

def lambda_handler(event, context):
    """
    Stateful, personalized orchestrator with RAG capability.

    Workflow:
    1. Receives UserID, query, and optional knowledgeBaseId.
    2. Fetches user profile (grade, board) from DynamoDB.
    3. (Optional) If knowledgeBaseId is provided or defaulted, calls RAG Retriever.
    4. Calls AI Scriptwriter with query, profile, and (optional) RAG context.
    5. Invokes Image Generator(s).
    6. Invokes Audio Generator.
    7. Invokes Video Synthesizer.
    8. Returns all asset URLs.
    """
    logger.info(f"Received event: {json.dumps(event)}")

    retrieved_context = None # Variable to hold RAG results

    try:
        # Get UserID, query, and optional knowledgeBaseId from the event
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('UserID')
        query = body.get('query') # Changed from 'topic' to 'query'
        knowledge_base_id = body.get('knowledgeBaseId', DEFAULT_KNOWLEDGE_BASE_ID) # Use default if not provided

        if not all([user_id, query]):
            raise ValueError("Request body must contain 'UserID' and 'query'.")

        logger.info(f"Orchestrating for UserID: '{user_id}' on query: '{query}'")

        # --- Step 1: Fetch User Profile ---
        response = USER_TABLE.get_item(Key={'UserID': user_id})
        user_profile = response.get('Item')
        if not user_profile:
            raise Exception(f"User with UserID '{user_id}' not found.")

        grade_level = user_profile.get('grade_level', '10th')
        board = user_profile.get('board', 'CBSE')
        logger.info(f"User profile: Grade={grade_level}, Board={board}")

        # --- Step 2: (Optional) Invoke RAG Retriever ---
        if knowledge_base_id:
            logger.info(f"Querying Knowledge Base: {knowledge_base_id}")
            rag_payload = json.dumps({
                "body": json.dumps({
                    "knowledgeBaseId": knowledge_base_id,
                    "query": query
                })
            })
            rag_response = lambda_client.invoke(
                FunctionName='vidyantra-ai-rag-retriever',
                Payload=rag_payload
            )
            rag_result = json.loads(rag_response['Payload'].read())
            if rag_result.get('statusCode') != 200:
                logger.warning(f"RAG Retriever failed: {rag_result.get('body')}. Proceeding without context.")
            else:
                retrieved_context = json.loads(rag_result['body']).get('retrieved_chunks')
                logger.info(f"RAG Retriever returned {len(retrieved_context)} chunks.")
        else:
             logger.info("No Knowledge Base ID provided. Skipping RAG retrieval.")


        # --- Step 3: Invoke AI Scriptwriter (with optional context) ---
        scriptwriter_input = {
            "query": query, # Pass the original question/topic
            "grade_level": grade_level,
            "board": board
        }
        if retrieved_context:
            scriptwriter_input["context_chunks"] = retrieved_context # Add context if RAG was successful

        scriptwriter_payload = json.dumps({"body": json.dumps(scriptwriter_input)})

        scriptwriter_response = lambda_client.invoke(
            FunctionName='vidyantra-ai-scriptwriter',
            Payload=scriptwriter_payload
        )
        scriptwriter_result = json.loads(scriptwriter_response['Payload'].read())
        if scriptwriter_result.get('statusCode') != 200:
            raise Exception(f"Scriptwriter failed: {scriptwriter_result.get('body')}")

        script_data = json.loads(scriptwriter_result['body'])
        script = script_data['script']
        storyboard = script_data['storyboard']
        logger.info("Scriptwriter successful.")


        # --- Step 4, 5, 6: Image, Audio, Video Generation (Mostly Unchanged) ---
        # Image Generation
        image_urls = []
        for prompt in storyboard:
            # Shorten potentially long RAG-based prompts for the image generator if needed
            image_gen_prompt = (prompt[:200] + '...') if len(prompt) > 200 else prompt
            image_payload = json.dumps({"body": json.dumps({"prompt": image_gen_prompt})})
            image_response = lambda_client.invoke(FunctionName='vidyantra-ai-image-generator', Payload=image_payload)
            image_result = json.loads(image_response['Payload'].read())
            if image_result.get('statusCode') == 200:
                 image_urls.append(json.loads(image_result['body'])['imageUrl'])
            else:
                 logger.warning(f"Image generation failed for prompt: {prompt}")
                 image_urls.append(None) # Add placeholder if generation failed

        logger.info(f"Image generation complete ({len(image_urls)} results).")

        # Audio Generation
        audio_payload = json.dumps({"body": json.dumps({"script": script})})
        audio_response = lambda_client.invoke(FunctionName='vidyantra-ai-audio-generator', Payload=audio_payload)
        audio_result = json.loads(audio_response['Payload'].read())
        audio_url = json.loads(audio_result['body'])['audioUrl'] if audio_result.get('statusCode') == 200 else None
        logger.info("Audio generation complete.")

        # Video Synthesizer Invocation
        video_url = None
        # Only proceed if we have valid image and audio URLs
        valid_image_urls = [url for url in image_urls if url]
        if audio_url and len(valid_image_urls) > 0:
            video_payload = json.dumps({
                "body": json.dumps({
                    "imageUrls": valid_image_urls,
                    "audioUrl": audio_url,
                    "outputBucket": OUTPUT_BUCKET
                })
            })
            video_response = lambda_client.invoke(
                FunctionName='vidyantra-ai-video-synthesizer',
                Payload=video_payload
            )
            video_result = json.loads(video_response['Payload'].read())
            video_url = json.loads(video_result['body'])['videoUrl'] if video_result.get('statusCode') == 200 else None
            logger.info("Video synthesis complete.")
        else:
            logger.warning("Skipping video synthesis due to missing image/audio assets.")


        # --- Final Response ---
        # We have S3 URIs (s3://...). We need to convert them to presigned HTTPS URLs.
        
        generated_bucket = OUTPUT_BUCKET # "vidyantra-ai-generated-assets-ab"
        
        def get_key_from_s3_uri(s3_uri):
            """Strips the s3://bucket-name/ prefix to get the object key."""
            if s3_uri is None: 
                return None
            prefix = f"s3://{generated_bucket}/"
            if s3_uri.startswith(prefix):
                return s3_uri[len(prefix):]
            logger.warning(f"Could not parse S3 URI: {s3_uri}")
            return None # Invalid URI

        # Get keys from the S3 URIs that the *other lambdas* sent you
        video_key = get_key_from_s3_uri(video_url)
        audio_key = get_key_from_s3_uri(audio_url)
        
        # Filter out any None values from failed image generations
        valid_image_s3_uris = [url for url in image_urls if url is not None]
        image_keys = [get_key_from_s3_uri(uri) for uri in valid_image_s3_uris]

        # Generate presigned URLs
        presigned_video_url = get_presigned_url(generated_bucket, video_key) if video_key else None
        presigned_audio_url = get_presigned_url(generated_bucket, audio_key) if audio_key else None
        
        presigned_image_urls = []
        for key in image_keys:
            if key: # Ensure key is valid
                presigned_image_urls.append(get_presigned_url(generated_bucket, key))

        final_output = {
            "script": script,
            "imageUrls": presigned_image_urls, # Now a list of https:// URLs
            "audioUrl": presigned_audio_url,     # Now an https:// URL
            "videoUrl": presigned_video_url      # Now an https:// URL
        }
        
        logger.info(f"Returning presigned URLs: {json.dumps(final_output)}")

        return {
            'statusCode': 200,
            'body': json.dumps(final_output)
        }
    except Exception as e:
        logger.error(f"An error occurred during orchestration: {e}", exc_info=True)
        # Return error WITHOUT headers
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}) 
        }