import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://localhost:8001'
const RAG_INTERNAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'לא מאומת.' },
        { status: 401 }
      )
    }

    const { source_table, source_id, doctor_id, patient_id } = await request.json()

    if (!source_table || !source_id) {
      return NextResponse.json(
        { error: 'Missing source_table or source_id.' },
        { status: 400 }
      )
    }

    // Fire-and-forget: call RAG server to index the document
    // Don't await - let it run in the background
    fetch(`${RAG_SERVER_URL}/rag/index`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': RAG_INTERNAL_KEY,
      },
      body: JSON.stringify({
        source_table,
        source_id,
        doctor_id,
        patient_id,
      }),
      signal: AbortSignal.timeout(300000),
    }).catch((err) => {
      console.error('RAG index fire-and-forget error:', err)
    })

    return NextResponse.json({ status: 'indexing' })
  } catch (error) {
    console.error('RAG index error:', error)
    return NextResponse.json(
      { error: 'שגיאה באינדוקס.' },
      { status: 500 }
    )
  }
}
