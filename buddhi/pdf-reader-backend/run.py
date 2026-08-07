# run.py
import uvicorn
import os
import sys

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    os.makedirs("uploads", exist_ok=True)
    
    # Clear any cached imports
    if 'app.routers.sessions' in sys.modules:
        del sys.modules['app.routers.sessions']
    if 'app.routers.files' in sys.modules:
        del sys.modules['app.routers.files']
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    )