# app/auth.py

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.database import users_table, Query
from app.models import User
import uuid

security = HTTPBearer()

def verify_google_token(token: str) -> dict:
    """Verify Google OAuth token and return user info"""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        return idinfo
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_or_create_user(google_user_info: dict) -> User:
    """Get existing user or create new one"""
    email = google_user_info.get("email")
    
    # Check if user exists
    User_q = Query()
    existing_user = users_table.search(User_q.email == email)
    
    if existing_user:
        user_data = existing_user[0]
        return User(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            picture=user_data.get("picture")
        )
    
    # Create new user
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        name=google_user_info.get("name", ""),
        picture=google_user_info.get("picture")
    )
    
    users_table.insert(user.to_dict())
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        
        # Get user from database
        User_q = Query()
        user_data = users_table.search(User_q.id == user_id)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return user_data[0]
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )