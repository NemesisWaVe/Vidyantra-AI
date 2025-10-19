import boto3
import json
import logging
import os
import uuid
import tempfile
from moviepy.editor import ImageClip, concatenate_videoclips, AudioFileClip

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3_client = boto3.client('s3')

# CRITICAL: Set temp directory to /tmp for Lambda
TMP_DIR = "/tmp"
os.environ['TMPDIR'] = TMP_DIR
tempfile.tempdir = TMP_DIR
os.environ['IMAGEIO_FFMPEG_EXE'] = '/usr/local/bin/ffmpeg'

def lambda_handler(event, context):
    """
    Downloads assets from S3, creates a simple video perfectly synced to audio.
    Simple and reliable - no fancy effects that can break.
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        body = json.loads(event.get('body', '{}'))
        image_urls = body.get('imageUrls')
        audio_url = body.get('audioUrl')
        output_bucket = body.get('outputBucket')
        
        if not all([image_urls, audio_url, output_bucket]):
            raise ValueError("Request must contain 'imageUrls', 'audioUrl', and 'outputBucket'.")
        
        logger.info(f"Processing {len(image_urls)} images")
        
        # --- Download all assets ---
        local_audio_path = download_s3_file(audio_url, 'audio.mp3')
        local_image_paths = [download_s3_file(url, f'img{i:03d}.png') for i, url in enumerate(image_urls)]
        
        logger.info("All assets downloaded.")
        
        # --- Get Audio Duration ---
        audio_clip = AudioFileClip(local_audio_path)
        audio_duration = audio_clip.duration
        logger.info(f"Audio duration: {audio_duration:.2f} seconds")
        
        # --- Calculate clip duration (distribute evenly across images) ---
        num_images = len(local_image_paths)
        clip_duration = audio_duration / num_images
        
        logger.info(f"Creating {num_images} clips, each {clip_duration:.2f} seconds")
        
        # --- Create Simple Video Clips (no fancy effects) ---
        clips = []
        for image_path in local_image_paths:
            img_clip = ImageClip(image_path).set_duration(clip_duration)
            clips.append(img_clip)
        
        # --- Concatenate clips ---
        final_clip = concatenate_videoclips(clips, method="compose")
        
        # --- Add Audio ---
        final_clip = final_clip.set_audio(audio_clip)
        
        logger.info(f"Final video duration: {final_clip.duration:.2f} seconds")
        
        # --- Write Video File ---
        output_video_path = os.path.join(TMP_DIR, 'output.mp4')
        
        final_clip.write_videofile(
            output_video_path, 
            codec="libx264", 
            fps=24,
            temp_audiofile=os.path.join(TMP_DIR, 'temp-audio.m4a'),
            remove_temp=True,
            audio_codec='aac',
            preset='ultrafast',  # Fast encoding
            logger=None  # Suppress MoviePy logs
        )
        
        logger.info(f"Video generated successfully")
        
        # --- Upload to S3 ---
        output_video_key = f"videos/{uuid.uuid4()}.mp4"
        s3_client.upload_file(output_video_path, output_bucket, output_video_key)
        video_s3_url = f"s3://{output_bucket}/{output_video_key}"
        
        logger.info(f"Uploaded to: {video_s3_url}")
        
        # --- Cleanup ---
        cleanup_tmp_files([output_video_path, local_audio_path] + local_image_paths)
        
        # Close clips to free memory
        audio_clip.close()
        final_clip.close()
        
        return {
            'statusCode': 200, 
            'body': json.dumps({
                'videoUrl': video_s3_url,
                'videoDuration': final_clip.duration,
                'numImages': num_images
            })
        }
        
    except Exception as e:
        logger.error(f"An error occurred: {e}", exc_info=True)
        return {
            'statusCode': 500, 
            'body': json.dumps({'error': str(e)})
        }

def download_s3_file(s3_url, local_filename):
    """Helper function to download a file from an S3 URL."""
    try:
        bucket = s3_url.split('/')[2]
        key = '/'.join(s3_url.split('/')[3:])
        local_path = os.path.join(TMP_DIR, local_filename)
        s3_client.download_file(bucket, key, local_path)
        logger.info(f"Downloaded: {local_filename}")
        return local_path
    except Exception as e:
        logger.error(f"Failed to download {s3_url}: {e}")
        raise

def cleanup_tmp_files(file_paths):
    """Clean up temporary files to free /tmp space."""
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up: {file_path}")
        except Exception as e:
            logger.warning(f"Could not clean up {file_path}: {e}")