import boto3
import json
import base64
import logging
import uuid # For generating unique filenames

# --- Global Scope Best Practices ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_runtime = boto3.client(service_name='bedrock-runtime')
s3_client = boto3.client('s3')

# IMPORTANT: This must be a globally unique name.
S3_BUCKET_NAME = "vidyantra-ai-generated-assets-ab"
def lambda_handler(event, context):
    """
    This function generates an image based on a text prompt using Amazon Bedrock
    (Titan Image Generator G1) and saves the generated image to an S3 bucket.

    It expects an event body with: {"prompt": "your image prompt"}
    It returns a JSON object with: {"imageUrl": "s3://..."}
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # --- 1. Input Validation and Parsing ---
    try:
        body = json.loads(event.get('body', '{}'))
        prompt = body.get('prompt')
        if not prompt:
            raise ValueError("The 'prompt' key is missing from the request body.")
    except Exception as e:
        logger.error(f"Failed to parse request body: {e}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid request. Please provide a JSON body with a "prompt" key.'})
        }

    logger.info(f"Generating image for prompt: '{prompt}'")

    # --- 2. Bedrock API Interaction (Titan Image Generator G1) ---
    try:
        model_id = 'amazon.titan-image-generator-v1'
        
        request_body = {
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {
                "text": prompt
            },
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "quality": "standard",
                "cfgScale": 8.0,
                "seed": 0,
                "width": 1024,
                "height": 1024
            }
        }

        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body)
        )
        
        # --- 3. Process the Image and Upload to S3 ---
        response_body = json.loads(response.get('body').read())
        base64_image_data = response_body.get('images')[0]
        image_data = base64.b64decode(base64_image_data)
        
        # Generate a unique filename for the S3 object
        image_key = f"images/{uuid.uuid4()}.png"

        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=image_key,
            Body=image_data,
            ContentType='image/png'
        )
        
        image_s3_url = f"s3://{S3_BUCKET_NAME}/{image_key}"
        logger.info(f"Successfully uploaded image to {image_s3_url}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'imageUrl': image_s3_url})
        }

    except Exception as e:
        logger.error(f"An error occurred during Bedrock interaction or S3 upload: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'The AI model failed to generate or save the image.'})
        }
