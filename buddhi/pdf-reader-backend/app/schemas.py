# app/schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional

class GoogleLoginRequest(BaseModel):
    credential: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None

class LoginResponse(BaseModel):
    user: UserResponse
    token: str

class SessionCreate(BaseModel):
    name: str

class SessionUpdate(BaseModel):
    name: str

class SessionResponse(BaseModel):
    id: str
    userId: str
    name: str
    createdAt: str
    updatedAt: str

class FileResponse(BaseModel):
    id: str
    sessionId: str
    userId: str
    fileName: str
    fileType: str
    s3Key: str
    s3Url: str
    size: int
    uploadedAt: str