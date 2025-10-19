import boto3
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        body = json.loads(event.get('body', '{}'))
        kb_id = body.get('knowledgeBaseId')
        query = body.get('query')

        if not all([kb_id, query]):
            raise ValueError("Request must contain 'knowledgeBaseId' and 'query'.")

        response = bedrock_agent_runtime.retrieve(
            knowledgeBaseId=kb_id,
            retrievalQuery={'text': query},
            retrievalConfiguration={
                'vectorSearchConfiguration': {
                    'numberOfResults': 3  # Retrieve the top 3 most relevant chunks
                }
            }
        )
        
        retrieved_chunks = [item['content']['text'] for item in response.get('retrievalResults', [])]
        
        logger.info(f"Retrieved {len(retrieved_chunks)} chunks from Knowledge Base.")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'retrieved_chunks': retrieved_chunks})
        }

    except Exception as e:
        logger.error(f"An error occurred: {e}", exc_info=True)
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}