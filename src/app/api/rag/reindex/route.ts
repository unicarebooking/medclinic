import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 600

const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://localhost:8001'
const RAG_INTERNAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    // Verify service role key (admin-only endpoint)
    const apiKey = request.headers.get('x-api-key') || ''
    if (!apiKey || apiKey !== RAG_INTERNAL_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ragResponse = await fetch(`${RAG_SERVER_URL}/rag/reindex-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': RAG_INTERNAL_KEY,
      },
      signal: AbortSignal.timeout(600000),
    })

    if (!ragResponse.ok) {
      const errorData = await ragResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Reindex failed' },
        { status: ragResponse.status }
      )
    }

    const data = await ragResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Reindex error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to RAG server' },
      { status: 503 }
    )
  }
}
