# app/routers/agent_functions.py
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List
import uuid

from app.schemas import FileResponse
from app.auth import get_current_user
from app.database import files_table, sessions_table, Query
from app.models import UploadedFile
from app.s3_utils import upload_file_to_s3, generate_s3_key, delete_file_from_s3, generate_presigned_url

from fastapi import APIRouter, HTTPException
import requests
import fitz  # PyMuPDF
import tempfile
import os
from typing import Dict
from app.agent_utilities.note_making import generate_cornell_notes_pdf
from app.agent_utilities.test_making import generate_test_questions

from fastapi import UploadFile
from io import BytesIO
from app.routers.files import upload_file
from fastapi import Request
from app.models import TestQuestion, Test
from app.database import tests_table, questions_table


router = APIRouter(prefix="/agent", tags=["Files"])

class PageRequest(BaseModel):
    file_id: str
    start_page: int
    end_page: int
    session_id: str
    user_id: str

class AgentPageTasks(BaseModel):
    file_id: str
    start_page: int
    end_page: int
    user_instr: str 
    session_id: str
    user_id: str


@router.post("/getPages")
async def get_text_From_specified_pages(request: PageRequest) -> Dict[str, str]:
    """
    Downloads a PDF file from a presigned URL, extracts text between start_page and end_page,
    and deletes the temporary file afterward.
    """
    file_id = request.file_id
    start_page = request.start_page
    end_page = request.end_page
    session_id = request.session_id
    user_id = request.user_id

    url = generate_presigned_url(file_id)

    # Step 1: Download the file
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {e}")

    tmp_path = None
    try:
        # Step 2: Save to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name

        # Step 3: Extract text
        extracted_text = ""
        start_page, end_page = int(start_page), int(end_page)
        with fitz.open(tmp_path) as doc:
            total_pages = len(doc)
            if start_page < 1 or end_page > total_pages or start_page > end_page:
                raise HTTPException(status_code=400, detail=f"Invalid page range. Document has {total_pages} pages.")

            for page_num in range(start_page - 1, end_page):
                page = doc.load_page(page_num)
                extracted_text += page.get_text("text") + "\n"

        return {
            "message": "Text extracted successfully",
            "file_id": file_id,
            "pages": f"{start_page}-{end_page}",
            "extracted_text": extracted_text.strip(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {e}")

    finally:
        # Step 4: Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as cleanup_err:
                print(f"Warning: failed to delete temp file {tmp_path}: {cleanup_err}")


@router.post("/createNotes")
async def get_file_url(request: AgentPageTasks, req: Request) -> Dict[str, str]:
    """
    Downloads a PDF file from a presigned URL, extracts text between start_page and end_page,
    and deletes the temporary file afterward.
    """
    file_id = request.file_id
    start_page = request.start_page
    end_page = request.end_page
    user_intr = request.user_instr
    session_id = request.session_id
    user_id = request.user_id
    auth_token = req.headers.get("Authorization")

    url = generate_presigned_url(file_id)

    # Step 1: Download the file
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {e}")

    tmp_path = None
    try:
        # Step 2: Save to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name

        # Step 3: Extract text
        extracted_text = ""
        start_page, end_page = int(start_page), int(end_page)
        with fitz.open(tmp_path) as doc:
            total_pages = len(doc)
            if start_page < 1 or end_page > total_pages or start_page > end_page:
                raise HTTPException(status_code=400, detail=f"Invalid page range. Document has {total_pages} pages.")

            for page_num in range(start_page - 1, end_page):
                page = doc.load_page(page_num)
                extracted_text += page.get_text("text") + "\n"
        
        notes_pdf_path = generate_cornell_notes_pdf(extracted_text)
        
        # Create an UploadFile object from the PDF content
        original_file_name = file_id.split("/")[-1]

        async with httpx.AsyncClient() as client:
            # Read the generated PDF
            with open(notes_pdf_path, "rb") as pdf_file:
                files = {
                    "file": (f"Notes_{original_file_name}.pdf", pdf_file, "application/pdf")
                }
                data = {
                    "session_id": session_id
                }
                headers = {
                    "Authorization": auth_token
                }
                
                # Make the POST request to upload endpoint
                upload_response = await client.post(
                    "http://localhost:8000/files/upload",
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=30.0
                )
                
                upload_response.raise_for_status()
                upload_result = upload_response.json()
        
        # Clean up temporary files
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if os.path.exists(notes_pdf_path):
            os.unlink(notes_pdf_path)


        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success"
            }
        )

    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": f"Error generating PDF notes: {str(e)}"
            }
        )

    finally:
        # Step 4: Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as cleanup_err:
                print(f"Warning: failed to delete temp file {tmp_path}: {cleanup_err}")



@router.post("/createTests")
async def create_test_questions(request: AgentPageTasks, req: Request) -> JSONResponse:
    """
    Create test questions and multiple choices for the question, from the selected pages
    """
    file_id = request.file_id
    start_page = request.start_page
    end_page = request.end_page
    user_intr = request.user_instr
    session_id = request.session_id
    user_id = request.user_id
    auth_token = req.headers.get("Authorization")

    url = generate_presigned_url(file_id)

    # Step 1: Download the file
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {e}")

    tmp_path = None
    try:
        # Step 2: Save to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name

        # Step 3: Extract text
        extracted_text = ""
        start_page, end_page = int(start_page), int(end_page)
        with fitz.open(tmp_path) as doc:
            total_pages = len(doc)
            if start_page < 1 or end_page > total_pages or start_page > end_page:
                raise HTTPException(status_code=400, detail=f"Invalid page range. Document has {total_pages} pages.")

            for page_num in range(start_page - 1, end_page):
                page = doc.load_page(page_num)
                extracted_text += page.get_text("text") + "\n"
        
        question_answers = generate_test_questions(extracted_text, user_intr)
        
        # Create an UploadFile object from the PDF content
        original_file_name = file_id.split("/")[-1]

        # upload_to_user_db(question_answers, metadata, user_id, session_id)
        test_to_add = Test(
                id = str(uuid.uuid4()),
                session_id = session_id,
                user_id = user_id,
                test_name = question_answers["title"],
                num_questions = len(question_answers["questions"]),
                source_file_name = original_file_name,
                source_pages = f"{start_page}-{end_page}",
        )

        test_questions = [TestQuestion(
            id= str(uuid.uuid4()), 
            session_id= session_id, 
            user_id= user_id, 
            test_name= question_answers["title"],
            question= q["question"], 
            options= q["options"], 
            correct_option= q["correct_option"], 
        ) for q in question_answers["questions"]]


        tests_table.insert(test_to_add.to_dict())
        questions_table.insert_multiple([q.to_dict() for q in test_questions])

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success"
            }
        )

    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": f"Error generating PDF notes: {str(e)}"
            }
        )

    finally:
        # Step 4: Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as cleanup_err:
                print(f"Warning: failed to delete temp file {tmp_path}: {cleanup_err}")