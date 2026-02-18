-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Document chunks table for vector RAG
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking
  source_table TEXT NOT NULL CHECK (source_table IN ('treatment_summaries', 'transcriptions', 'users')),
  source_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,

  -- Doctor isolation (denormalized for fast filtered vector search)
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,

  -- Optional patient reference
  patient_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Chunk content and embedding
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,

  -- Metadata for context reconstruction
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate chunks for same source
  UNIQUE(source_table, source_id, chunk_index)
);

-- HNSW index for fast approximate nearest neighbor search (cosine distance)
CREATE INDEX document_chunks_embedding_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- B-tree index on doctor_id for WHERE clause filtering
CREATE INDEX idx_document_chunks_doctor_id ON document_chunks(doctor_id);

-- Composite index for source lookups (re-indexing / deletion)
CREATE INDEX idx_document_chunks_source ON document_chunks(source_table, source_id);

-- RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Doctors can view their own chunks
CREATE POLICY "Doctors can view their own chunks"
  ON document_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors WHERE doctors.id = document_chunks.doctor_id AND doctors.user_id = auth.uid()
    )
  );

-- Vector similarity search function with doctor_id filtering
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  match_count INTEGER DEFAULT 5,
  filter_doctor_id UUID DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  source_table TEXT,
  source_id UUID,
  chunk_index INTEGER,
  doctor_id UUID,
  patient_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.source_table,
    dc.source_id,
    dc.chunk_index,
    dc.doctor_id,
    dc.patient_id,
    dc.content,
    dc.metadata,
    (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM document_chunks dc
  WHERE
    (filter_doctor_id IS NULL OR dc.doctor_id = filter_doctor_id)
    AND (1 - (dc.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
