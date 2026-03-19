"""
Embedding module using Ollama's qwen3-embedding:0.6b model.
Produces 1024-dimensional vectors for text chunks.
"""

import os
import logging

import ollama

logger = logging.getLogger("rag_server")

EMBEDDING_MODEL = os.environ.get("OLLAMA_EMBEDDING_MODEL", "qwen3-embedding:0.6b")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts using Ollama.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors (each 1024 floats for qwen3-embedding:0.6b).

    Raises:
        RuntimeError: If embedding fails.
    """
    if not texts:
        return []

    try:
        client = ollama.Client(host=OLLAMA_HOST)
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
        Embedding vector (1024 floats for qwen3-embedding:0.6b).
    """
    results = embed_texts([text])
    return results[0]
