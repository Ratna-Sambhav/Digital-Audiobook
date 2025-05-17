from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from pydantic import BaseModel
from starlette import status
from fastapi.middleware.cors import CORSMiddleware
from utility_functions import *
import datetime
import uvicorn
from google.cloud import storage
from dotenv import load_dotenv
from mongo_apis import *
from openai import OpenAI

load_dotenv()
client = OpenAI()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for dev). Specify domains in prod.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

## GCS Bucket Setup
gcs_client = storage.Client.from_service_account_json("winter-agility-425909-q9-73e61deee040.json")
bucket_name = "user-pdfs-for-digital-library"
bucket = gcs_client.bucket(bucket_name)
# Set and patch the CORS
cors_configuration = [{
    "origin": ["*"],  # or ["https://your-frontend.com"]
    "responseHeader": ["Content-Type"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
}]
bucket.cors = cors_configuration
bucket.patch()


class Query(BaseModel):
    sessionId: str 
    question: str

@app.post("/get_bot_response", status_code = status.HTTP_200_OK)
async def get_bot_response(query: Query):
    sessionId = query.sessionId
    question = query.question
    query_with_history = retrieve_history(sessionId)[:7]
    query_with_history = [{"role": list(i.keys())[0], "content": list(i.values())[0]} for i in query_with_history]
    query_with_history.append({"role": "user", "content": question})
    print(query_with_history)
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=query_with_history
    )
    response = completion.choices[0].message.content
    add_message(sessionId, "user", question)
    add_message(sessionId, "assistant", response)
    return {"response": response}

class message_update(BaseModel):
    sessionId: str 
    questionId: str
    newQuestion: str 

@app.post("/update_message", status_code = status.HTTP_200_OK)
async def update_message(data: message_update):
    sessionId = data.sessionId
    questionId = data.questionId
    newQuestion = data.newQuestion
    update_history(sessionId, questionId, newQuestion)
    return {"response": "Succesful"}

@app.get("/get_all_session/{userId}", status_code = status.HTTP_200_OK)
async def get_all_session(userId: str):
    all = retrieve_all_sessions(userId)
    return {"response": all}

@app.get("/session_history/{sessionId}", status_code = status.HTTP_200_OK)
async def get_session_history(sessionId: str):
    all = retrieve_history(sessionId)
    return {"response": all}

@app.delete("/delete_session/{session_id}", status_code = status.HTTP_200_OK)
async def delete_session(session_id: str):
    delete_user_session(session_id)

class User(BaseModel):
    username: str
    email: str

@app.post("/create_user", status_code = status.HTTP_200_OK)
async def create_user_db(data: User):
    create_user({"name": data.username, "email": data.email})

class SessionCreateRequest(BaseModel):
    userId: str

@app.post("/create_session", status_code = status.HTTP_200_OK)
async def create_session(data: SessionCreateRequest):
    sess_id = create_user_session(data.userId)
    return {"response": str(sess_id)}

@app.post("/get_user_id", status_code = status.HTTP_200_OK)
async def get_user_id(data: User):
    userid = retrieve_user_id({"name": data.username, "email": data.email})
    return {"userId": userid}

class SessionTitleRequest(BaseModel):
    sessionId: str

@app.post("/update_title", status_code = status.HTTP_200_OK)
async def update_title(data: SessionTitleRequest):
    sessionId = data.sessionId
    messages = retrieve_history(sessionId)
    message = list(messages[0].values())[0]
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": f"Make a title for the following question of the user. Keep it of 2 words if possible otherwise not more than 5 words please. \n{message}"
            }
        ]
    )
    title = completion.choices[0].message.content
    update_session_title(sessionId, title)
    return {"response": "Title updated"}


