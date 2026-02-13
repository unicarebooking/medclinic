"""
RAG Server - Medical Treatment Summary Search with Ollama

Usage:
  1. Install Ollama: https://ollama.com
  2. Pull model: ollama pull llama3.1:8b
  3. Install deps: pip install -r requirements.txt
  4. Set environment variables (see below)
  5. Run: uvicorn main:app --host 0.0.0.0 --port 8001

Environment Variables:
  SUPABASE_URL          - Supabase project URL
  SUPABASE_SERVICE_KEY  - Supabase service role key (also used as internal API key)
  OLLAMA_MODEL          - Ollama model name (default: llama3.1:8b)
"""

import os
import logging
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import ollama

# Load .env file
load_dotenv(Path(__file__).parent / ".env")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag_server")

# Environment
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    logger.warning(
        "Missing environment variables! Set SUPABASE_URL, SUPABASE_SERVICE_KEY"
    )

# Supabase client (service role - bypasses RLS for fetching data)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# FastAPI app
app = FastAPI(title="MedClinic RAG Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 10
    doctor_id: str


class RAGSource(BaseModel):
    patient_name: str
    date: str


class RAGQueryResponse(BaseModel):
    answer: str
    sources: list[RAGSource]
    total_summaries_scanned: int
    model: str


def verify_internal_key(request: Request) -> None:
    """Verify the internal API key from the Next.js server."""
    key = request.headers.get("X-Internal-Key", "")
    if not key or key != SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def fetch_summaries(doctor_id: str, top_k: int) -> list[dict]:
    """Fetch treatment summaries for a specific doctor only."""
    result = (
        supabase.table("treatment_summaries")
        .select(
            "id, diagnosis, treatment_notes, prescription, follow_up_required, follow_up_date, created_at, "
            "patient:users!treatment_summaries_patient_id_fkey(full_name)"
        )
        .eq("doctor_id", doctor_id)
        .order("created_at", desc=True)
        .limit(top_k)
        .execute()
    )

    return result.data or []


def build_context(summaries: list[dict]) -> tuple[str, list[RAGSource]]:
    """Build context string from summaries and extract sources."""
    context_parts = []
    sources = []

    for i, summary in enumerate(summaries, 1):
        patient_name = "לא ידוע"
        if summary.get("patient") and isinstance(summary["patient"], dict):
            patient_name = summary["patient"].get("full_name", "לא ידוע")

        date_str = ""
        if summary.get("created_at"):
            try:
                dt = datetime.fromisoformat(summary["created_at"].replace("Z", "+00:00"))
                date_str = dt.strftime("%d/%m/%Y")
            except (ValueError, AttributeError):
                date_str = summary["created_at"][:10]

        context_parts.append(
            f"--- סיכום #{i} ---\n"
            f"מטופל: {patient_name}\n"
            f"תאריך: {date_str}\n"
            f"אבחנה: {summary.get('diagnosis', '')}\n"
            f"טיפול: {summary.get('treatment_notes', '')}\n"
            f"מרשם: {summary.get('prescription', 'אין')}\n"
            f"מעקב נדרש: {'כן' if summary.get('follow_up_required') else 'לא'}\n"
            f"תאריך מעקב: {summary.get('follow_up_date') or 'לא נקבע'}\n"
        )

        sources.append(RAGSource(patient_name=patient_name, date=date_str))

    return "\n".join(context_parts), sources


def query_ollama(query: str, context: str) -> str:
    """Send query to Ollama with medical context."""
    prompt = f"""אתה עוזר רפואי חכם. ענה על השאלה בהתבסס על סיכומי הטיפול הבאים:

{context}

שאלת הרופא: {query}

חוקים:
1. ענה רק בעברית
2. התבסס רק על המידע בסיכומים
3. אם אין מידע - אמר זאת
4. ציין שמות מטופלים ותאריכים רלוונטיים
5. תשובה קצרה ומדויקת (2-4 משפטים)

תשובה:"""

    client = ollama.Client()
    response = client.generate(
        model=OLLAMA_MODEL,
        prompt=prompt,
        options={
            "temperature": 0.2,
            "num_ctx": 8192,
        },
    )

    return response.response.strip()


# Routes
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "model": OLLAMA_MODEL}


@app.post("/rag/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest, raw_request: Request):
    """Process a RAG query against the doctor's treatment summaries."""
    verify_internal_key(raw_request)

    doctor_id = request.doctor_id
    logger.info(f"RAG query for doctor {doctor_id}: {request.query[:100]}")

    # Fetch summaries for THIS doctor only
    summaries = fetch_summaries(doctor_id, request.top_k)

    if not summaries:
        return RAGQueryResponse(
            answer="לא נמצאו סיכומי טיפולים. יש ליצור סיכומים לפני שניתן לחפש בהם.",
            sources=[],
            total_summaries_scanned=0,
            model=OLLAMA_MODEL,
        )

    # Build context from summaries
    context, sources = build_context(summaries)

    # Query Ollama
    try:
        answer = query_ollama(request.query, context)
    except Exception as e:
        logger.error(f"Ollama error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"שגיאה בשרת ה-AI. ודא ש-Ollama פעיל ושהמודל {OLLAMA_MODEL} הותקן.",
        )

    logger.info(f"RAG response for doctor {doctor_id}: {answer[:100]}...")

    return RAGQueryResponse(
        answer=answer,
        sources=sources,
        total_summaries_scanned=len(summaries),
        model=OLLAMA_MODEL,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
