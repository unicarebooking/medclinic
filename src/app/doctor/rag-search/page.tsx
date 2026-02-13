'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { RAGQueryResponse } from '@/types/rag'

const SAMPLE_QUERIES = [
  'מה הטיפול שנתתי למטופלים עם כאבי ראש?',
  'כמה מטופלים עם חרדה טיפלתי בחודש האחרון?',
  'מצא לי סיכומים שכללו מרשם לאנטיביוטיקה',
  'אילו מטופלים צריכים מעקב?',
]

export default function RAGSearchPage() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<RAGQueryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'שגיאה בביצוע החיפוש')
        return
      }

      setResult(data)
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

  return (
    <div className="p-8">
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
                disabled={isLoading || !query.trim()}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    מחפש... (זה יכול לקחת מספר שניות)
                  </>
                ) : (
                  'חפש'
                )}
              </Button>
              {isLoading && (
                <p className="text-sm text-muted-foreground">
                  מנתח את סיכומי הטיפולים שלך...
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Queries */}
      {!result && !error && !isLoading && (
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

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Answer */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">תשובה</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {result.model} | {result.total_summaries_scanned} סיכומים נסרקו
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap leading-relaxed text-base" dir="rtl">
                {result.answer}
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          {result.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">מקורות</CardTitle>
                <CardDescription>סיכומי הטיפולים שעליהם מבוססת התשובה</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.sources.map((source, i) => (
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
        </div>
      )}
    </div>
  )
}