#### ENDPOINTS FOR BOOKS HANDLING  ######
# Upload Endpoint
@app.post("/upload/")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    # Check file type
    if not file.filename.endswith(('.pdf', '.epub')):
        raise HTTPException(status_code=400, detail="Only PDF or EPUB files are allowed.")

    # Check if the file with the same filename already exists for this user
    existing_file = books_collection.find_one({
        "user_id": ObjectId(user_id),
        "file_name": file.filename
    })
    if existing_file:
        raise HTTPException(status_code=409, detail="A file with the same name already exists.")

    # Define the blob path
    blob_path = f"{user_id}/{file.filename}"
    blob = bucket.blob(blob_path)

    # Upload file to GCS
    contents = await file.read()
    blob.upload_from_string(contents, content_type=file.content_type)

    # File metadata
    filesize = len(contents)  # size in bytes
    upload_date = datetime.datetime.now(datetime.UTC)
    file_format = file.filename.split('.')[-1]

    # Save file metadata in MongoDB
    file_id = add_file(file.filename, user_id, filesize, file_format, upload_date)

    return {"message": "File uploaded successfully", "file_id": file_id, "gcs_path": blob_path}

# Delete Endpoint
@app.delete("/delete/")
async def delete_file(
    user_id: str = Form(...),
    file_id: str = Form(...)
):
    # Find file info
    file_doc = books_collection.find_one({
        "_id": ObjectId(file_id),
        "user_id": ObjectId(user_id)
    })
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found.")

    # GCS path
    blob_path = f"{user_id}/{file_doc['file_name']}"
    blob = bucket.blob(blob_path)

    # Delete from GCS
    if blob.exists():
        blob.delete()
    else:
        raise HTTPException(status_code=404, detail="File not found in storage.")

    # Delete metadata from MongoDB
    status = delete_mongodb_file(file_id, user_id)
    return {"message": "File deleted successfully."}


# Generate Temporary Link Endpoint
@app.get("/generate-link/")
async def generate_temporary_link(
    user_id: str,
    file_id: str
):
    file_doc = books_collection.find_one({
        "_id": ObjectId(file_id),
        "user_id": ObjectId(user_id)
    })
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found.")

    blob_path = f"{user_id}/{file_doc['file_name']}"
    blob = bucket.blob(blob_path)

    if not blob.exists():
        raise HTTPException(status_code=404, detail="File not found in storage.")

    # Generate signed URL (valid for 1 hour)
    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(hours=1),
        method="GET"
    )

    return {"temporary_url": url}


@app.get("/api/books/{user_id}")
async def get_all_books(user_id: str):
    file_doc = list_file_ids_by_user(user_id)
    return {"books": file_doc}


##### LIBGEN BOOK SEARCH AND DOWNLOAD ######

# Search book
@app.get("/search-libgen/")
async def search_libgen(book_name: str, number: int):
    try:
        books = fetch_libgen_books(book_name, number)
        if not books:
            raise HTTPException(status_code=404, detail="No books found.")
        return {"count": len(books), "books": books}
    except requests.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch from LibGen: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
# Download a book
@app.post("/libgen-upload/")
async def libgen_upload(
    book_detail_url: str = Form(...),
    user_id: str = Form(...)
):
    """
    Downloads a book from LibGen and uploads it to GCS and MongoDB under the given user ID.
    """
    try:
        file_object, filename = download_libgen_file(book_detail_url)
        file_object.seek(0)

        # Validate file type
        if not filename.endswith(('.pdf', '.epub')):
            raise HTTPException(status_code=400, detail="Only PDF or EPUB files are allowed.")

        # Check if file already exists
        existing_file = books_collection.find_one({
            "user_id": ObjectId(user_id),
            "file_name": filename
        })
        if existing_file:
            raise HTTPException(status_code=409, detail="A file with the same name already exists.")

        # Upload to GCS
        blob_path = f"{user_id}/{filename}"
        blob = bucket.blob(blob_path)
        blob.upload_from_file(file_object, content_type="application/octet-stream")

        # File metadata
        file_object.seek(0, 2)  # move to end of file to get size
        filesize = file_object.tell()  # size in bytes
        upload_date = datetime.datetime.now(datetime.UTC)
        file_format = filename.split('.')[-1]

        # Save metadata in MongoDB
        file_id = add_file(filename, user_id, filesize, file_format, upload_date)

        return {"message": "File uploaded successfully", "file_id": file_id, "gcs_path": blob_path}

    except requests.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch pages: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    




if __name__ == "__main__":
    uvicorn.run(app, port=5000)