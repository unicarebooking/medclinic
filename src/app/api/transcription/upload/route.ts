import { NextRequest, NextResponse } from 'next/server'

const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Forward the request to Python transcription service
    const response = await fetch(`${TRANSCRIPTION_SERVICE_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.detail || 'Transcription service error' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Transcription upload error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהתחברות לשירות התמלול. ודא ששרת התמלול פעיל על פורט 8000' },
      { status: 503 }
    )
  }
}
