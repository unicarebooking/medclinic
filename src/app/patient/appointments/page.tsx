'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { APPOINTMENT_STATUSES } from '@/lib/constants'
import { toast } from 'sonner'

interface Appointment {
  id: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  payment_status: string
  payment_amount: number
  created_at: string
  slot: {
    slot_datetime: string
    location: {
      name: string
      city: string
      address: string
    }
  }
  doctor: {
    specialization: string
    user: {
      full_name: string
    }
  }
}

function AppointmentsContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const booked = searchParams.get('booked')

  useEffect(() => {
    if (booked === 'true') {
      toast.success('התור נקבע בהצלחה!')
    }
  }, [booked])

  useEffect(() => {
    async function fetchAppointments() {
      if (!user) return

      const supabase = createClient()
      const { data, error } = await supabase
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
              city,
              address
            )
          ),
          doctor:doctors!appointments_doctor_id_fkey (
            specialization,
            user:users!doctors_user_id_fkey (
              full_name
            )
          )
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching appointments:', error)
      } else {
        setAppointments(data as any || [])
      }
      setIsLoading(false)
    }

    fetchAppointments()
  }, [user])

  const cancelAppointment = async (appointmentId: string, slotId: string) => {
    const supabase = createClient() as any

    // Update appointment status
    await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)

    // Free up the slot
    await supabase
      .from('doctor_availability_slots')
      .update({ is_booked: false })
      .eq('id', slotId)

    // Update local state
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a
      )
    )

    toast.success('התור בוטל בהצלחה')
  }

  const upcomingAppointments = appointments.filter(
    (a) => ['pending', 'confirmed'].includes(a.status) &&
      new Date((a.slot as any)?.slot_datetime) > new Date()
  )

  const pastAppointments = appointments.filter(
    (a) => a.status === 'completed' ||
      new Date((a.slot as any)?.slot_datetime) <= new Date()
  )

  const cancelledAppointments = appointments.filter(
    (a) => a.status === 'cancelled'
  )

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      confirmed: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {APPOINTMENT_STATUSES[status as keyof typeof APPOINTMENT_STATUSES] || status}
      </Badge>
    )
  }

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const slot = appointment.slot as any
    const doctor = appointment.doctor as any

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">
                  ד&quot;ר {doctor?.user?.full_name}
                </h3>
                {getStatusBadge(appointment.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {doctor?.specialization}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  📅 {format(new Date(slot?.slot_datetime), 'EEEE, d בMMMM yyyy', { locale: he })}
                </span>
                <span>
                  🕐 {format(new Date(slot?.slot_datetime), 'HH:mm')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                📍 {slot?.location?.name}, {slot?.location?.city}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <p className="font-semibold">₪{appointment.payment_amount}</p>
              {['pending', 'confirmed'].includes(appointment.status) &&
                new Date(slot?.slot_datetime) > new Date() && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelAppointment(appointment.id, slot?.id)}
                  >
                    בטל תור
                  </Button>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">התורים שלי</h1>
      <p className="text-muted-foreground mb-8">ניהול וצפייה בתורים</p>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            קרובים ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            עבר ({pastAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            מבוטלים ({cancelledAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">אין לך תורים קרובים</p>
                <Button asChild>
                  <a href="/doctors">קבע תור חדש</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין תורים קודמים</p>
              </CardContent>
            </Card>
          ) : (
            pastAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין תורים מבוטלים</p>
              </CardContent>
            </Card>
          ) : (
            cancelledAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function PatientAppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    }>
      <AppointmentsContent />
    </Suspense>
  )
}
