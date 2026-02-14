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
        { error: 'לא מאומת. יש להתחבר מחדש.' },
        { status: 401 }
      )
    }

    // Get doctor_id
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single() as { data: { id: string } | null }

    if (!doctor) {
      return NextResponse.json(
        { error: 'משתמש זה אינו רופא.' },
        { status: 403 }
      )
    }

    const { query, top_k } = await request.json()

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'יש להזין שאלה.' },
        { status: 400 }
      )
    }

    // Call RAG server - pass doctor_id directly (auth already verified above)
    const ragResponse = await fetch(`${RAG_SERVER_URL}/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': RAG_INTERNAL_KEY,
      },
      body: JSON.stringify({
        query: query.trim(),
        top_k: top_k || 10,
        doctor_id: doctor.id,
      }),
    })

    if (!ragResponse.ok) {
      const errorData = await ragResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'שגיאה בשרת החיפוש החכם.' },
        { status: ragResponse.status }
      )
    }

    const data = await ragResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('RAG query error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהתחברות לשרת החיפוש החכם. ודא שהשרת פעיל.' },
      { status: 503 }
    )
  }
}
