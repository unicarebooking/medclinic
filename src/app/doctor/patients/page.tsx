'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface PatientInfo {
  id: string
  full_name: string
  email: string
  phone: string | null
  appointmentCount: number
  lastAppointmentDate: string | null
  totalPaid: number
}

export default function DoctorPatientsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [patients, setPatients] = useState<PatientInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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

  // Fetch patients
  useEffect(() => {
    async function fetchPatients() {
      if (!doctorId) return
      const supabase = createClient()

      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          payment_amount,
          payment_status,
          patient:users!appointments_patient_id_fkey (
            id,
            full_name,
            email,
            phone
          ),
          slot:doctor_availability_slots!appointments_slot_id_fkey (
            slot_datetime
          )
        `)
        .eq('doctor_id', doctorId)

      if (appointments) {
        const patientMap = new Map<string, PatientInfo>()

        for (const appt of appointments as any[]) {
          if (!appt.patient) continue
          const pid = appt.patient.id
          const existing = patientMap.get(pid)
          const slotDate = appt.slot?.slot_datetime || null
          const paid = appt.payment_status === 'paid' ? (appt.payment_amount || 0) : 0

          if (existing) {
            existing.appointmentCount++
            existing.totalPaid += paid
            if (slotDate && (!existing.lastAppointmentDate || slotDate > existing.lastAppointmentDate)) {
              existing.lastAppointmentDate = slotDate
            }
          } else {
            patientMap.set(pid, {
              id: pid,
              full_name: appt.patient.full_name,
              email: appt.patient.email,
              phone: appt.patient.phone,
              appointmentCount: 1,
              lastAppointmentDate: slotDate,
              totalPaid: paid,
            })
          }
        }

        const sorted = Array.from(patientMap.values()).sort((a, b) => {
          if (!a.lastAppointmentDate) return 1
          if (!b.lastAppointmentDate) return -1
          return b.lastAppointmentDate.localeCompare(a.lastAppointmentDate)
        })

        setPatients(sorted)
      }

      setIsLoading(false)
    }

    fetchPatients()
  }, [doctorId])

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients
    const q = searchQuery.trim().toLowerCase()
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q))
    )
  }, [patients, searchQuery])

  if (authLoading || isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">המטופלים שלי</h1>
      <p className="text-muted-foreground mb-6">
        {patients.length} מטופלים רשומים
      </p>

      <div className="mb-6">
        <Input
          placeholder="חפש מטופל לפי שם, אימייל או טלפון..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchQuery ? 'לא נמצאו מטופלים התואמים לחיפוש' : 'עדיין אין מטופלים'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <Link key={patient.id} href={`/doctor/patients/${patient.id}`}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{patient.full_name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>{patient.email}</span>
                      {patient.phone && <span>{patient.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-lg">{patient.appointmentCount}</p>
                      <p className="text-muted-foreground">תורים</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg">{patient.totalPaid > 0 ? `${patient.totalPaid.toLocaleString()}₪` : '-'}</p>
                      <p className="text-muted-foreground">תשלומים</p>
                    </div>
                    {patient.lastAppointmentDate && (
                      <div className="text-center">
                        <p className="font-medium">
                          {format(new Date(patient.lastAppointmentDate), 'd/M/yy', { locale: he })}
                        </p>
                        <p className="text-muted-foreground">ביקור אחרון</p>
                      </div>
                    )}
                    <Badge variant="outline">צפה בפרטים</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
