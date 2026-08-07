# app/s3_utils.py

import boto3
from datetime import datetime
from typing import BinaryIO
from app.config import settings
import os

def get_s3_client():
    """Initialize S3 client"""
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        return None
    
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

def generate_s3_key(user_id: str, session_id: str, filename: str) -> str:
    """Generate time-partitioned S3 key"""
    now = datetime.utcnow()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    day = now.strftime("%d")
    
    # Format: year/month/day/user_id/session_id/filename
    return f"{year}/{month}/{day}/{user_id}/{session_id}/{filename}"

def upload_file_to_s3(file_content: BinaryIO, s3_key: str, content_type: str) -> str:
    """Upload file to S3 and return URL"""
    s3_client = get_s3_client()
    
    # If S3 is not configured, save locally
    if s3_client is None:
        local_dir = "uploads"
        os.makedirs(local_dir, exist_ok=True)
        
        # Create subdirectories for time partitioning
        file_path = os.path.join(local_dir, s3_key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(file_content.read())
        
        # Return local URL
        return f"/uploads/{s3_key}"
    
    try:
        s3_client.upload_fileobj(
            file_content,
            settings.S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': content_type}
        )
        
        # Generate public URL
        url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
        return url
    except Exception as e:
        raise Exception(f"Failed to upload to S3: {str(e)}")

def delete_file_from_s3(s3_key: str):
    """Delete file from S3"""
    s3_client = get_s3_client()
    
    # If S3 is not configured, delete locally
    if s3_client is None:
        local_path = os.path.join("uploads", s3_key)
        if os.path.exists(local_path):
            os.remove(local_path)
        return
    
    try:
        s3_client.delete_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key
        )
    except Exception as e:
        raise Exception(f"Failed to delete from S3: {str(e)}")


def generate_presigned_url(key: str, expires_in: int = 3600*24):
    """Generate a temporary, signed link to access a private S3 file."""
    s3_client = get_s3_client()

    return s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": key
        },
        ExpiresIn=expires_in
    )