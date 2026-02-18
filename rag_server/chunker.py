"""
Text chunker for RAG pipeline.
Splits text into overlapping chunks at sentence boundaries.
"""

import re


def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap_ratio: float = 0.2,
) -> list[str]:
    """Split text into overlapping chunks at sentence boundaries.

    Args:
        text: Input text to chunk.
        chunk_size: Target chunk size in characters.
        overlap_ratio: Fraction of chunk_size to overlap (0.0-0.5).

    Returns:
        List of text chunks.
    """
    if not text or not text.strip():
        return []

    text = text.strip()

    # Short text → single chunk
    if len(text) <= chunk_size:
        return [text]

    overlap = int(chunk_size * overlap_ratio)

    # Split into sentences (Hebrew/English punctuation + newlines)
    sentences = re.split(r'(?<=[.!?\n।])\s+', text)
    # Filter empty
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return [text]

    chunks: list[str] = []
    current_chunk = ""
    sentence_idx = 0

    while sentence_idx < len(sentences):
        sentence = sentences[sentence_idx]

        # If adding this sentence stays within chunk_size, add it
        if not current_chunk:
            current_chunk = sentence
            sentence_idx += 1
        elif len(current_chunk) + len(sentence) + 1 <= chunk_size:
            current_chunk += " " + sentence
            sentence_idx += 1
        else:
            # Chunk is full - save it
            chunks.append(current_chunk)

            # Find overlap start: walk backwards from end of current chunk
            overlap_text = ""
            for prev_idx in range(sentence_idx - 1, -1, -1):
                candidate = sentences[prev_idx]
                if len(candidate) + len(overlap_text) + 1 <= overlap:
                    overlap_text = candidate + (" " + overlap_text if overlap_text else "")
                else:
                    break

            current_chunk = overlap_text + (" " + sentence if overlap_text else sentence)
            sentence_idx += 1

    # Don't forget the last chunk
    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def prepare_treatment_summary_text(summary: dict) -> str:
    """Convert a treatment summary record into indexable text."""
    parts = []

    patient_name = "לא ידוע"
    if summary.get("patient") and isinstance(summary["patient"], dict):
        patient_name = summary["patient"].get("full_name", "לא ידוע")
    parts.append(f"מטופל: {patient_name}")

    if summary.get("created_at"):
        parts.append(f"תאריך: {summary['created_at'][:10]}")

    if summary.get("diagnosis"):
        parts.append(f"אבחנה: {summary['diagnosis']}")

    if summary.get("treatment_notes"):
        parts.append(f"טיפול: {summary['treatment_notes']}")

    if summary.get("prescription"):
        parts.append(f"מרשם: {summary['prescription']}")

    if summary.get("follow_up_required"):
        parts.append("מעקב נדרש: כן")
        if summary.get("follow_up_date"):
            parts.append(f"תאריך מעקב: {summary['follow_up_date']}")

    return "\n".join(parts)


def prepare_transcription_text(transcription: dict) -> str:
    """Convert a transcription record into indexable text."""
    parts = []

    patient_name = "לא ידוע"
    if transcription.get("patient") and isinstance(transcription["patient"], dict):
        patient_name = transcription["patient"].get("full_name", "לא ידוע")
    parts.append(f"תמלול ביקור - מטופל: {patient_name}")

    if transcription.get("created_at"):
        parts.append(f"תאריך: {transcription['created_at'][:10]}")

    if transcription.get("transcription_text"):
        parts.append(transcription["transcription_text"])

    return "\n".join(parts)


def prepare_patient_text(user: dict, doctor_name: str = "") -> str:
    """Convert a patient/user record into indexable text."""
    parts = []

    if user.get("full_name"):
        parts.append(f"שם מטופל: {user['full_name']}")

    if user.get("phone"):
        parts.append(f"טלפון: {user['phone']}")

    if user.get("email"):
        parts.append(f"אימייל: {user['email']}")

    if doctor_name:
        parts.append(f"רופא מטפל: {doctor_name}")

    return "\n".join(parts)
