"""
Document indexing pipeline for RAG.
Chunks documents, generates embeddings, and stores in Supabase pgvector.
"""

import logging

from supabase import Client

from chunker import (
    chunk_text,
    prepare_treatment_summary_text,
    prepare_transcription_text,
    prepare_patient_text,
)
from embedder import embed_texts

logger = logging.getLogger("rag_server")


def _delete_existing_chunks(supabase: Client, source_table: str, source_id: str) -> None:
    """Delete existing chunks for a source (idempotent re-index)."""
    supabase.table("document_chunks").delete().eq(
        "source_table", source_table
    ).eq("source_id", source_id).execute()


def _insert_chunks(
    supabase: Client,
    source_table: str,
    source_id: str,
    doctor_id: str,
    patient_id: str | None,
    chunks: list[str],
    embeddings: list[list[float]],
    metadata: dict,
) -> int:
    """Insert chunk rows into document_chunks table. Returns count inserted."""
    rows = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        row = {
            "source_table": source_table,
            "source_id": source_id,
            "chunk_index": i,
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "content": chunk,
            "embedding": embedding,
            "metadata": metadata,
        }
        rows.append(row)

    if rows:
        supabase.table("document_chunks").insert(rows).execute()

    return len(rows)


def index_treatment_summary(supabase: Client, summary_id: str) -> int:
    """Index a single treatment summary into document_chunks.

    Fetches the summary, chunks it, embeds, and stores.
    Returns number of chunks created.
    """
    result = (
        supabase.table("treatment_summaries")
        .select(
            "id, doctor_id, patient_id, diagnosis, treatment_notes, prescription, "
            "follow_up_required, follow_up_date, created_at, "
            "patient:users!treatment_summaries_patient_id_fkey(full_name)"
        )
        .eq("id", summary_id)
        .single()
        .execute()
    )

    summary = result.data
    if not summary:
        logger.warning(f"Treatment summary {summary_id} not found")
        return 0

    text = prepare_treatment_summary_text(summary)
    chunks = chunk_text(text, chunk_size=500, overlap_ratio=0.2)

    if not chunks:
        return 0

    embeddings = embed_texts(chunks)

    patient_name = "לא ידוע"
    if summary.get("patient") and isinstance(summary["patient"], dict):
        patient_name = summary["patient"].get("full_name", "לא ידוע")

    metadata = {
        "type": "treatment_summary",
        "patient_name": patient_name,
        "date": summary.get("created_at", "")[:10],
    }

    # Delete old chunks then insert new
    _delete_existing_chunks(supabase, "treatment_summaries", summary_id)
    count = _insert_chunks(
        supabase,
        source_table="treatment_summaries",
        source_id=summary_id,
        doctor_id=summary["doctor_id"],
        patient_id=summary.get("patient_id"),
        chunks=chunks,
        embeddings=embeddings,
        metadata=metadata,
    )

    logger.info(f"Indexed treatment summary {summary_id}: {count} chunks")
    return count


def index_transcription(supabase: Client, transcription_id: str) -> int:
    """Index a single transcription into document_chunks."""
    result = (
        supabase.table("transcriptions")
        .select(
            "id, doctor_id, patient_id, transcription_text, created_at, "
            "patient:users!transcriptions_patient_id_fkey(full_name)"
        )
        .eq("id", transcription_id)
        .single()
        .execute()
    )

    transcription = result.data
    if not transcription:
        logger.warning(f"Transcription {transcription_id} not found")
        return 0

    text = prepare_transcription_text(transcription)
    # Larger chunks for transcriptions since they tend to be longer
    chunks = chunk_text(text, chunk_size=800, overlap_ratio=0.2)

    if not chunks:
        return 0

    embeddings = embed_texts(chunks)

    patient_name = "לא ידוע"
    if transcription.get("patient") and isinstance(transcription["patient"], dict):
        patient_name = transcription["patient"].get("full_name", "לא ידוע")

    metadata = {
        "type": "transcription",
        "patient_name": patient_name,
        "date": transcription.get("created_at", "")[:10],
    }

    _delete_existing_chunks(supabase, "transcriptions", transcription_id)
    count = _insert_chunks(
        supabase,
        source_table="transcriptions",
        source_id=transcription_id,
        doctor_id=transcription["doctor_id"],
        patient_id=transcription.get("patient_id"),
        chunks=chunks,
        embeddings=embeddings,
        metadata=metadata,
    )

    logger.info(f"Indexed transcription {transcription_id}: {count} chunks")
    return count


