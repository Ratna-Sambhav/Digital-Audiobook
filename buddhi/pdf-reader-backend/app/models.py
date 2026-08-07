# app/models.py

from datetime import datetime
from typing import Optional

class User:
    def __init__(self, id: str, email: str, name: str, picture: Optional[str] = None):
        self.id = id
        self.email = email
        self.name = name
        self.picture = picture
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "picture": self.picture,
            "created_at": self.created_at
        }

class Session:
    def __init__(self, id: str, userId: str, name: str):
        self.id = id
        self.user_id = userId
        self.name = name
        self.created_at = datetime.utcnow().isoformat()
        self.updated_at = datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "name": self.name,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }

class UploadedFile:
    def __init__(self, id: str, session_id: str, user_id: str, file_name: str, 
                 file_type: str, s3_key: str, s3_url: str, size: int, notes: int = 0):
        self.id = id
        self.session_id = session_id
        self.user_id = user_id
        self.file_name = file_name
        self.file_type = file_type
        self.s3_key = s3_key
        self.s3_url = s3_url
        self.size = size
        self.notes = notes  # 0 = not a note, 1 = note
        self.uploaded_at = datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "userId": self.user_id,
            "fileName": self.file_name,
            "fileType": self.file_type,
            "s3Key": self.s3_key,
            "s3Url": self.s3_url,
            "size": self.size,
            "notes": self.notes,
            "uploadedAt": self.uploaded_at
        }


class Test:
    def __init__(self, id: str, session_id: str, user_id: str, test_name: str,
                    num_questions: int, source_file_name: str, source_pages:str):
        self.id = id
        self.session_id = session_id
        self.user_id = user_id
        self.test_name = test_name
        self.num_questions = num_questions
        self.source_file_name = source_file_name
        self.source_pages = source_pages
        self.attempted_number = None 
        self.correct_responses = None 
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "userId": self.user_id,
            "test_name": self.test_name,
            "num_questions": self.num_questions,
            "source_file_name": self.source_file_name,
            "source_pages": self.source_pages,
            "attempted_number": self.attempted_number,
            "correct_responses": self.correct_responses,
            "created_at": self.created_at
        }

class TestQuestion:
    def __init__(self, id: str, session_id: str, user_id: str, test_name: str,
                    question: str, options: list[str], correct_option: int):
        self.id = id
        self.session_id = session_id
        self.user_id = user_id
        self.test_name = test_name
        self.question = question 
        self.options = options
        self.correct_option = correct_option 
        self.user_response = None 
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "userId": self.user_id,
            "test_name": self.test_name,
            "question": self.question,
            "options": self.options,
            "correct_option": self.correct_option,
            "user_response": self.user_response,
            "created_at": self.created_at
        }
