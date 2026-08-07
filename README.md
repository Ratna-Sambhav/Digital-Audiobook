# Digital Audiobook

Digital Audiobook is a multi-service workspace for building and experimenting with an audiobook and document-reading experience. It combines React/Vite frontends, a Python-backed API layer, conversational AI components, and audio-related services.

## Repository structure

- azure_conversational_ai/: Python utilities and WebSocket/audio experiments for conversational AI.
- buddhi/
  - pdf-reader-app/: Vite + React + TypeScript PDF reading app.
  - pdf-reader-app-v2/: second iteration of the PDF reader frontend.
  - pdf-reader-backend/: FastAPI-based backend for the reader experience.
- fastapi_backend/: additional FastAPI services and utilities.
- pdf-viewer-pdfjs/: PDF viewer-related assets and experiments.

## Getting started

### Frontend app

For the main React app:

```bash
cd buddhi/pdf-reader-app
npm install
npm run dev
```

For the alternate frontend app:

```bash
cd buddhi/pdf-reader-app-v2
npm install
npm run dev
```

### Backend

The backend entrypoint is defined in the reader backend package:

```bash
cd buddhi/pdf-reader-backend
python run.py
```

This starts the FastAPI app with Uvicorn and enables auto-reload for the application package.

## Notes

- Many of the services in this repository are still evolving, so some subprojects may have their own setup requirements.
- If you are working on a specific feature, it is best to consult the README or entrypoint files inside the relevant subdirectory.

## Suggested next steps

- Review the frontend and backend subprojects separately.
- Check the service-specific source files under the relevant folders for environment variables and runtime requirements.
- Use this workspace as a starting point for integrating the audio, document, and conversational AI experiences.
