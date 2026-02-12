'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Stats {
  totalUsers: number
  totalDoctors: number
  totalPatients: number
  totalAppointments: number
  openTickets: number
  monthlyAppointments: { month: string; count: number }[]
}

export default function AdminDashboard() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    openTickets: 0,
    monthlyAppointments: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!user) return

      const supabase = createClient()

      // Total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Total doctors
      const { count: totalDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })

      // Total patients (users with role patient)
      const { count: totalPatients } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient')

      // Total appointments
      const { count: totalAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })

      // Open tickets
      const { count: openTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      setStats({
        totalUsers: totalUsers || 0,
        totalDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0,
        openTickets: openTickets || 0,
        monthlyAppointments: [],
      })

      setIsLoading(false)
    }

    fetchStats()
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

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">אין לך הרשאה לצפות בעמוד זה</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">לוח בקרה למנהל</h1>
      <p className="text-muted-foreground mb-8">סקירה כללית של המערכת</p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">משתמשים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">רופאים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.totalDoctors}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">מטופלים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.totalPatients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">תורים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalAppointments}</p>
          </CardContent>
        </Card>

        <Card className={stats.openTickets > 0 ? 'border-yellow-500' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">פניות פתוחות</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{stats.openTickets}</p>
            {stats.openTickets > 0 && (
              <Link href="/admin/tickets">
                <Button variant="link" className="p-0 mt-2">
                  טפל בפניות
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>פעולות מהירות</CardTitle>
            <CardDescription>גישה מהירה לפעולות נפוצות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/tickets" className="block">
              <Button className="w-full" variant="outline">
                ניהול פניות
              </Button>
            </Link>
            <Link href="/doctors" className="block">
              <Button className="w-full" variant="outline">
                צפה ברופאים
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>סיכום המערכת</CardTitle>
            <CardDescription>מידע כללי על המערכת</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">סה&quot;כ משתמשים</span>
                <span className="font-medium">{stats.totalUsers}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">רופאים פעילים</span>
                <span className="font-medium">{stats.totalDoctors}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">מטופלים רשומים</span>
                <span className="font-medium">{stats.totalPatients}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">תורים שנקבעו</span>
                <span className="font-medium">{stats.totalAppointments}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
