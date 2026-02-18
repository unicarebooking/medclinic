"""
RAG Server - Medical Document Search with Ollama + pgvector

Uses vector embeddings (nomic-embed-text) for semantic search
and Ollama LLM (llama3.2:3b) for answer generation.

Environment Variables:
  SUPABASE_URL              - Supabase project URL
  SUPABASE_SERVICE_KEY      - Supabase service role key (also used as internal API key)
  OLLAMA_MODEL              - Ollama LLM model (default: llama3.2:3b)
  OLLAMA_EMBEDDING_MODEL    - Ollama embedding model (default: nomic-embed-text)
"""

import os
import logging
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import ollama

from embedder import embed_single
from indexer import (
    index_treatment_summary,
    index_transcription,
    index_patient_for_doctor,
    reindex_all,
)

# Load .env file
load_dotenv(Path(__file__).parent / ".env")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag_server")

# Environment
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    logger.warning(
        "Missing environment variables! Set SUPABASE_URL, SUPABASE_SERVICE_KEY"
    )

# Supabase client (service role - bypasses RLS for fetching data)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# FastAPI app
app = FastAPI(title="MedClinic RAG Server", version="2.0.0")

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


class IndexRequest(BaseModel):
    source_table: str
    source_id: str
    doctor_id: str | None = None
    patient_id: str | None = None


class IndexResponse(BaseModel):
    status: str
    chunks_created: int


class ReindexResponse(BaseModel):
    status: str
    stats: dict


def verify_internal_key(request: Request) -> None:
    """Verify the internal API key from the Next.js server."""
    key = request.headers.get("X-Internal-Key", "")
    if not key or key != SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def vector_search(query: str, doctor_id: str, top_k: int = 10) -> list[dict]:
    """Embed the query and search document_chunks via pgvector."""
    query_embedding = embed_single(query)

    result = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": top_k,
            "filter_doctor_id": doctor_id,
            "similarity_threshold": 0.3,
        },
    ).execute()

    return result.data or []


def build_context_from_chunks(chunks: list[dict]) -> tuple[str, list[RAGSource]]:
    """Build context string and source list from vector search results."""
    context_parts = []
    sources: list[RAGSource] = []
    seen_sources: set[str] = set()

    for i, chunk in enumerate(chunks, 1):
        meta = chunk.get("metadata") or {}
        patient_name = meta.get("patient_name", "לא ידוע")
        date_str = meta.get("date", "")
        chunk_type = meta.get("type", "")

        type_label = {
            "treatment_summary": "סיכום טיפול",
            "transcription": "תמלול",
            "patient_info": "פרטי מטופל",
        }.get(chunk_type, "מסמך")

        context_parts.append(
            f"--- {type_label} #{i} (רלוונטיות: {chunk.get('similarity', 0):.2f}) ---\n"
            f"מטופל: {patient_name}\n"
            f"תאריך: {date_str}\n"
            f"{chunk['content']}\n"
        )

        # Deduplicate sources by source_id
        source_key = chunk.get("source_id", str(i))
        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources.append(RAGSource(patient_name=patient_name, date=date_str))

    return "\n".join(context_parts), sources


def query_ollama(query: str, context: str) -> str:
    """Send query to Ollama with medical context."""
    prompt = f"""אתה עוזר רפואי חכם. ענה על השאלה בהתבסס על המידע הרפואי הבא:

{context}

שאלת הרופא: {query}

חוקים:
1. ענה רק בעברית
2. התבסס רק על המידע שסופק
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
    return {"status": "ok", "model": OLLAMA_MODEL, "version": "2.0.0-vector"}


@app.post("/rag/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest, raw_request: Request):
    """Process a RAG query using vector similarity search."""
    verify_internal_key(raw_request)

    doctor_id = request.doctor_id
    logger.info(f"RAG query for doctor {doctor_id}: {request.query[:100]}")

    # Vector search for relevant chunks
    try:
        chunks = vector_search(request.query, doctor_id, request.top_k)
    except Exception as e:
        logger.error(f"Vector search error: {e}")
        raise HTTPException(
            status_code=503,
            detail="שגיאה בחיפוש וקטורי. ודא ש-Ollama פעיל ושמודל nomic-embed-text הותקן.",
        )

    if not chunks:
        return RAGQueryResponse(
            answer="לא נמצא מידע רלוונטי. יש ליצור סיכומי טיפול או תמלולים לפני שניתן לחפש בהם.",
            sources=[],
            total_summaries_scanned=0,
            model=OLLAMA_MODEL,
        )

    # Build context from chunks
    context, sources = build_context_from_chunks(chunks)

    # Query Ollama LLM
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
        total_summaries_scanned=len(chunks),
        model=OLLAMA_MODEL,
    )


@app.post("/rag/index", response_model=IndexResponse)
async def index_document(request: IndexRequest, raw_request: Request):
    """Index a single document into the vector store."""
    verify_internal_key(raw_request)

    source_table = request.source_table
    source_id = request.source_id

    logger.info(f"Indexing {source_table}/{source_id}")

    try:
        if source_table == "treatment_summaries":
            count = index_treatment_summary(supabase, source_id)
        elif source_table == "transcriptions":
            count = index_transcription(supabase, source_id)
        elif source_table == "users":
            if not request.doctor_id:
                raise HTTPException(
                    status_code=400,
                    detail="doctor_id is required for patient indexing",
                )
            count = index_patient_for_doctor(supabase, source_id, request.doctor_id)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown source_table: {source_table}",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Indexing error for {source_table}/{source_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return IndexResponse(status="ok", chunks_created=count)


@app.post("/rag/reindex-all", response_model=ReindexResponse)
async def reindex_all_endpoint(raw_request: Request, background_tasks: BackgroundTasks):
    """Reindex all existing data. Runs in background for large datasets."""
    verify_internal_key(raw_request)

    logger.info("Starting full reindex...")
    stats = reindex_all(supabase)

    return ReindexResponse(status="ok", stats=stats)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
