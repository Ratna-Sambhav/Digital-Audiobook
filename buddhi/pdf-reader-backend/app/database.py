# app/database.py

import os
from tinydb import TinyDB, Query
from app.config import settings

# Ensure data directory exists
os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)

# Initialize TinyDB
db = TinyDB(settings.DB_PATH)

# Tables
users_table = db.table('users')
sessions_table = db.table('sessions')
files_table = db.table('files')
tests_table = db.table('tests')
questions_table = db.table("questions")

# Query object
Query = Query