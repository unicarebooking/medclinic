import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface DoctorPageProps {
  params: Promise<{
    doctorId: string
  }>
}

export default async function DoctorProfilePage({ params }: DoctorPageProps) {
  const { doctorId } = await params
  const supabase = await createClient()

  // Fetch doctor details
  const { data: doctorData, error } = await supabase
    .from('doctors')
    .select(`
      *,
      user:users!doctors_user_id_fkey (
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq('id', doctorId)
    .eq('is_active', true)
    .single()

  if (error || !doctorData) {
    notFound()
  }

  const doctor = doctorData as any

  // Fetch treatment types
  const { data: treatmentTypes } = await supabase
    .from('treatment_types')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('is_active', true)

  // Fetch available slots count for next 30 days
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const { count: availableSlotsCount } = await supabase
    .from('doctor_availability_slots')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_id', doctorId)
    .eq('is_booked', false)
    .gte('slot_datetime', new Date().toISOString())
    .lte('slot_datetime', thirtyDaysFromNow.toISOString())

  // Fetch locations where doctor works
  const { data: locations } = await supabase
    .from('doctor_availability_slots')
    .select(`
      location:locations!doctor_availability_slots_location_id_fkey (
        id,
        name,
        city,
        address
      )
    `)
    .eq('doctor_id', doctorId)
    .limit(10)

  // Get unique locations
  const uniqueLocations = locations
    ? Array.from(new Map(locations.map((l: any) => [l.location?.id, l.location])).values()).filter(Boolean)
    : []

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const user = doctor.user as any

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Doctor Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={user?.avatar_url || ''} alt={user?.full_name} />
                  <AvatarFallback className="text-3xl">
                    {getInitials(user?.full_name || 'DR')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-right">
                  <h1 className="text-3xl font-bold mb-2">ד&quot;ר {user?.full_name}</h1>
                  <Badge className="mb-4">{doctor.specialization}</Badge>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">ניסיון</p>
                      <p className="font-semibold">{doctor.years_of_experience} שנים</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">מחיר ביקור</p>
                      <p className="font-semibold">₪{doctor.consultation_fee}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">מס&apos; רישיון</p>
                      <p className="font-semibold">{doctor.license_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">תורים פנויים</p>
                      <p className="font-semibold text-green-600">{availableSlotsCount || 0}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link href={`/doctors/${doctorId}/book`}>
                      <Button size="lg" className="w-full md:w-auto">
                        קבע תור עכשיו
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>אודות</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {doctor.bio || `ד"ר ${user?.full_name} הוא רופא מומחה ב${doctor.specialization} עם ${doctor.years_of_experience} שנות ניסיון. הרופא מתמחה במתן טיפול איכותי ומקצועי למטופלים.`}
                </p>
              </CardContent>
            </Card>

            {/* Locations */}
            <Card>
              <CardHeader>
                <CardTitle>מיקומי קבלה</CardTitle>
                <CardDescription>הקליניקות בהן הרופא מקבל</CardDescription>
              </CardHeader>
              <CardContent>
                {uniqueLocations.length > 0 ? (
                  <ul className="space-y-3">
                    {uniqueLocations.map((location: any) => (
                      <li key={location.id} className="flex items-start gap-2">
                        <span className="text-lg">🏥</span>
                        <div>
                          <p className="font-medium">{location.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {location.address}, {location.city}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">אין מיקומי קבלה זמינים</p>
                )}
              </CardContent>
            </Card>

            {/* Treatment Types */}
            {treatmentTypes && treatmentTypes.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>סוגי טיפולים</CardTitle>
                  <CardDescription>הטיפולים שהרופא מציע</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(treatmentTypes as any[]).map((treatment) => (
                      <div
                        key={treatment.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{treatment.name}</h4>
                          <Badge variant="outline">₪{treatment.price}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {treatment.description || 'טיפול מקצועי ואיכותי'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          משך: {treatment.duration_minutes} דקות
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* CTA */}
          <Card className="mt-6 bg-primary text-primary-foreground">
            <CardContent className="py-8 text-center">
              <h2 className="text-2xl font-bold mb-4">מוכנים לקבוע תור?</h2>
              <p className="mb-6 opacity-90">
                בחרו תאריך ושעה נוחים וקבעו תור עוד היום
              </p>
              <Link href={`/doctors/${doctorId}/book`}>
                <Button size="lg" variant="secondary">
                  לקביעת תור
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
