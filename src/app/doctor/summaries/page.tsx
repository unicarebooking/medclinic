'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Appointment {
  id: string
  status: string
  created_at: string
  slot: {
    slot_datetime: string
  }
  patient: {
    id: string
    full_name: string
  }
  has_summary?: boolean
}

const summarySchema = z.object({
  diagnosis: z.string().min(3, 'נדרשת אבחנה'),
  treatment_notes: z.string().min(10, 'נדרשות הערות טיפול'),
  prescription: z.string().optional(),
  follow_up_required: z.boolean(),
  follow_up_date: z.date().optional().nullable(),
})

type SummaryFormValues = z.infer<typeof summarySchema>

export default function DoctorSummariesPage() {
  const { user } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SummaryFormValues>({
    resolver: zodResolver(summarySchema),
    defaultValues: {
      diagnosis: '',
      treatment_notes: '',
      prescription: '',
      follow_up_required: false,
      follow_up_date: null,
    },
  })

  const followUpRequired = form.watch('follow_up_required')

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

  // Fetch completed appointments without summaries
  useEffect(() => {
    async function fetchAppointments() {
      if (!doctorId) return

      const supabase = createClient()

      // Get completed appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          created_at,
          slot:doctor_availability_slots!appointments_slot_id_fkey (
            slot_datetime
          ),
          patient:users!appointments_patient_id_fkey (
            id,
            full_name
          )
        `)
        .eq('doctor_id', doctorId)
        .in('status', ['completed', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(50)

      // Check which appointments have summaries
      const { data: summariesData } = await supabase
        .from('treatment_summaries')
        .select('appointment_id')
        .eq('doctor_id', doctorId)

      const appointmentIdsWithSummary = new Set(
        (summariesData || []).map((s: any) => s.appointment_id)
      )

      const appointmentsWithStatus = ((appointmentsData || []) as any[]).map((a) => ({
        ...a,
        has_summary: appointmentIdsWithSummary.has(a.id),
      }))

      setAppointments(appointmentsWithStatus)
      setIsLoading(false)
    }

    fetchAppointments()
  }, [doctorId])

  const onSubmit = async (values: SummaryFormValues) => {
    if (!selectedAppointment || !doctorId) return

    setIsSubmitting(true)

    const supabase = createClient() as any

    const { data: insertedSummary, error } = await supabase.from('treatment_summaries').insert({
      appointment_id: selectedAppointment.id,
      doctor_id: doctorId,
      patient_id: (selectedAppointment.patient as any).id,
      diagnosis: values.diagnosis,
      treatment_notes: values.treatment_notes,
      prescription: values.prescription || null,
      follow_up_required: values.follow_up_required,
      follow_up_date: values.follow_up_date?.toISOString().split('T')[0] || null,
    }).select('id').single()

    if (error) {
      toast.error('שגיאה בשמירת הסיכום')
      console.error(error)
    } else {
      toast.success('הסיכום נשמר בהצלחה')

      // Index in RAG vector store (fire-and-forget)
      if (insertedSummary?.id) {
        fetch('/api/rag/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_table: 'treatment_summaries',
            source_id: insertedSummary.id,
          }),
        }).catch(() => {})
      }

      // Update appointment status to completed if not already
      if (selectedAppointment.status !== 'completed') {
        await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', selectedAppointment.id)
      }

      // Update local state
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === selectedAppointment.id ? { ...a, has_summary: true } : a
        )
      )

      setSelectedAppointment(null)
      form.reset()
    }

    setIsSubmitting(false)
  }

  const pendingSummaries = appointments.filter((a) => !a.has_summary)
  const completedSummaries = appointments.filter((a) => a.has_summary)

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
      <h1 className="text-3xl font-bold mb-2">סיכומי טיפולים</h1>
      <p className="text-muted-foreground mb-8">צור סיכומי טיפול עבור התורים שהושלמו</p>

      {/* Pending Summaries */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ממתינים לסיכום
            {pendingSummaries.length > 0 && (
              <Badge variant="destructive">{pendingSummaries.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>תורים שהושלמו וממתינים לסיכום טיפול</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSummaries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              אין תורים הממתינים לסיכום
            </p>
          ) : (
            <div className="space-y-3">
              {pendingSummaries.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{(appointment.patient as any)?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date((appointment.slot as any)?.slot_datetime),
                        'EEEE, d בMMMM yyyy בשעה HH:mm',
                        { locale: he }
                      )}
                    </p>
                  </div>
                  <Button onClick={() => setSelectedAppointment(appointment)}>
                    צור סיכום
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Summaries */}
      <Card>
        <CardHeader>
          <CardTitle>סיכומים שנכתבו</CardTitle>
          <CardDescription>תורים עם סיכום טיפול</CardDescription>
        </CardHeader>
        <CardContent>
          {completedSummaries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">עדיין לא נכתבו סיכומים</p>
          ) : (
            <div className="space-y-3">
              {completedSummaries.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{(appointment.patient as any)?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date((appointment.slot as any)?.slot_datetime),
                        'd/M/yyyy',
                        { locale: he }
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">נכתב סיכום</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Summary Dialog */}
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={() => {
          setSelectedAppointment(null)
          form.reset()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>יצירת סיכום טיפול</DialogTitle>
            <DialogDescription>
              {selectedAppointment && (
                <>
                  מטופל: {(selectedAppointment.patient as any)?.full_name} |{' '}
                  {format(
                    new Date((selectedAppointment.slot as any)?.slot_datetime),
                    'd בMMMM yyyy',
                    { locale: he }
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>אבחנה *</FormLabel>
                    <FormControl>
                      <Input placeholder="הזן את האבחנה..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="treatment_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>הערות טיפול *</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[120px] p-3 border rounded-md resize-none"
                        placeholder="פרט את הטיפול שניתן, המלצות, והערות נוספות..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מרשם (אופציונלי)</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[80px] p-3 border rounded-md resize-none"
                        placeholder="פרט תרופות, מינון ותדירות..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="follow_up_required"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">נדרש מעקב</FormLabel>
                  </FormItem>
                )}
              />

              {followUpRequired && (
                <FormField
                  control={form.control}
                  name="follow_up_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>תאריך מעקב</FormLabel>
                      <FormControl>
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          locale={he}
                          className="rounded-md border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'שומר...' : 'שמור סיכום'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedAppointment(null)
                    form.reset()
                  }}
                >
                  ביטול
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
