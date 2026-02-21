"""
FastAPI Transcription Service
Local-only transcription server using Faster Whisper
"""

import uuid
import asyncio
from pathlib import Path
from datetime import datetime
from threading import Thread

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn

from transcriber import Transcriber
from word_generator import generate_word_document

app = FastAPI(title="DOCTOR SEARCH - Transcription Service")

# Allow CORS from Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

# In-memory job store
jobs: dict = {}

# Shared transcriber instance (loads model once)
transcriber = Transcriber()

ALLOWED_EXTENSIONS = {".mp4", ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".webm"}


def run_transcription(job_id: str, file_path: str, doctor_name: str,
                      doctor_specialization: str, patient_name: str,
                      original_filename: str):
    """Run transcription in a background thread"""
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 0

        def on_progress(pct):
            jobs[job_id]["progress"] = round(pct, 1)

        result = transcriber.transcribe(
            audio_path=file_path,
            language="he",
            on_progress=on_progress,
        )

        jobs[job_id]["progress"] = 100
        jobs[job_id]["transcription_text"] = result["text"]
        jobs[job_id]["segments"] = result["segments"]
        jobs[job_id]["duration_seconds"] = result["duration_seconds"]

        # Generate Word document
        word_path = generate_word_document(
            transcription_text=result["text"],
            doctor_name=doctor_name,
            doctor_specialization=doctor_specialization,
            patient_name=patient_name,
            original_filename=original_filename,
            duration_seconds=result["duration_seconds"],
            output_path=str(OUTPUTS_DIR / f"{job_id}.docx"),
        )

        jobs[job_id]["word_file_path"] = word_path
        jobs[job_id]["status"] = "completed"

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error_message"] = str(e)
        print(f"Transcription error for job {job_id}: {e}")

    finally:
        # Clean up uploaded file
        try:
            Path(file_path).unlink(missing_ok=True)
        except Exception:
            pass


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "transcription"}


@app.post("/api/transcribe")
async def start_transcription(
    file: UploadFile = File(...),
    doctor_name: str = Form(""),
    doctor_specialization: str = Form(""),
    patient_name: str = Form(""),
):
    # Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Generate job ID
    job_id = str(uuid.uuid4())

    # Save uploaded file
    file_path = UPLOADS_DIR / f"{job_id}{ext}"
    content = await file.read()
    file_path.write_bytes(content)

    # Initialize job
    jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "progress": 0,
        "original_filename": file.filename,
        "transcription_text": None,
        "segments": None,
        "duration_seconds": None,
        "word_file_path": None,
        "error_message": None,
        "created_at": datetime.now().isoformat(),
    }

    # Start transcription in background thread
    thread = Thread(
        target=run_transcription,
        args=(job_id, str(file_path), doctor_name,
              doctor_specialization, patient_name, file.filename),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "pending"}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    return {
        "id": job["id"],
        "status": job["status"],
        "progress": job["progress"],
        "original_filename": job["original_filename"],
        "transcription_text": job["transcription_text"],
        "duration_seconds": job["duration_seconds"],
        "error_message": job["error_message"],
        "created_at": job["created_at"],
    }


@app.get("/api/download/{job_id}")
async def download_word(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    if job["status"] != "completed" or not job["word_file_path"]:
        raise HTTPException(status_code=400, detail="Transcription not ready")

    word_path = Path(job["word_file_path"])
    if not word_path.exists():
        raise HTTPException(status_code=404, detail="Word file not found")

    filename = f"transcription_{job['original_filename'].rsplit('.', 1)[0]}.docx"
    return FileResponse(
        path=str(word_path),
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


if __name__ == "__main__":
    print("=" * 50)
    print("DOCTOR SEARCH - Transcription Service")
    print("Local transcription using Faster Whisper")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
