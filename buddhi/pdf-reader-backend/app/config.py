# app/config.py

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7

    # Agent Utilities
    GOOGLE_API_KEY: str=""
    SIMLI_API_KEY: str=""
    CARTESIA_API_KEY: str=""
    GOOGLE_APPLICATION_CREDENTIALS: str=""
    
    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "pdf-reader-uploads"
    
    # Database
    DB_PATH: str = "./data/db.json"
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"

settings = Settings()