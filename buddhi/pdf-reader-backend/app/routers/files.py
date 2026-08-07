# app/routers/files.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
import uuid

from app.schemas import FileResponse
from app.auth import get_current_user
from app.database import files_table, sessions_table, Query
from app.models import UploadedFile
from app.s3_utils import upload_file_to_s3, generate_s3_key, delete_file_from_s3, generate_presigned_url

router = APIRouter(prefix="/files", tags=["Files"])

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):

    """Upload a file to S3 and save metadata"""
    # Verify session belongs to user
    Session_q = Query()
    session = sessions_table.search(
        (Session_q.id == session_id) & (Session_q.userId == current_user["id"])
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Generate S3 key with time partitioning
    s3_key = generate_s3_key(current_user["id"], session_id, file.filename)
    # s3_key = generate_s3_key(session_id, session_id, file.filename)
    
    # Get file size BEFORE uploading (while file is still open)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning for upload
    
    # Upload to S3 (or local storage if S3 not configured)
    try:
        s3_url = upload_file_to_s3(file.file, s3_key, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if "note" in file.filename.lower():
        notes = 1
    else: 
        notes = 0
    
    # Save file metadata
    uploaded_file = UploadedFile(
        id=str(uuid.uuid4()),
        session_id=session_id,
        user_id=current_user["id"],
        file_name=file.filename,
        file_type=file.content_type,
        s3_key=s3_key,
        s3_url=s3_url,
        size=file_size,
        notes=notes
    )
    
    files_table.insert(uploaded_file.to_dict())
    return FileResponse(**uploaded_file.to_dict())

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a file"""
    File_q = Query()
    file_data = files_table.search(
        (File_q.id == file_id) & (File_q.userId == current_user["id"])
    )
    
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete from S3
    try:
        delete_file_from_s3(file_data[0]["s3Key"])
    except Exception as e:
        print(f"Error deleting from S3: {e}")
    
    # Delete from database
    files_table.remove(File_q.id == file_id)
    
    return {"message": "File deleted successfully"}


@router.post("/tempUrl")
async def get_file_url(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):

    url = generate_presigned_url(file_id)
    return {"message": "File url retrieved successfully", "temp_url": url}
