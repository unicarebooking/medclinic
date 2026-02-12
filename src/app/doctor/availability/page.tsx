'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfDay, addHours, isSameDay } from 'date-fns'
import { he } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Location {
  id: string
  name: string
  city: string
}

interface Slot {
  id: string
  slot_datetime: string
  duration_minutes: number
  is_booked: boolean
  location_id: string
}

export default function DoctorAvailabilityPage() {
  const { user } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingSlots, setIsAddingSlots] = useState(false)

  // Add slots dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newSlotLocation, setNewSlotLocation] = useState<string>('')
  const [newSlotStartHour, setNewSlotStartHour] = useState('9')
  const [newSlotEndHour, setNewSlotEndHour] = useState('17')
  const [newSlotDuration, setNewSlotDuration] = useState('30')

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

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      const supabase = createClient()
      const { data } = await supabase
        .from('locations')
        .select('id, name, city')
        .eq('is_active', true)

      if (data) {
        const typedData = data as Location[]
        setLocations(typedData)
        if (typedData.length > 0) {
          setNewSlotLocation(typedData[0].id)
        }
      }
    }

    fetchLocations()
  }, [])

  // Fetch slots for selected date range
  useEffect(() => {
    async function fetchSlots() {
      if (!doctorId) return

      const supabase = createClient()
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('doctor_availability_slots')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('slot_datetime', startOfMonth.toISOString())
        .lte('slot_datetime', endOfMonth.toISOString())
        .order('slot_datetime', { ascending: true })

      if (error) {
        console.error('Error fetching slots:', error)
      } else {
        setSlots((data || []) as Slot[])
      }
      setIsLoading(false)
    }

    fetchSlots()
  }, [doctorId, selectedDate])

  // Get slots for selected date
  const slotsForSelectedDate = slots.filter((s) =>
    isSameDay(new Date(s.slot_datetime), selectedDate)
  )

  // Get dates with slots
  const datesWithSlots = slots.map((s) => new Date(s.slot_datetime))

  const addSlotsForDate = async () => {
    if (!doctorId || !newSlotLocation) {
      toast.error('בחר מיקום')
      return
    }

    setIsAddingSlots(true)

    const supabase = createClient() as any
    const slotsToAdd: any[] = []
    const startHour = parseInt(newSlotStartHour)
    const endHour = parseInt(newSlotEndHour)
    const duration = parseInt(newSlotDuration)

    const dateStart = startOfDay(selectedDate)

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        const slotTime = addHours(dateStart, hour)
        slotTime.setMinutes(minute)

        // Check if slot already exists
        const exists = slots.some(
          (s) =>
            s.location_id === newSlotLocation &&
            new Date(s.slot_datetime).getTime() === slotTime.getTime()
        )

        if (!exists && slotTime > new Date()) {
          slotsToAdd.push({
            doctor_id: doctorId,
            location_id: newSlotLocation,
            slot_datetime: slotTime.toISOString(),
            duration_minutes: duration,
            is_booked: false,
          })
        }
      }
    }

    if (slotsToAdd.length === 0) {
      toast.info('כל השעות כבר קיימות או עברו')
      setIsAddingSlots(false)
      return
    }

    const { error } = await supabase.from('doctor_availability_slots').insert(slotsToAdd)

    if (error) {
      toast.error('שגיאה בהוספת שעות')
      console.error(error)
    } else {
      toast.success(`נוספו ${slotsToAdd.length} שעות קבלה`)
      // Refresh slots
      const { data: newSlots } = await supabase
        .from('doctor_availability_slots')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('slot_datetime', new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString())
        .lte('slot_datetime', new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString())
        .order('slot_datetime', { ascending: true })

      setSlots(newSlots || [])
    }

    setIsAddingSlots(false)
    setDialogOpen(false)
  }

  const deleteSlot = async (slotId: string) => {
    const supabase = createClient() as any
    await supabase.from('doctor_availability_slots').delete().eq('id', slotId)
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
    toast.success('השעה נמחקה')
  }

  const addBulkSlots = async (days: number) => {
    if (!doctorId || !newSlotLocation) {
      toast.error('בחר מיקום')
      return
    }

    setIsAddingSlots(true)

    const supabase = createClient() as any
    const slotsToAdd: any[] = []
    const startHour = parseInt(newSlotStartHour)
    const endHour = parseInt(newSlotEndHour)
    const duration = parseInt(newSlotDuration)

    for (let day = 0; day < days; day++) {
      const currentDate = addDays(new Date(), day)
      const dayOfWeek = currentDate.getDay()

      // Skip weekends (Friday = 5, Saturday = 6)
      if (dayOfWeek === 5 || dayOfWeek === 6) continue

      const dateStart = startOfDay(currentDate)

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += duration) {
          const slotTime = addHours(dateStart, hour)
          slotTime.setMinutes(minute)

          if (slotTime > new Date()) {
            slotsToAdd.push({
              doctor_id: doctorId,
              location_id: newSlotLocation,
              slot_datetime: slotTime.toISOString(),
              duration_minutes: duration,
              is_booked: false,
            })
          }
        }
      }
    }

    // Remove duplicates
    const { data: existingSlots } = await supabase
      .from('doctor_availability_slots')
      .select('slot_datetime, location_id')
      .eq('doctor_id', doctorId)

    const existingSet = new Set(
      existingSlots?.map((s: any) => `${s.slot_datetime}-${s.location_id}`) || []
    )

    const uniqueSlots = slotsToAdd.filter(
      (s) => !existingSet.has(`${s.slot_datetime}-${s.location_id}`)
    )

    if (uniqueSlots.length === 0) {
      toast.info('כל השעות כבר קיימות')
      setIsAddingSlots(false)
      return
    }

    // Insert in batches
    const batchSize = 500
    for (let i = 0; i < uniqueSlots.length; i += batchSize) {
      const batch = uniqueSlots.slice(i, i + batchSize)
      await supabase.from('doctor_availability_slots').insert(batch)
    }

    toast.success(`נוספו ${uniqueSlots.length} שעות קבלה ל-${days} ימים`)
    setIsAddingSlots(false)

    // Refresh
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">ניהול זמינות</h1>
          <p className="text-muted-foreground">הגדר את שעות הקבלה שלך</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>הוסף שעות ליום</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוספת שעות קבלה</DialogTitle>
                <DialogDescription>
                  הוסף שעות קבלה ל-{format(selectedDate, 'd בMMMM yyyy', { locale: he })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>מיקום</Label>
                  <Select value={newSlotLocation} onValueChange={setNewSlotLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר קליניקה" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} - {loc.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>שעת התחלה</Label>
                    <Select value={newSlotStartHour} onValueChange={setNewSlotStartHour}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 7).map((hour) => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>שעת סיום</Label>
                    <Select value={newSlotEndHour} onValueChange={setNewSlotEndHour}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 10).map((hour) => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>משך כל תור (דקות)</Label>
                  <Select value={newSlotDuration} onValueChange={setNewSlotDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 דקות</SelectItem>
                      <SelectItem value="30">30 דקות</SelectItem>
                      <SelectItem value="45">45 דקות</SelectItem>
                      <SelectItem value="60">60 דקות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  onClick={addSlotsForDate}
                  disabled={isAddingSlots}
                >
                  {isAddingSlots ? 'מוסיף...' : 'הוסף שעות'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">הוספה מרובה</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוספת שעות מרובה</DialogTitle>
                <DialogDescription>
                  הוסף שעות קבלה למספר ימים קדימה (ללא סופי שבוע)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>מיקום</Label>
                  <Select value={newSlotLocation} onValueChange={setNewSlotLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר קליניקה" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} - {loc.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => addBulkSlots(7)}
                    disabled={isAddingSlots}
                  >
                    שבוע
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addBulkSlots(30)}
                    disabled={isAddingSlots}
                  >
                    חודש
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addBulkSlots(90)}
                    disabled={isAddingSlots}
                  >
                    3 חודשים
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>בחר תאריך</CardTitle>
            <CardDescription>לחץ על תאריך לצפייה בשעות</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={he}
              modifiers={{
                hasSlots: datesWithSlots,
              }}
              modifiersStyles={{
                hasSlots: { fontWeight: 'bold', color: 'var(--primary)' },
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Slots for selected date */}
        <Card>
          <CardHeader>
            <CardTitle>
              שעות ב-{format(selectedDate, 'd בMMMM yyyy', { locale: he })}
            </CardTitle>
            <CardDescription>
              {slotsForSelectedDate.length} שעות קבלה
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slotsForSelectedDate.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">אין שעות קבלה בתאריך זה</p>
                <Button onClick={() => setDialogOpen(true)}>הוסף שעות</Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {slotsForSelectedDate.map((slot) => {
                  const location = locations.find((l) => l.id === slot.location_id)
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {format(new Date(slot.slot_datetime), 'HH:mm')}
                        </span>
                        <Badge variant={slot.is_booked ? 'secondary' : 'outline'}>
                          {slot.is_booked ? 'תפוס' : 'פנוי'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {location?.name}
                        </span>
                      </div>
                      {!slot.is_booked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => deleteSlot(slot.id)}
                        >
                          מחק
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
