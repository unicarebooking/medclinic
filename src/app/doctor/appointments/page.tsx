'use client'

import { useState, useEffect } from 'react'
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
  notes: string | null
  created_at: string
  slot: {
    id: string
    slot_datetime: string
    location: {
      name: string
      city: string
    }
  }
  patient: {
    full_name: string
    email: string
    phone: string | null
  }
}

export default function DoctorAppointmentsPage() {
  const { user } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  // Fetch appointments
  useEffect(() => {
    async function fetchAppointments() {
      if (!doctorId) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          payment_status,
          payment_amount,
          notes,
          created_at,
          slot:doctor_availability_slots!appointments_slot_id_fkey (
            id,
            slot_datetime,
            location:locations!doctor_availability_slots_location_id_fkey (
              name,
              city
            )
          ),
          patient:users!appointments_patient_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching appointments:', error)
      } else {
        setAppointments(data as any || [])
      }
      setIsLoading(false)
    }

    fetchAppointments()
  }, [doctorId])

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: 'confirmed' | 'completed' | 'cancelled',
    slotId?: string
  ) => {
    const supabase = createClient() as any

    await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)

    // If cancelled, free up the slot
    if (status === 'cancelled' && slotId) {
      await supabase
        .from('doctor_availability_slots')
        .update({ is_booked: false })
        .eq('id', slotId)
    }

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId ? { ...a, status } : a
      )
    )

    toast.success(`הסטטוס עודכן ל${APPOINTMENT_STATUSES[status]}`)
  }

  const todayAppointments = appointments.filter((a) => {
    const appointmentDate = new Date((a.slot as any)?.slot_datetime)
    const today = new Date()
    return (
      appointmentDate.toDateString() === today.toDateString() &&
      ['pending', 'confirmed'].includes(a.status)
    )
  })

  const upcomingAppointments = appointments.filter((a) => {
    const appointmentDate = new Date((a.slot as any)?.slot_datetime)
    const today = new Date()
    return (
      appointmentDate > today &&
      appointmentDate.toDateString() !== today.toDateString() &&
      ['pending', 'confirmed'].includes(a.status)
    )
  })

  const pendingAppointments = appointments.filter((a) => a.status === 'pending')

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
    const patient = appointment.patient as any

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{patient?.full_name}</h3>
                {getStatusBadge(appointment.status)}
              </div>
              <p className="text-sm text-muted-foreground">{patient?.email}</p>
              {patient?.phone && (
                <p className="text-sm text-muted-foreground">📞 {patient?.phone}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span>
                  📅 {format(new Date(slot?.slot_datetime), 'EEEE, d בMMMM yyyy', { locale: he })}
                </span>
                <span>🕐 {format(new Date(slot?.slot_datetime), 'HH:mm')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                📍 {slot?.location?.name}, {slot?.location?.city}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {appointment.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                  >
                    אשר תור
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => updateAppointmentStatus(appointment.id, 'cancelled', slot?.id)}
                  >
                    בטל
                  </Button>
                </>
              )}
              {appointment.status === 'confirmed' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                  >
                    סמן כהושלם
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => updateAppointmentStatus(appointment.id, 'cancelled', slot?.id)}
                  >
                    בטל
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">ניהול תורים</h1>
      <p className="text-muted-foreground mb-8">צפה ונהל את התורים שלך</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">להיום</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayAppointments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-yellow-600">ממתינים לאישור</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingAppointments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">קרובים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{upcomingAppointments.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList>
          <TabsTrigger value="today">היום ({todayAppointments.length})</TabsTrigger>
          <TabsTrigger value="pending">ממתינים ({pendingAppointments.length})</TabsTrigger>
          <TabsTrigger value="upcoming">קרובים ({upcomingAppointments.length})</TabsTrigger>
          <TabsTrigger value="all">כל התורים</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {todayAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין תורים להיום</p>
              </CardContent>
            </Card>
          ) : (
            todayAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין תורים ממתינים לאישור</p>
              </CardContent>
            </Card>
          ) : (
            pendingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין תורים קרובים</p>
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין תורים</p>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
