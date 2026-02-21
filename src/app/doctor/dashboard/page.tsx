'use client'

import { useState, useEffect } from 'react'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns'
import { he } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { APPOINTMENT_STATUSES } from '@/lib/constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface TodayAppointment {
  id: string
  status: string
  slot: {
    slot_datetime: string
    location: {
      name: string
    }
  }
  patient: {
    full_name: string
    phone: string
  }
}

interface WeeklyData {
  day: string
  count: number
}

interface StatusData {
  name: string
  value: number
  color: string
}

export default function DoctorDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [totalPatients, setTotalPatients] = useState(0)
  const [monthlySummaries, setMonthlySummaries] = useState(0)
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [statusData, setStatusData] = useState<StatusData[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  // Fetch dashboard data
  useEffect(() => {
    async function fetchData() {
      if (!doctorId) return

      const supabase = createClient()
      const today = new Date()
      const todayStart = startOfDay(today)
      const todayEnd = endOfDay(today)
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)

      // Fetch today's appointments
      const { data: todayAppts } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          slot:doctor_availability_slots!appointments_slot_id_fkey (
            slot_datetime,
            location:locations!doctor_availability_slots_location_id_fkey (
              name
            )
          ),
          patient:users!appointments_patient_id_fkey (
            full_name,
            phone
          )
        `)
        .eq('doctor_id', doctorId)
        .gte('slot.slot_datetime', todayStart.toISOString())
        .lte('slot.slot_datetime', todayEnd.toISOString())
        .in('status', ['pending', 'confirmed'])
        .order('slot(slot_datetime)', { ascending: true })

      setTodayAppointments((todayAppts || []) as any)

      // Count pending appointments
      const { count: pending } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .eq('status', 'pending')

      setPendingCount(pending || 0)

      // Count unique patients
      const { data: patientData } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorId)

      if (patientData) {
        const uniquePatients = new Set((patientData as any[]).map((p) => p.patient_id))
        setTotalPatients(uniquePatients.size)
      }

      // Count monthly summaries
      const { count: summaries } = await supabase
        .from('treatment_summaries')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      setMonthlySummaries(summaries || 0)

      // Get weekly appointment data for chart
      const lastWeekStart = subMonths(today, 1)
      const { data: weeklyAppts } = await supabase
        .from('appointments')
        .select(`
          id,
          created_at,
          slot:doctor_availability_slots!appointments_slot_id_fkey (
            slot_datetime
          )
        `)
        .eq('doctor_id', doctorId)
        .gte('created_at', lastWeekStart.toISOString())

      // Process weekly data
      const days = eachDayOfInterval({ start: subMonths(today, 1), end: today })
      const dailyCounts: Record<string, number> = {}

      days.forEach((day) => {
        dailyCounts[format(day, 'yyyy-MM-dd')] = 0
      })

      if (weeklyAppts) {
        (weeklyAppts as any[]).forEach((appt) => {
          const dayKey = format(new Date(appt.created_at), 'yyyy-MM-dd')
          if (dailyCounts[dayKey] !== undefined) {
            dailyCounts[dayKey]++
          }
        })
      }

      // Take last 7 days for chart
      const last7Days = days.slice(-7)
      const chartData = last7Days.map((day) => ({
        day: format(day, 'EEEEEE', { locale: he }),
        count: dailyCounts[format(day, 'yyyy-MM-dd')] || 0,
      }))

      setWeeklyData(chartData)

      // Get status distribution for pie chart
      const { data: statusAppts } = await supabase
        .from('appointments')
        .select('status')
        .eq('doctor_id', doctorId)
        .gte('created_at', monthStart.toISOString())

      const statusCounts: Record<string, number> = {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
      }

      if (statusAppts) {
        (statusAppts as any[]).forEach((appt) => {
          if (statusCounts[appt.status] !== undefined) {
            statusCounts[appt.status]++
          }
        })
      }

      const pieData: StatusData[] = [
        { name: 'ממתין', value: statusCounts.pending, color: '#FCD34D' },
        { name: 'מאושר', value: statusCounts.confirmed, color: '#34D399' },
        { name: 'הושלם', value: statusCounts.completed, color: '#60A5FA' },
        { name: 'בוטל', value: statusCounts.cancelled, color: '#F87171' },
      ].filter((item) => item.value > 0)

      setStatusData(pieData)

      setIsLoading(false)
    }

    fetchData()
  }, [doctorId])

  if (authLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">לא ניתן לטעון את פרטי המשתמש</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="ml-2">
          רענן דף
        </Button>
        <Link href="/login">
          <Button>התחבר מחדש</Button>
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">שלום, ד&quot;ר {user?.full_name}</h1>
      <p className="text-muted-foreground mb-8">ברוך הבא ללוח הבקרה</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">תורים להיום</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{todayAppointments.length}</p>
            <Link href="/doctor/appointments">
              <Button variant="link" className="p-0 mt-2">
                צפה בכל התורים
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">ממתינים לאישור</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            {pendingCount > 0 && (
              <Link href="/doctor/appointments">
                <Button variant="link" className="p-0 mt-2 text-yellow-600">
                  אשר תורים
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">מטופלים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPatients}</p>
            <p className="text-sm text-muted-foreground mt-1">סה&quot;כ מטופלים</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">סיכומים החודש</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{monthlySummaries}</p>
            <Link href="/doctor/summaries">
              <Button variant="link" className="p-0 mt-2">
                כתוב סיכום חדש
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Appointments Chart */}
        <Card>
          <CardHeader>
            <CardTitle>תורים השבוע</CardTitle>
            <CardDescription>מספר תורים חדשים ליום</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [value ?? 0, 'תורים']}
                    labelFormatter={(label) => `יום ${label}`}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                אין נתונים להצגה
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>התפלגות סטטוסים</CardTitle>
            <CardDescription>תורים לפי סטטוס החודש</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                אין נתונים להצגה
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>תורים להיום</CardTitle>
            <CardDescription>
              {format(new Date(), 'EEEE, d בMMMM yyyy', { locale: he })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>אין תורים מתוכננים להיום</p>
                <Link href="/doctor/availability">
                  <Button className="mt-4" variant="outline">
                    נהל זמינות
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">
                        {(appointment.patient as any)?.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date((appointment.slot as any)?.slot_datetime), 'HH:mm')} - {(appointment.slot as any)?.location?.name}
                      </p>
                    </div>
                    <Badge
                      variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                    >
                      {APPOINTMENT_STATUSES[appointment.status as keyof typeof APPOINTMENT_STATUSES]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>פעולות מהירות</CardTitle>
            <CardDescription>גישה מהירה לפעולות נפוצות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/doctor/appointments" className="block">
              <Button className="w-full" variant="outline">
                צפה בכל התורים
              </Button>
            </Link>
            <Link href="/doctor/availability" className="block">
              <Button className="w-full" variant="outline">
                נהל זמינות
              </Button>
            </Link>
            <Link href="/doctor/summaries" className="block">
              <Button className="w-full" variant="outline">
                כתוב סיכום טיפול
              </Button>
            </Link>
            <Link href="/doctor/search-summaries" className="block">
              <Button className="w-full" variant="outline">
                חפש בסיכומים
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
