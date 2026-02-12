'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { APPOINTMENT_STATUSES } from '@/lib/constants'

interface PatientData {
  id: string
  full_name: string
  email: string
  phone: string | null
}

interface Appointment {
  id: string
  status: string
  payment_status: string
  payment_amount: number | null
  created_at: string
  slot: {
    slot_datetime: string
    location: {
      name: string
      city: string
    }
  } | null
  summary: {
    id: string
    diagnosis: string
    treatment_notes: string
    prescription: string | null
    follow_up_required: boolean
    follow_up_date: string | null
    created_at: string
  } | null
}

interface Transcription {
  id: string
  original_filename: string
  transcription_text: string | null
  status: string
  duration_seconds: number | null
  created_at: string
}

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = params.patientId as string
  const { user, isLoading: authLoading } = useAuth()

  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [patient, setPatient] = useState<PatientData | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null)

  // Fetch doctor ID
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

  // Fetch patient data, appointments, and transcriptions
  useEffect(() => {
    async function fetchData() {
      if (!doctorId || !patientId) return
      const supabase = createClient()

      // Fetch patient info
      const { data: patientData } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .eq('id', patientId)
        .single()

      if (patientData) {
        setPatient(patientData as PatientData)
      }

      // Fetch appointments with summaries
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          payment_status,
          payment_amount,
          created_at,
          slot:doctor_availability_slots!appointments_slot_id_fkey (
            slot_datetime,
            location:locations!doctor_availability_slots_location_id_fkey (
              name,
              city
            )
          ),
          summary:treatment_summaries (
            id,
            diagnosis,
            treatment_notes,
            prescription,
            follow_up_required,
            follow_up_date,
            created_at
          )
        `)
        .eq('doctor_id', doctorId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      if (appointmentsData) {
        const processed = (appointmentsData as any[]).map((a) => ({
          ...a,
          summary: Array.isArray(a.summary) ? a.summary[0] || null : a.summary,
        }))
        setAppointments(processed)
      }

      // Fetch transcriptions
      const { data: transcriptionsData } = await supabase
        .from('transcriptions')
        .select('id, original_filename, transcription_text, status, duration_seconds, created_at')
        .eq('doctor_id', doctorId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      if (transcriptionsData) {
        setTranscriptions(transcriptionsData as Transcription[])
      }

      setIsLoading(false)
    }

    fetchData()
  }, [doctorId, patientId])

  const totalPaid = appointments.reduce((sum, a) => {
    return sum + (a.payment_status === 'paid' ? (a.payment_amount || 0) : 0)
  }, 0)

  const completedCount = appointments.filter((a) => a.status === 'completed').length
  const summariesCount = appointments.filter((a) => a.summary).length

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      confirmed: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {APPOINTMENT_STATUSES[status as keyof typeof APPOINTMENT_STATUSES] || status}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string, amount: number | null) => {
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">{amount ? `${amount}₪ שולם` : 'שולם'}</Badge>
    }
    return <Badge className="bg-yellow-100 text-yellow-800">לא שולם</Badge>
  }

  if (authLoading || isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">מטופל לא נמצא</p>
        <Link href="/doctor/patients">
          <Button variant="link" className="p-0 mt-2">חזרה לרשימת המטופלים</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Link href="/doctor/patients">
        <Button variant="ghost" className="mb-4">
          → חזרה לרשימת המטופלים
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-2">{patient.full_name}</h1>
      <div className="flex gap-4 text-muted-foreground mb-6">
        <span>{patient.email}</span>
        {patient.phone && <span>{patient.phone}</span>}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">סה"כ תורים</p>
            <p className="text-2xl font-bold">{appointments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">תורים שהושלמו</p>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">סיכומי טיפולים</p>
            <p className="text-2xl font-bold">{summariesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">סה"כ תשלומים</p>
            <p className="text-2xl font-bold">{totalPaid > 0 ? `${totalPaid.toLocaleString()}₪` : '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="appointments" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="appointments">תורים ({appointments.length})</TabsTrigger>
          <TabsTrigger value="summaries">סיכומי טיפולים ({summariesCount})</TabsTrigger>
          <TabsTrigger value="transcriptions">תמלולים ({transcriptions.length})</TabsTrigger>
        </TabsList>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                אין תורים עם מטופל זה
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <Card key={appt.id}>
                  <CardContent className="py-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedAppointment(expandedAppointment === appt.id ? null : appt.id)}
                    >
                      <div>
                        <p className="font-medium">
                          {appt.slot
                            ? format(new Date(appt.slot.slot_datetime), 'EEEE, d בMMMM yyyy בשעה HH:mm', { locale: he })
                            : 'תאריך לא זמין'}
                        </p>
                        {appt.slot?.location && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {appt.slot.location.name}, {appt.slot.location.city}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getPaymentBadge(appt.payment_status, appt.payment_amount)}
                        {getStatusBadge(appt.status)}
                        {appt.summary && (
                          <Badge className="bg-blue-100 text-blue-800">יש סיכום</Badge>
                        )}
                        <span className="text-muted-foreground text-sm">
                          {expandedAppointment === appt.id ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Summary */}
                    {expandedAppointment === appt.id && appt.summary && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">אבחנה</p>
                          <p>{appt.summary.diagnosis}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">הערות טיפול</p>
                          <p>{appt.summary.treatment_notes}</p>
                        </div>
                        {appt.summary.prescription && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">מרשם</p>
                            <p>{appt.summary.prescription}</p>
                          </div>
                        )}
                        {appt.summary.follow_up_required && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">מעקב נדרש</p>
                            <p>
                              {appt.summary.follow_up_date
                                ? format(new Date(appt.summary.follow_up_date), 'd בMMMM yyyy', { locale: he })
                                : 'כן'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {expandedAppointment === appt.id && !appt.summary && (
                      <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                        לא נכתב סיכום לתור זה
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Summaries Tab */}
        <TabsContent value="summaries">
          {summariesCount === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                אין סיכומי טיפולים עבור מטופל זה
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments
                .filter((a) => a.summary)
                .map((appt) => (
                  <Card key={appt.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{appt.summary!.diagnosis}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {appt.slot
                            ? format(new Date(appt.slot.slot_datetime), 'd בMMMM yyyy', { locale: he })
                            : format(new Date(appt.summary!.created_at), 'd בMMMM yyyy', { locale: he })}
                        </span>
                      </div>
                      {appt.slot?.location && (
                        <CardDescription>
                          {appt.slot.location.name}, {appt.slot.location.city}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">הערות טיפול</p>
                        <p>{appt.summary!.treatment_notes}</p>
                      </div>
                      {appt.summary!.prescription && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">מרשם</p>
                          <p>{appt.summary!.prescription}</p>
                        </div>
                      )}
                      {appt.summary!.follow_up_required && (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800">מעקב נדרש</Badge>
                          {appt.summary!.follow_up_date && (
                            <span className="text-sm">
                              {format(new Date(appt.summary!.follow_up_date), 'd בMMMM yyyy', { locale: he })}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Transcriptions Tab */}
        <TabsContent value="transcriptions">
          {transcriptions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                אין תמלולים עבור מטופל זה
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {transcriptions.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{t.original_filename}</CardTitle>
                        <Badge className={
                          t.status === 'completed' ? 'bg-green-100 text-green-800' :
                          t.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {t.status === 'completed' ? 'הושלם' : t.status === 'error' ? 'שגיאה' : 'בתהליך'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(t.created_at), 'd בMMMM yyyy, HH:mm', { locale: he })}
                        {t.duration_seconds && (
                          <span className="mr-2">| משך: {Math.floor(t.duration_seconds / 60)} דקות</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {t.transcription_text && (
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap line-clamp-4" dir="rtl">
                        {t.transcription_text}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
