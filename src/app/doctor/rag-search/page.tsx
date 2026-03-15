'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { RAGSource } from '@/types/rag'

const SAMPLE_QUERIES = [
  'מה הטיפול שנתתי למטופלים עם כאבי ראש?',
  'כמה מטופלים עם חרדה טיפלתי בחודש האחרון?',
  'מצא לי סיכומים שכללו מרשם לאנטיביוטיקה',
  'אילו מטופלים צריכים מעקב?',
]

export default function RAGSearchPage() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelReady, setModelReady] = useState<boolean | null>(null)

  // Streaming state
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [streamingSources, setStreamingSources] = useState<RAGSource[] | null>(null)
  const [streamingMeta, setStreamingMeta] = useState<{ total: number; model: string } | null>(null)
  const [streamDone, setStreamDone] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkHealth = async () => {
      try {
        const res = await fetch('/api/rag/health')
        const data = await res.json()
        setModelReady(data.ready === true)
        if (data.ready === true) {
          clearInterval(interval)
        }
      } catch {
        setModelReady(false)
      }
    }

    checkHealth()
    interval = setInterval(checkHealth, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setStreamingAnswer('')
    setStreamingSources(null)
    setStreamingMeta(null)
    setStreamDone(false)

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), stream: true }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'שגיאה בביצוע החיפוש')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const event = JSON.parse(part.slice(6))
            if (event.type === 'sources') {
              setStreamingSources(event.sources)
              setStreamingMeta({ total: event.total_scanned, model: event.model })
            } else if (event.type === 'token') {
              setStreamingAnswer(prev => prev + event.text)
            } else if (event.type === 'done') {
              setStreamDone(true)
            } else if (event.type === 'error') {
              setError(event.message)
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
      setStreamDone(true)
    } catch {
      setError('שגיאה בהתחברות לשרת החיפוש. ודא שהשרת פעיל.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSampleClick = (sample: string) => {
    setQuery(sample)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const hasResult = streamingAnswer || streamingSources !== null

  return (
    <div className="p-8">

      {/* Model loading banner */}
      {modelReady === false && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3" dir="rtl">
              <svg className="animate-spin h-5 w-5 text-yellow-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">מודל ה-AI בטעינה...</p>
                <p className="text-sm text-yellow-700">הטעינה אורכת כ-3-5 דקות. ניתן להמתין - החיפוש יהיה זמין בקרוב.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <h1 className="text-3xl font-bold mb-2">חיפוש חכם בסיכומים</h1>
      <p className="text-muted-foreground mb-8">
        שאל שאלות בשפה חופשית על סיכומי הטיפולים שלך וקבל תשובות מבוססות AI
      </p>

      {/* Search Input */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Textarea
              placeholder="מה תרצה לחפש בסיכומי הטיפולים שלך?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] text-base"
              dir="rtl"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !query.trim() || modelReady !== true}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    מחפש...
                  </>
                ) : modelReady !== true ? (
                  'ממתין לטעינת המודל...'
                ) : (
                  'חפש'
                )}
              </Button>
              {isLoading && !streamingSources && (
                <p className="text-sm text-muted-foreground">מבצע חיפוש וקטורי...</p>
              )}
              {isLoading && streamingSources && !streamDone && (
                <p className="text-sm text-muted-foreground">מודל AI כותב תשובה...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Queries */}
      {!hasResult && !error && !isLoading && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">שאלות לדוגמה</CardTitle>
            <CardDescription>לחץ על שאלה כדי לנסות</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_QUERIES.map((sample, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSampleClick(sample)}
                  className="text-right"
                >
                  {sample}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 font-medium">שגיאה</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Streaming Result */}
      {hasResult && (
        <div className="space-y-6">
          {/* Sources — shown as soon as vector search completes */}
          {streamingSources !== null && streamingSources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">מקורות</CardTitle>
                <CardDescription>סיכומי הטיפולים שעליהם מבוססת התשובה</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {streamingSources.map((source, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                    >
                      <span className="text-lg">📄</span>
                      <div>
                        <p className="font-medium">{source.patient_name}</p>
                        <p className="text-sm text-muted-foreground">{source.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Answer — streams in token by token */}
          {streamingAnswer && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">תשובה</CardTitle>
                  {streamingMeta && (
                    <Badge variant="outline" className="text-xs">
                      {streamingMeta.model} | {streamingMeta.total} סיכומים נסרקו
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap leading-relaxed text-base" dir="rtl">
                  {streamingAnswer}
                  {!streamDone && (
                    <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
