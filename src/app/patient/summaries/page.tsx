'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface Summary {
  id: string
  diagnosis: string
  treatment_notes: string
  prescription: string | null
  follow_up_required: boolean
  follow_up_date: string | null
  created_at: string
  doctor: {
    specialization: string
    user: {
      full_name: string
    }
  }
}

export default function PatientSummariesPage() {
  const { user } = useAuth()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)

  useEffect(() => {
    async function fetchSummaries() {
      if (!user) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('treatment_summaries')
        .select(`
          id,
          diagnosis,
          treatment_notes,
          prescription,
          follow_up_required,
          follow_up_date,
          created_at,
          doctor:doctors!treatment_summaries_doctor_id_fkey (
            specialization,
            user:users!doctors_user_id_fkey (
              full_name
            )
          )
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching summaries:', error)
      } else {
        setSummaries((data || []) as any)
      }
      setIsLoading(false)
    }

    fetchSummaries()
  }, [user])

  // Group summaries by year
  const summariesByYear = summaries.reduce((acc, summary) => {
    const year = new Date(summary.created_at).getFullYear()
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(summary)
    return acc
  }, {} as Record<number, Summary[]>)

  const years = Object.keys(summariesByYear)
    .map(Number)
    .sort((a, b) => b - a)

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">סיכומי הטיפולים שלי</h1>
      <p className="text-muted-foreground mb-8">
        צפה בהיסטוריית הטיפולים והמרשמים שלך
      </p>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">עדיין אין לך סיכומי טיפולים</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible defaultValue={years[0]?.toString()}>
          {years.map((year) => (
            <AccordionItem key={year} value={year.toString()}>
              <AccordionTrigger className="text-lg font-semibold">
                {year} ({summariesByYear[year].length} סיכומים)
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {summariesByYear[year].map((summary) => (
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
                                ד&quot;ר {(summary.doctor as any)?.user?.full_name}
                              </h3>
                              <Badge variant="outline">
                                {(summary.doctor as any)?.specialization}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-primary">
                              {summary.diagnosis}
                            </p>
                            {summary.follow_up_required && (
                              <Badge variant="secondary" className="text-yellow-600">
                                נדרש מעקב
                                {summary.follow_up_date &&
                                  ` - ${format(new Date(summary.follow_up_date), 'd/M/yyyy')}`}
                              </Badge>
                            )}
                          </div>
                          <div className="text-left text-sm text-muted-foreground">
                            {format(new Date(summary.created_at), 'd בMMMM', { locale: he })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Summary Detail Dialog */}
      <Dialog open={!!selectedSummary} onOpenChange={() => setSelectedSummary(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>סיכום טיפול</DialogTitle>
            <DialogDescription>
              {selectedSummary && (
                <>
                  ד&quot;ר {(selectedSummary.doctor as any)?.user?.full_name} |{' '}
                  {format(new Date(selectedSummary.created_at), 'd בMMMM yyyy', { locale: he })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSummary && (
            <div className="space-y-6 pt-4">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">רופא</h4>
                <p>
                  ד&quot;ר {(selectedSummary.doctor as any)?.user?.full_name} -{' '}
                  {(selectedSummary.doctor as any)?.specialization}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">אבחנה</h4>
                <p className="font-medium text-lg">{selectedSummary.diagnosis}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">פרטי הטיפול</h4>
                <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedSummary.treatment_notes}
                </p>
              </div>

              {selectedSummary.prescription && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">מרשם</h4>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="whitespace-pre-wrap">{selectedSummary.prescription}</p>
                  </div>
                </div>
              )}

              {selectedSummary.follow_up_required && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <h4 className="font-semibold text-yellow-800 mb-1">מעקב נדרש</h4>
                  {selectedSummary.follow_up_date ? (
                    <p className="text-yellow-700">
                      תאריך מעקב מומלץ:{' '}
                      {format(new Date(selectedSummary.follow_up_date), 'd בMMMM yyyy', {
                        locale: he,
                      })}
                    </p>
                  ) : (
                    <p className="text-yellow-700">מומלץ לקבוע תור המשך</p>
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
