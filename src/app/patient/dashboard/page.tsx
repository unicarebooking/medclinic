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
import Link from 'next/link'
import { APPOINTMENT_STATUSES } from '@/lib/constants'

interface Appointment {
  id: string
  status: string
  slot: {
    slot_datetime: string
    location: {
      name: string
      city: string
    }
  }
  doctor: {
    specialization: string
    user: {
      full_name: string
    }
  }
}

export default function PatientDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [summariesCount, setSummariesCount] = useState(0)
  const [totalAppointments, setTotalAppointments] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      const supabase = createClient()

      // Fetch upcoming appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          slot:doctor_availability_slots!appointments_slot_id_fkey (
            slot_datetime,
            location:locations!doctor_availability_slots_location_id_fkey (
              name,
              city
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
        .in('status', ['pending', 'confirmed'])
        .gte('slot.slot_datetime', new Date().toISOString())
        .order('slot(slot_datetime)', { ascending: true })
        .limit(5)

      setUpcomingAppointments((appointments || []) as any)

      // Count summaries
      const { count: summaries } = await supabase
        .from('treatment_summaries')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)

      setSummariesCount(summaries || 0)

      // Count total appointments
      const { count: total } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)

      setTotalAppointments(total || 0)

      setIsLoading(false)
    }

    fetchData()
  }, [user])

  if (authLoading || isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">שלום, {user?.full_name}</h1>
      <p className="text-muted-foreground mb-8">ברוך הבא ללוח הבקרה שלך</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">תורים קרובים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{upcomingAppointments.length}</p>
            <Link href="/patient/appointments">
              <Button variant="link" className="p-0 mt-2">
                צפה בכל התורים
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">סה&quot;כ תורים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAppointments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">סיכומי טיפולים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summariesCount}</p>
            <Link href="/patient/summaries">
              <Button variant="link" className="p-0 mt-2">
                צפה בסיכומים
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">פעולה מהירה</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/doctors">
              <Button className="w-full">קבע תור חדש</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>תורים קרובים</CardTitle>
          <CardDescription>התורים הבאים שלך</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>אין לך תורים קרובים</p>
              <Link href="/doctors">
                <Button className="mt-4">קבע תור חדש</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        ד&quot;ר {(appointment.doctor as any)?.user?.full_name}
                      </p>
                      <Badge variant="outline">
                        {(appointment.doctor as any)?.specialization}
                      </Badge>
                      <Badge
                        variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                      >
                        {APPOINTMENT_STATUSES[appointment.status as keyof typeof APPOINTMENT_STATUSES]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date((appointment.slot as any)?.slot_datetime),
                        'EEEE, d בMMMM בשעה HH:mm',
                        { locale: he }
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      📍 {(appointment.slot as any)?.location?.name},{' '}
                      {(appointment.slot as any)?.location?.city}
                    </p>
                  </div>
                  <Link href="/patient/appointments">
                    <Button variant="outline" size="sm">
                      פרטים
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
