import { createClient } from '@/lib/supabase/server'
import { DoctorCard } from '@/components/shared/DoctorCard'

interface DoctorsListProps {
  specialization?: string
  city?: string
  search?: string
}

export async function DoctorsList({ specialization, city, search }: DoctorsListProps) {
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('doctors')
    .select(`
      id,
      specialization,
      years_of_experience,
      consultation_fee,
      bio,
      user:users!doctors_user_id_fkey (
        full_name,
        avatar_url
      )
    `)
    .eq('is_active', true)

  // Apply filters
  if (specialization) {
    query = query.eq('specialization', specialization)
  }

  if (search) {
    // Search by doctor name through users table
    query = query.ilike('user.full_name', `%${search}%`)
  }

  const { data: doctors, error } = await query.order('years_of_experience', { ascending: false })

  // Debug logging
  console.log('=== Doctors Query Debug ===')
  console.log('Query error:', error)
  console.log('Doctors count:', doctors?.length)
  console.log('First doctor:', doctors?.[0])
  console.log('===========================')

  if (error) {
    console.error('Error fetching doctors:', error)
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">שגיאה בטעינת הרופאים. נסה שוב מאוחר יותר.</p>
        <p className="text-xs text-red-500 mt-2">Error: {error.message}</p>
      </div>
    )
  }

  // Filter by city if needed (requires joining with availability slots)
  let filteredDoctors = (doctors || []) as any[]

  if (city) {
    // Get doctors who have slots in this city
    const { data: slotsInCity } = await supabase
      .from('doctor_availability_slots')
      .select('doctor_id, location:locations!doctor_availability_slots_location_id_fkey(city)')
      .eq('location.city', city)

    if (slotsInCity) {
      const doctorIdsInCity = new Set((slotsInCity as any[]).map((s) => s.doctor_id))
      filteredDoctors = filteredDoctors.filter((d) => doctorIdsInCity.has(d.id))
    }
  }

  if (filteredDoctors.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl font-medium mb-2">לא נמצאו רופאים</p>
        <p className="text-muted-foreground">נסה לשנות את הסינון או לחפש משהו אחר</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        נמצאו {filteredDoctors.length} רופאים
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDoctors.map((doctor) => (
          <DoctorCard
            key={doctor.id}
            doctor={{
              id: doctor.id,
              user: {
                full_name: (doctor.user as any)?.full_name || 'רופא',
                avatar_url: (doctor.user as any)?.avatar_url || null,
              },
              specialization: doctor.specialization,
              years_of_experience: doctor.years_of_experience,
              consultation_fee: doctor.consultation_fee,
              bio: doctor.bio,
            }}
          />
        ))}
      </div>
    </div>
  )
}
