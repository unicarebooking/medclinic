import { NextRequest, NextResponse } from 'next/server'

const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const response = await fetch(`${TRANSCRIPTION_SERVICE_URL}/api/status/${jobId}`)

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.detail || 'Status check failed' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהתחברות לשירות התמלול' },
      { status: 503 }
    )
  }
}
