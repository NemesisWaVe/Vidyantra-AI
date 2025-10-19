import boto3
import json
import logging
import uuid
from contextlib import closing

# --- Global Scope Best Practices ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

polly_client = boto3.client('polly')
s3_client = boto3.client('s3')

S3_BUCKET_NAME = "vidyantra-ai-generated-assets-ab"

def lambda_handler(event, context):
    """
    This function takes a text script, generates a voiceover using Amazon Polly,
    and saves the resulting MP3 file to an S3 bucket.

    It expects an event body with: {"script": "your video script"}
    It returns a JSON object with: {"audioUrl": "s3://..."}
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # --- 1. Input Validation and Parsing ---
    try:
        body = json.loads(event.get('body', '{}'))
        script = body.get('script')
        if not script:
            raise ValueError("The 'script' key is missing from the request body.")
    except Exception as e:
        logger.error(f"Failed to parse request body: {e}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid request. Please provide a JSON body with a "script" key.'})
        }

    logger.info(f"Generating audio for script: '{script}'")

    # --- 2. Amazon Polly Interaction ---
    try:
        response = polly_client.synthesize_speech(
            Text=script,
            OutputFormat='mp3',
            VoiceId='Aditi'
        )

        # --- 3. Process the Audio and Upload to S3 ---
        with closing(response['AudioStream']) as stream:
            audio_data = stream.read()
        
        audio_key = f"audio/{uuid.uuid4()}.mp3"

        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=audio_key,
            Body=audio_data,
            ContentType='audio/mp3'
        )
        
        audio_s3_url = f"s3://{S3_BUCKET_NAME}/{audio_key}"
        logger.info(f"Successfully uploaded audio to {audio_s3_url}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'audioUrl': audio_s3_url})
        }

    except Exception as e:
        logger.error(f"An error occurred during Polly interaction or S3 upload: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Failed to generate or save the audio.'})
        }