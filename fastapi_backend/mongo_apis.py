from pymongo import MongoClient, DESCENDING, ASCENDING
from bson import ObjectId
import datetime

# Establish a connection to MongoDB
client = MongoClient('mongodb://localhost:27017/')

# Access the 'mydatabase' database (it will be created if it doesn't exist)
db = client['db']

# Access a collection (table) in the database (it will be created if it doesn't exist)
user_collection = db['users']
session_collection = db['sessions']
message_collection = db['messages']
books_collection = db['uploaded_files']

def create_user(userDetails: dict):
    timestamp = datetime.datetime.now(datetime.timezone.utc)
    created_at = timestamp
    name = userDetails['name']
    mailid = userDetails['email']
    user_collection.insert_one({"name": name, "email": mailid, "created_at": created_at})

def retrieve_user_id(userDetails: dict):
    user_info = user_collection.find_one(userDetails)
    return str(user_info["_id"])

def create_user_session(userid: str):
    timestamp = datetime.datetime.now(datetime.timezone.utc)
    result = session_collection.insert_one({
        "user_id": ObjectId(userid),
        "title": None,
        "created_at": timestamp,
        "last_active": timestamp
    })
    return result.inserted_id

def update_session_title(sessionId: str, title: str):
    session_collection.update_one({
        "_id": ObjectId(sessionId)}, 
        {"$set": {"title": title}
    })

def update_session_last_active(sessionId: str):
    timestamp = datetime.datetime.now(datetime.timezone.utc)
    session_collection.update_one({
        "_id": ObjectId(sessionId)}, 
        {"$set": {"last_active": timestamp}
    })

def retrieve_all_sessions(userId):
    all_sessions = session_collection.find({
            "user_id": ObjectId(userId)
        }).sort("last_active", DESCENDING)
    my_sessions = []
    for session in all_sessions:
        my_sessions.append({"session_id": str(session["_id"]) , "title": session["title"], "last_active": session["last_active"]})
    return my_sessions

def add_message(sessionId: str, sender: str, message: str):
    timestamp = datetime.datetime.now(datetime.timezone.utc)
    message_collection.insert_one({
        "session_id": ObjectId(sessionId),
        "sender": sender,   #user/assistant
        "message": message,
        "timestamp": timestamp
    })

def retrieve_history(sessionId: str):
    sorted_messages = message_collection.find({
            "session_id": ObjectId(sessionId)
        }).sort("timestamp", ASCENDING)
    return [{i["sender"]: i["message"], "id": str(i["_id"])} for i in sorted_messages]

def delete_user_session(sessionId: str):
    session_collection.delete_one({
        "_id": ObjectId(sessionId)
    })

def update_history(sessionId: str, questionId: str, new_message: str):
    # 1. Retrieve the current question using questionId
    question = message_collection.find_one({
        "_id": ObjectId(questionId),
        "session_id": ObjectId(sessionId)
    })
    timestamp = question["timestamp"]

    # 2. Delete all messages in the same session with a timestamp greater than the current question
    message_collection.delete_many({
        "session_id": ObjectId(sessionId),
        "timestamp": { "$gte": timestamp }
    })

    # 3. Update the message content of the original question
    message_collection.update_one(
        { "_id": ObjectId(questionId) },
        { "$set": { "message": new_message } }
    )




##### BOOK OTHER FILES FORMATS SAVING AND RETRIEVING FOR USERS ##########
# 1. Add a new file
def add_file(filename, user_id, filesize, file_format, upload_date):
    new_file = {
        "user_id": ObjectId(user_id),
        "file_name": filename,
        "size": filesize,
        "format": file_format,
        "upload_date": upload_date
    }
    result = books_collection.insert_one(new_file)
    return str(result.inserted_id)

# 2. Delete a file based on file_id and user_id
def delete_mongodb_file(file_id, user_id):
    result = books_collection.delete_one({
        "_id": ObjectId(file_id),
        "user_id": ObjectId(user_id)
    })
    return result.deleted_count > 0

# 3. Retrieve file detail based on file_id
def get_file_detail(file_id):
    file = books_collection.find_one({
        "_id": ObjectId(file_id)
    })
    if file:
        file['_id'] = str(file['_id'])
        file['user_id'] = str(file['user_id'])
    return file

# 4. List all file_ids for a given user_id
def list_file_ids_by_user(user_id):
    files = books_collection.find(
        {"user_id": ObjectId(user_id)}
    )
    return [{"_id": str(file['_id']), 
             "file_name": file['file_name'], 
             "file_format": file['format'], 
             "upload_datefile": file['upload_date'],
             "file_size": file["size"]} 
             for file in files]
