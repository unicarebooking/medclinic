export interface RAGQueryRequest {
  query: string
  top_k?: number
}

export interface RAGSource {
  patient_name: string
  date: string
}

export interface RAGQueryResponse {
  answer: string
  sources: RAGSource[]
  total_summaries_scanned: number
  model: string
}
