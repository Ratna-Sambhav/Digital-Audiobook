# app/routers/sessions.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
import uuid

from app.schemas import SessionCreate, SessionUpdate, SessionResponse, FileResponse
from app.auth import get_current_user
from app.database import sessions_table, files_table, Query
from app.models import Session

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.get("", response_model=List[SessionResponse])
async def get_sessions(current_user: dict = Depends(get_current_user)):
    """Get all sessions for current user"""
    Session_q = Query()
    sessions = sessions_table.search(Session_q.userId == current_user["id"])
    sessions.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return [SessionResponse(**session) for session in sessions]

@router.post("", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new session"""
    session = Session(
        id=str(uuid.uuid4()),
        userId=current_user["id"],
        name=session_data.name
    )
    sessions_table.insert(session.to_dict())
    return SessionResponse(**session.to_dict())

@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    session_data: SessionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Rename a session"""
    Session_q = Query()
    session = sessions_table.search(
        (Session_q.id == session_id) & (Session_q.userId == current_user["id"])
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    sessions_table.update(
        {"name": session_data.name, "updated_at": datetime.utcnow().isoformat()},
        (Session_q.id == session_id)
    )
    updated_session = sessions_table.search(Session_q.id == session_id)[0]
    return SessionResponse(**updated_session)

@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a session and all its files"""
    Session_q = Query()
    session = sessions_table.search(
        (Session_q.id == session_id) & (Session_q.userId == current_user["id"])
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    File_q = Query()
    files_table.remove(File_q.session_id == session_id)
    sessions_table.remove(Session_q.id == session_id)
    return {"message": "Session deleted successfully"}

@router.get("/{session_id}/files", response_model=List[FileResponse])
async def get_session_files(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):

    print(f"DEBUG: session_id={session_id}, user={current_user['id']}")

    """Get all files for a session"""
    Session_q = Query()
    session = sessions_table.search(
        (Session_q.id == session_id) & (Session_q.userId == current_user["id"])
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    File_q = Query()
    files = files_table.search(File_q.sessionId == session_id)
    files.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
    return [FileResponse(**file_data) for file_data in files]