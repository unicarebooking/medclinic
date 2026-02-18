'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, addDays, isSameDay } from 'date-fns'
import { he } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BookingPageProps {
  params: Promise<{
    doctorId: string
  }>
}

interface Doctor {
  id: string
  specialization: string
  consultation_fee: number
  user: {
    full_name: string
  }
}

interface Location {
  id: string
  name: string
  city: string
  address: string
}

interface Slot {
  id: string
  slot_datetime: string
  duration_minutes: number
  location_id: string
}

export default function BookingPage({ params }: BookingPageProps) {
  const { doctorId } = use(params)
  console.log('=== BookingPage Render ===')
  console.log('doctorId:', doctorId)

  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  console.log('authLoading:', authLoading, 'isAuthenticated:', isAuthenticated)

  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('Loading timeout reached, forcing load complete')
        setIsLoading(false)
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  // Fetch doctor info
  useEffect(() => {
    async function fetchDoctor() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          specialization,
          consultation_fee,
          user:users!doctors_user_id_fkey (
            full_name
          )
        `)
        .eq('id', doctorId)
        .single()

      console.log('=== Fetch Doctor Debug ===')
      console.log('Doctor data:', data)
      console.log('Doctor error:', error)
      console.log('==========================')

      if (error) {
        setError(`לא ניתן לטעון את פרטי הרופא: ${error.message}`)
        setIsLoading(false)
        return
      }

      setDoctor(data as any)
    }

    fetchDoctor()
  }, [doctorId])

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      const supabase = createClient()

      // Get unique locations for this doctor
      const { data: slotLocations } = await supabase
        .from('doctor_availability_slots')
        .select(`
          location_id,
          location:locations!doctor_availability_slots_location_id_fkey (
            id,
            name,
            city,
            address
          )
        `)
        .eq('doctor_id', doctorId)
        .eq('is_booked', false)
        .gte('slot_datetime', new Date().toISOString())

      console.log('=== Fetch Locations Debug ===')
      console.log('Slot locations:', slotLocations)
      console.log('=============================')

      if (slotLocations) {
        const uniqueLocations = Array.from(
          new Map(slotLocations.map((s: any) => [s.location?.id, s.location])).values()
        ).filter(Boolean) as Location[]

        console.log('Unique locations:', uniqueLocations)
        setLocations(uniqueLocations)
        if (uniqueLocations.length > 0) {
          setSelectedLocation(uniqueLocations[0].id)
        }
      }
      setIsLoading(false)
    }

    fetchLocations()
  }, [doctorId])

  // Fetch available slots when location changes
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedLocation) return

      const supabase = createClient()
      const thirtyDaysFromNow = addDays(new Date(), 30)

      const { data } = await supabase
        .from('doctor_availability_slots')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('location_id', selectedLocation)
        .eq('is_booked', false)
        .gte('slot_datetime', new Date().toISOString())
        .lte('slot_datetime', thirtyDaysFromNow.toISOString())
        .order('slot_datetime', { ascending: true })

      setSlots(data || [])
      setSelectedDate(undefined)
      setSelectedSlot(null)
    }

    fetchSlots()
  }, [doctorId, selectedLocation])

  // Get unique dates with available slots
  const availableDates = slots.map((s) => new Date(s.slot_datetime))
  const uniqueDates = availableDates.filter(
    (date, index, self) =>
      index === self.findIndex((d) => isSameDay(d, date))
  )

  // Get slots for selected date
  const slotsForSelectedDate = selectedDate
    ? slots.filter((s) => isSameDay(new Date(s.slot_datetime), selectedDate))
    : []

  const handleBooking = async () => {
    if (!selectedSlot || !user) return

    setIsBooking(true)
    setError(null)

    const supabase = createClient()

    // Create appointment
    const { error: appointmentError } = await (supabase as any).from('appointments').insert({
      patient_id: user.id,
      doctor_id: doctorId,
      slot_id: selectedSlot.id,
      status: 'pending',
      payment_status: 'pending',
      payment_amount: doctor?.consultation_fee || 0,
    })

    if (appointmentError) {
      setError('שגיאה ביצירת התור. נסה שוב.')
      setIsBooking(false)
      return
    }

    // Index patient info in RAG vector store (fire-and-forget)
    fetch('/api/rag/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_table: 'users',
        source_id: user.id,
        doctor_id: doctorId,
      }),
    }).catch(() => {})

    // Mark slot as booked
    await (supabase as any)
      .from('doctor_availability_slots')
      .update({ is_booked: true })
      .eq('id', selectedSlot.id)

    // Redirect to payment
    router.push(`/patient/appointments?booked=true`)
  }

  // Show loading only for data, not for auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Check auth only after data is loaded (not during loading)
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-md text-center">
            <Card>
              <CardHeader>
                <CardTitle>נדרשת התחברות</CardTitle>
                <CardDescription>
                  כדי לקבוע תור יש להתחבר או להירשם למערכת
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/login">
                  <Button className="w-full">התחבר</Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" className="w-full">הירשם</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error && !doctor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-red-500">{error}</p>
            <Link href="/doctors">
              <Button className="mt-4">חזור לרשימת הרופאים</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6">
            <Link href={`/doctors/${doctorId}`} className="text-primary hover:underline text-sm">
              &rarr; חזרה לפרופיל הרופא
            </Link>
            <h1 className="text-3xl font-bold mt-2">
              קביעת תור אצל ד&quot;ר {(doctor?.user as any)?.full_name}
            </h1>
            <p className="text-muted-foreground">
              {doctor?.specialization} | ₪{doctor?.consultation_fee} לביקור
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Select Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge>1</Badge>
                  בחר מיקום
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קליניקה" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} - {location.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedLocation && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    {locations.find((l) => l.id === selectedLocation) && (
                      <>
                        <p className="font-medium">
                          {locations.find((l) => l.id === selectedLocation)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {locations.find((l) => l.id === selectedLocation)?.address},{' '}
                          {locations.find((l) => l.id === selectedLocation)?.city}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Select Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge>2</Badge>
                  בחר תאריך
                </CardTitle>
                <CardDescription>
                  {uniqueDates.length} תאריכים פנויים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) =>
                    date < new Date() ||
                    !uniqueDates.some((d) => isSameDay(d, date))
                  }
                  locale={he}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Step 3: Select Time */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge>3</Badge>
                    בחר שעה
                  </CardTitle>
                  <CardDescription>
                    {format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {slotsForSelectedDate.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={selectedSlot?.id === slot.id ? 'default' : 'outline'}
                        onClick={() => setSelectedSlot(slot)}
                        className="text-center"
                      >
                        {format(new Date(slot.slot_datetime), 'HH:mm')}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary & Confirm */}
            {selectedSlot && (
              <Card className="bg-primary/5 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="secondary">4</Badge>
                    סיכום וקביעת תור
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">רופא:</span>
                      <span className="font-medium">ד&quot;ר {(doctor?.user as any)?.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">תאריך:</span>
                      <span className="font-medium">
                        {format(new Date(selectedSlot.slot_datetime), 'd/M/yyyy', { locale: he })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">שעה:</span>
                      <span className="font-medium">
                        {format(new Date(selectedSlot.slot_datetime), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">מיקום:</span>
                      <span className="font-medium">
                        {locations.find((l) => l.id === selectedLocation)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">מחיר:</span>
                      <span className="font-bold text-lg">₪{doctor?.consultation_fee}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleBooking}
                    disabled={isBooking}
                  >
                    {isBooking ? 'קובע תור...' : 'אשר וקבע תור'}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    בלחיצה על &quot;אשר וקבע תור&quot; אתה מאשר את פרטי ההזמנה
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
