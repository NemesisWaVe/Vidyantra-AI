import boto3
import json
import logging
import re # Import regular expressions for robust cleaning

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Bedrock client
bedrock_runtime = boto3.client(service_name='bedrock-runtime')

# --- Helper Function to Invoke Bedrock ---
def invoke_bedrock(prompt_text, max_tokens=500):
    """Invokes Claude Haiku and returns the generated text content."""
    claude_haiku_model_id = 'anthropic.claude-3-haiku-20240307-v1:0'
    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt_text}]}]
    }
    try:
        logger.info(f"Invoking Bedrock with max_tokens={max_tokens}")
        response = bedrock_runtime.invoke_model(
            modelId=claude_haiku_model_id,
            body=json.dumps(request_body)
        )
        response_body = json.loads(response.get('body').read())
        generated_text = response_body.get('content', [{}])[0].get('text', '')
        logger.info(f"Bedrock response received (length: {len(generated_text)})")
        return generated_text.strip() # Return just the text

    except Exception as e:
        logger.error(f"Bedrock invocation failed: {e}", exc_info=True)
        raise # Re-raise the exception to be caught by the main handler

# --- Main Handler ---
def lambda_handler(event, context):
    """
    Generates script/storyboard based on query, grade, board, and optional RAG context.
    Makes separate calls for concise script vs detailed explanation + storyboard.
    Uses forceful prompts to prioritize query over irrelevant context.
    """
    logger.info(f"Received event: {json.dumps(event)}")

    try:
        # --- 1. Parse Input ---
        body = json.loads(event.get('body', '{}'))
        query = body.get('query')
        grade_level = body.get('grade_level', '10th')
        board = body.get('board', 'CBSE')
        context_chunks = body.get('context_chunks')

        if not query:
            raise ValueError("Missing 'query' in request body")

        logger.info(f"Generating content for query: '{query}', Grade: {grade_level}, Board: {board}")

        # --- 2. Construct Context Text ---
        context_text = ""
        if context_chunks:
            context_text = "\n\n(Additional Instruction: If the following context seems relevant to the query '{query}', you may optionally use it to enrich your answer. If it is NOT relevant, completely ignore it. Do NOT mention the context if you ignore it.)\n<context>\n"
            safe_chunks = [str(chunk) if chunk is not None else "" for chunk in context_chunks]
            context_text += "\n---\n".join(safe_chunks)
            context_text += "\n</context>"
            logger.info("Using RAG context (conditionally) in prompt.")
        else:
            logger.info("No RAG context provided.")
            context_text = "\n\n(Additional Instruction: No context provided.)" # Add placeholder if no context


        # --- 3. Bedrock API Call #1: Generate CONCISE SCRIPT ---
        script_prompt = f"""
        Human: You are an AI generating content for a short educational video for Vidyantra AI ({board}, {grade_level}).
        Your primary task is to answer the following query/topic concisely.
        Provide an engaging script (30-40 words maximum).
        Your response MUST be ONLY the script text, with no preamble or explanation.

        Query/Topic: "{query}"
        {context_text}

        Assistant:
        """
        logger.info("Generating concise script...")
        concise_script = invoke_bedrock(script_prompt, max_tokens=100)

        # Basic validation
        if not concise_script or "I apologize" in concise_script or "not relevant" in concise_script:
             logger.warning(f"Bedrock failed to generate a valid script, possibly due to context issue. Response: '{concise_script}'. Falling back.")
             # Fallback: Try invoking *without* context
             script_prompt_no_context = f"""
             Human: You are an AI generating content for a short educational video for Vidyantra AI ({board}, {grade_level}).
             Your primary task is to answer the following query/topic concisely.
             Provide an engaging script (30-40 words maximum).
             Your response MUST be ONLY the script text, with no preamble or explanation.

             Query/Topic: "{query}"

             Assistant:
             """
             concise_script = invoke_bedrock(script_prompt_no_context, max_tokens=100)
             if not concise_script: # If still fails, use placeholder
                  concise_script = f"Here's a quick explanation of {query} suitable for {grade_level}."

        # Clean potential leading/trailing quotes
        concise_script = concise_script.strip('"')
        logger.info(f"Final generated script: {concise_script}")


        # --- 4. Bedrock API Call #2: Generate DETAILED EXPLANATION & STORYBOARD ---
        detail_prompt = f"""
        Human: You are an AI generating content for Vidyantra AI ({board}, {grade_level}).
        You previously generated the following concise script about "{query}":
        <concise_script>
        {concise_script}
        </concise_script>

        Your primary task is to elaborate on the topic "{query}".
        Provide a detailed explanation (around 100-150 words) that expands on concepts, provides examples, and offers deeper understanding. This explanation MUST be significantly longer and more detailed than the concise script. Do NOT simply repeat the concise script.
        After writing the detailed explanation, create a storyboard of exactly 6-8 diverse visual prompts based on your explanation.

        Your response MUST be ONLY a valid JSON object with keys "detailed_explanation" (string) and "storyboard" (array of 6-8 strings). No other text, preamble, or markdown formatting.
        {context_text}

        Assistant:
        """
        logger.info("Generating detailed explanation and storyboard...")
        detail_response_text = invoke_bedrock(detail_prompt, max_tokens=1500)

        # Parse the JSON response for details & storyboard
        try:
            cleaned_text = detail_response_text
            # Use regex to find JSON block if markdown exists
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', cleaned_text, re.DOTALL)
            if json_match:
                cleaned_text = json_match.group(1).strip()
            else:
                 if cleaned_text.strip().startswith('```') and cleaned_text.strip().endswith('```'):
                      cleaned_text = cleaned_text.strip()[3:-3].strip()

            if not cleaned_text.strip().startswith('{') or not cleaned_text.strip().endswith('}'):
                 logger.error(f"Cleaned text doesn't look like JSON object: {cleaned_text}")
                 raise ValueError("AI response does not appear to be valid JSON object.")

            # Use strict=False
            detail_json = json.loads(cleaned_text, strict=False)

            detailed_explanation = detail_json.get('detailed_explanation')
            storyboard = detail_json.get('storyboard')

            # Validate structure
            if not detailed_explanation or not isinstance(detailed_explanation, str) or "not relevant" in detailed_explanation or "I apologize" in detailed_explanation:
                 # If explanation failed due to context, try generating *without* context as fallback
                 logger.warning("Detailed explanation failed or was invalid, possibly due to context. Retrying without context.")
                 detail_prompt_no_context = f"""
                 Human: You are an AI generating content for Vidyantra AI ({board}, {grade_level}).
                 The query/topic is "{query}".
                 Provide a detailed explanation (around 100-150 words) elaborating on key concepts and providing examples.
                 Then, create a storyboard of exactly 6-8 diverse visual prompts based on your explanation.
                 Your response MUST be ONLY a valid JSON object with keys "detailed_explanation" (string) and "storyboard" (array of 6-8 strings). No other text.

                 Assistant:
                 """
                 detail_response_text_no_context = invoke_bedrock(detail_prompt_no_context, max_tokens=1500)
                 cleaned_text = detail_response_text_no_context # Use the no-context response
                 json_match = re.search(r'```json\s*(\{.*?\})\s*```', cleaned_text, re.DOTALL)
                 # Re-parse and validate
                 if json_match: cleaned_text = json_match.group(1).strip()
                 # ... (Add similar cleaning logic as above)
                 if not cleaned_text.strip().startswith('{') or not cleaned_text.strip().endswith('}'): raise ValueError("Fallback AI response invalid.")
                 detail_json = json.loads(cleaned_text, strict=False)
                 detailed_explanation = detail_json.get('detailed_explanation')
                 storyboard = detail_json.get('storyboard')
                 # Final validation after fallback
                 if not detailed_explanation or not isinstance(detailed_explanation, str): raise ValueError("Fallback detailed_explanation invalid.")
                 if not storyboard or not isinstance(storyboard, list): raise ValueError("Fallback storyboard invalid.")

            if not storyboard or not isinstance(storyboard, list):
                 raise ValueError("Missing or invalid 'storyboard' in AI response")
            if not all(isinstance(item, str) for item in storyboard):
                 raise ValueError("Storyboard items must be strings.")

            # Validate/Trim storyboard length
            storyboard_count = len(storyboard)
            if storyboard_count < 6:
                 logger.warning(f"Only {storyboard_count} storyboard items generated, expected 6-8.")
            elif storyboard_count > 8:
                 logger.warning(f"{storyboard_count} storyboard items generated, trimming to 8")
                 storyboard = storyboard[:8]

            logger.info(f"Successfully generated explanation with {len(storyboard)} storyboard prompts")

        except (json.JSONDecodeError, ValueError, KeyError) as json_err:
            logger.error(f"Failed to parse JSON response for details/storyboard: {json_err}")
            logger.error(f"Original raw response text received from Bedrock: {detail_response_text}")
            logger.error(f"Cleaned text before parsing attempt: {cleaned_text if 'cleaned_text' in locals() else 'N/A'}")
            # Fallback: Provide a generic error explanation and maybe generic storyboard
            detailed_explanation = f"Error: Could not generate detailed explanation for '{query}'. AI response was invalid."
            storyboard = [f"Generic illustration for {query}"] * 6
            logger.warning("Falling back to generic explanation and storyboard due to parsing error.")
            # Do NOT raise an exception here, return the fallback content instead


        # --- 5. Combine Results & Return ---
        final_json_output = {
            "script": concise_script,
            "detailed_explanation": detailed_explanation,
            "storyboard": storyboard
        }

        return {
            'statusCode': 200,
            'body': json.dumps(final_json_output) # NO HEADERS
        }

    # Catch parsing errors from the initial event body read
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing initial event body: {e}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body.'}) # NO HEADERS
        }
    # Catch specific ValueErrors (like missing query)
    except ValueError as e:
        logger.error(f"Input validation error: {e}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': str(e)}) # NO HEADERS
        }
    # Catch all other exceptions during processing
    except Exception as e:
        logger.error(f"Error in scriptwriter handler: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Failed to generate content: {str(e)}'}) # NO HEADERS
        }