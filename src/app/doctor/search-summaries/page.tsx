'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Summary {
  id: string
  diagnosis: string
  treatment_notes: string
  prescription: string | null
  follow_up_required: boolean
  follow_up_date: string | null
  created_at: string
  patient: {
    full_name: string
    email: string
  }
}

export default function SearchSummariesPage() {
  const { user } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)

  // Get doctor ID
  useEffect(() => {
    async function fetchDoctorId() {
      if (!user) return

      const supabase = createClient()
      const { data } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setDoctorId((data as { id: string }).id)
      }
    }

    fetchDoctorId()
  }, [user])

  // Load recent summaries on mount
  useEffect(() => {
    async function loadRecentSummaries() {
      if (!doctorId) return

      setIsLoading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('treatment_summaries')
        .select(`
          id,
          diagnosis,
          treatment_notes,
          prescription,
          follow_up_required,
          follow_up_date,
          created_at,
          patient:users!treatment_summaries_patient_id_fkey (
            full_name,
            email
          )
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(20)

      setSummaries((data || []) as any)
      setIsLoading(false)
    }

    loadRecentSummaries()
  }, [doctorId])

  const handleSearch = async () => {
    if (!doctorId || !searchQuery.trim()) return

    setIsLoading(true)
    const supabase = createClient() as any

    // Use full-text search
    const { data, error } = await supabase.rpc('search_treatment_summaries', {
      search_query: searchQuery,
      doctor_filter: doctorId,
    })

    if (error) {
      console.error('Search error:', error)
      // Fallback to simple search
      const { data: fallbackData } = await supabase
        .from('treatment_summaries')
        .select(`
          id,
          diagnosis,
          treatment_notes,
          prescription,
          follow_up_required,
          follow_up_date,
          created_at,
          patient:users!treatment_summaries_patient_id_fkey (
            full_name,
            email
          )
        `)
        .eq('doctor_id', doctorId)
        .or(`diagnosis.ilike.%${searchQuery}%,treatment_notes.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(50)

      setSummaries((fallbackData || []) as any)
    } else {
      // Fetch full details for search results
      if (data && data.length > 0) {
        const ids = data.map((d: any) => d.id)
        const { data: fullData } = await supabase
          .from('treatment_summaries')
          .select(`
            id,
            diagnosis,
            treatment_notes,
            prescription,
            follow_up_required,
            follow_up_date,
            created_at,
            patient:users!treatment_summaries_patient_id_fkey (
              full_name,
              email
            )
          `)
          .in('id', ids)

        setSummaries((fullData || []) as any)
      } else {
        setSummaries([])
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">חיפוש סיכומי טיפולים</h1>
      <p className="text-muted-foreground mb-8">
        חפש בסיכומי הטיפולים שלך לפי אבחנה, הערות או מרשם
      </p>

      {/* Search Box */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="חפש לפי אבחנה, הערות טיפול או מרשם..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'מחפש...' : 'חפש'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? 'לא נמצאו תוצאות' : 'הזן מילות חיפוש כדי למצוא סיכומים'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            נמצאו {summaries.length} סיכומים
          </p>
          {summaries.map((summary) => (
            <Card
              key={summary.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedSummary(summary)}
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {(summary.patient as any)?.full_name}
                      </h3>
                      {summary.follow_up_required && (
                        <Badge variant="outline" className="text-yellow-600">
                          נדרש מעקב
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-primary">
                      {summary.diagnosis}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {summary.treatment_notes}
                    </p>
                  </div>
                  <div className="text-left text-sm text-muted-foreground">
                    {format(new Date(summary.created_at), 'd/M/yyyy', { locale: he })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Detail Dialog */}
      <Dialog open={!!selectedSummary} onOpenChange={() => setSelectedSummary(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>סיכום טיפול</DialogTitle>
            <DialogDescription>
              {selectedSummary && (
                <>
                  {(selectedSummary.patient as any)?.full_name} |{' '}
                  {format(new Date(selectedSummary.created_at), 'd בMMMM yyyy', { locale: he })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSummary && (
            <div className="space-y-4 pt-4">
              <div>
                <h4 className="font-semibold mb-1">אבחנה</h4>
                <p className="text-muted-foreground">{selectedSummary.diagnosis}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">הערות טיפול</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {selectedSummary.treatment_notes}
                </p>
              </div>

              {selectedSummary.prescription && (
                <div>
                  <h4 className="font-semibold mb-1">מרשם</h4>
                  <p className="text-muted-foreground">{selectedSummary.prescription}</p>
                </div>
              )}

              {selectedSummary.follow_up_required && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold mb-1 text-yellow-800">מעקב נדרש</h4>
                  {selectedSummary.follow_up_date && (
                    <p className="text-yellow-700">
                      תאריך מעקב:{' '}
                      {format(new Date(selectedSummary.follow_up_date), 'd/M/yyyy', { locale: he })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
