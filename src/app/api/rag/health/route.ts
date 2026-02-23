import { NextResponse } from 'next/server'

const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://localhost:8001'

export async function GET() {
  try {
    const res = await fetch(`${RAG_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ status: 'unavailable', ready: false }, { status: 503 })
  }
}
