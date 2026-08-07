# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import auth, sessions, files, agent_functions

app = FastAPI(
    title="PDF Reader API",
    description="Backend API for PDF Reader Application",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers FIRST - before static files
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(files.router)
app.include_router(agent_functions.router)

@app.get("/")
async def root():
    return {
        "message": "PDF Reader API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Mount uploads directory LAST
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")