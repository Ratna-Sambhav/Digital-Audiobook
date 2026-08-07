# app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException
from app.schemas import GoogleLoginRequest, LoginResponse, UserResponse
from app.auth import verify_google_token, get_or_create_user, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/google", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest):
    """Login with Google OAuth token"""
    # Verify Google token
    google_user_info = verify_google_token(request.credential)
    
    # Get or create user
    user = get_or_create_user(google_user_info)
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "user": UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture
        ),
        "token": access_token
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        picture=current_user.get("picture")
    )