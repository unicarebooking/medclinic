import { NextRequest, NextResponse } from 'next/server'

const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const response = await fetch(`${TRANSCRIPTION_SERVICE_URL}/api/download/${jobId}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Download failed' }))
      return NextResponse.json(
        { error: error.detail || 'Download failed' },
        { status: response.status }
      )
    }

    const contentDisposition = response.headers.get('content-disposition')
    const blob = await response.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': contentDisposition || `attachment; filename="transcription.docx"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהורדת המסמך' },
      { status: 503 }
    )
  }
}
