"""
Embedding module using Ollama's nomic-embed-text model.
Produces 768-dimensional vectors for text chunks.
"""

import os
import logging

import ollama

logger = logging.getLogger("rag_server")

EMBEDDING_MODEL = os.environ.get("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts using Ollama.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors (each 768 floats).

    Raises:
        RuntimeError: If embedding fails.
    """
    if not texts:
        return []

    try:
        client = ollama.Client()
        response = client.embed(model=EMBEDDING_MODEL, input=texts)
        return response.embeddings
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise RuntimeError(f"Failed to generate embeddings: {e}") from e


def embed_single(text: str) -> list[float]:
    """Generate embedding for a single text string.

    Args:
        text: Text to embed.

    Returns:
        Embedding vector (768 floats).
    """
    results = embed_texts([text])
    return results[0]