def index_patient_for_doctor(
    supabase: Client, patient_id: str, doctor_id: str
) -> int:
    """Index patient info as a single chunk for a specific doctor."""
    result = (
        supabase.table("users")
        .select("id, full_name, phone, email")
        .eq("id", patient_id)
        .single()
        .execute()
    )

    user = result.data
    if not user:
        logger.warning(f"User {patient_id} not found")
        return 0

    text = prepare_patient_text(user)
    if not text:
        return 0

    embeddings = embed_texts([text])

    metadata = {
        "type": "patient_info",
        "patient_name": user.get("full_name", ""),
    }

    # For patient info, source_id = patient_id, but we need to scope by doctor
    # Use composite key: delete only chunks for this doctor+patient combo
    supabase.table("document_chunks").delete().eq(
        "source_table", "users"
    ).eq("source_id", patient_id).eq("doctor_id", doctor_id).execute()

    count = _insert_chunks(
        supabase,
        source_table="users",
        source_id=patient_id,
        doctor_id=doctor_id,
        patient_id=patient_id,
        chunks=[text],
        embeddings=embeddings,
        metadata=metadata,
    )

    logger.info(f"Indexed patient {patient_id} for doctor {doctor_id}")
    return count


def _fetch_all_rows(supabase: Client, table: str, select: str = "id") -> list[dict]:
    """Fetch all rows from a table with pagination (Supabase returns max 1000)."""
    all_rows: list[dict] = []
    page = 0
    page_size = 1000
    while True:
        result = (
            supabase.table(table)
            .select(select)
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        rows = result.data or []
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        page += 1
    return all_rows


def reindex_all(supabase: Client) -> dict:
    """Reindex all existing data. Used for initial migration.

    Paginates through all records and skips already-indexed ones.
    Returns summary dict with counts.
    """
    stats = {"treatment_summaries": 0, "transcriptions": 0, "patients": 0, "errors": 0, "skipped": 0}

    # Get already-indexed source IDs to skip them
    indexed_ids: set[str] = set()
    for row in _fetch_all_rows(supabase, "document_chunks", "source_id"):
        indexed_ids.add(row["source_id"])
    logger.info(f"Found {len(indexed_ids)} already-indexed sources, will skip them")

    # Index all treatment summaries (paginated)
    summaries = _fetch_all_rows(supabase, "treatment_summaries")
    logger.info(f"Found {len(summaries)} treatment summaries to process")
    for i, row in enumerate(summaries):
        if row["id"] in indexed_ids:
            stats["skipped"] += 1
            continue
        try:
            stats["treatment_summaries"] += index_treatment_summary(supabase, row["id"])
            if (i + 1) % 100 == 0:
                logger.info(f"Progress: {i + 1}/{len(summaries)} summaries processed")
        except Exception as e:
            logger.error(f"Error indexing summary {row['id']}: {e}")
            stats["errors"] += 1

    # Index all transcriptions (paginated)
    transcriptions = _fetch_all_rows(supabase, "transcriptions")
    logger.info(f"Found {len(transcriptions)} transcriptions to process")
    for row in transcriptions:
        if row["id"] in indexed_ids:
            stats["skipped"] += 1
            continue
        try:
            stats["transcriptions"] += index_transcription(supabase, row["id"])
        except Exception as e:
            logger.error(f"Error indexing transcription {row['id']}: {e}")
            stats["errors"] += 1

    # Index patients: find all patients who have appointments with doctors (paginated)
    appointments = _fetch_all_rows(supabase, "appointments", "patient_id, doctor_id")
    logger.info(f"Found {len(appointments)} appointments for patient indexing")
    seen: set[tuple[str, str]] = set()
    for row in appointments:
        key = (row["patient_id"], row["doctor_id"])
        if key in seen:
            continue
        seen.add(key)
        try:
            stats["patients"] += index_patient_for_doctor(
                supabase, row["patient_id"], row["doctor_id"]
            )
        except Exception as e:
            logger.error(f"Error indexing patient {row['patient_id']}: {e}")
            stats["errors"] += 1

    logger.info(f"Reindex complete: {stats}")
    return stats
