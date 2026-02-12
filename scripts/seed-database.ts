/**
 * Database Seed Script
 *
 * הוראות הפעלה:
 * 1. ודא שיש לך את משתני הסביבה בקובץ .env.local:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY (לא anon key!)
 *
 * 2. הרץ את הסקריפט:
 *    npx tsx scripts/seed-database.ts
 *
 * יוצר:
 * - 10 מיקומי קליניקות (10 ערים)
 * - 30 רופאים (10 התמחויות)
 * - 100 מטופלים
 * - 3,000 סיכומי טיפולים
 * - תורים פנויים ל-3 חודשים קדימה
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables!')
  console.error('Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Hebrew data for realistic seeding
const CITIES = [
  { name: 'תל אביב', addresses: ['רוטשילד 45', 'דיזנגוף 100', 'אבן גבירול 70'] },
  { name: 'ירושלים', addresses: ['יפו 97', 'בן יהודה 30', 'עזה 15'] },
  { name: 'חיפה', addresses: ['הנמל 20', 'הרצל 50', 'מוריה 80'] },
  { name: 'באר שבע', addresses: ['קרן קיימת 10', 'הנשיאים 5', 'רגר 25'] },
  { name: 'ראשון לציון', addresses: ['הרצל 30', 'ז\'בוטינסקי 15'] },
  { name: 'פתח תקווה', addresses: ['רוטשילד 20', 'חיים עוזר 5'] },
  { name: 'אשדוד', addresses: ['הבנים 10', 'רוגוזין 25'] },
  { name: 'נתניה', addresses: ['הרצל 40', 'ויצמן 15'] },
  { name: 'חולון', addresses: ['סוקולוב 50', 'ויצמן 30'] },
  { name: 'בני ברק', addresses: ['רבי עקיבא 100', 'ז\'בוטינסקי 20'] },
]

const SPECIALIZATIONS = [
  'רפואה כללית',
  'רפואת עור',
  'רפואת עיניים',
  'רפואת אף אוזן גרון',
  'רפואת נשים',
  'רפואת ילדים',
  'אורתופדיה',
  'קרדיולוגיה',
  'נוירולוגיה',
  'פסיכיאטריה',
]

const FIRST_NAMES = [
  'אברהם', 'יצחק', 'יעקב', 'משה', 'אהרון', 'דוד', 'שלמה', 'יוסף', 'בנימין', 'דניאל',
  'שרה', 'רבקה', 'רחל', 'לאה', 'מרים', 'חנה', 'דבורה', 'רות', 'אסתר', 'נעמי',
  'עמית', 'ליאור', 'אורי', 'יובל', 'עידו', 'נועם', 'תומר', 'איתי', 'רועי', 'שחר',
]

const LAST_NAMES = [
  'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'אזולאי', 'דהן', 'אברהם', 'פרידמן', 'שמעון',
  'יוסף', 'חדד', 'אוחיון', 'מלכה', 'בן דוד', 'אלון', 'ברק', 'גולן', 'הררי', 'זיו',
]

const DIAGNOSES = [
  'דלקת גרון חריפה',
  'כאבי ראש מיגרניים',
  'לחץ דם גבוה',
  'סוכרת סוג 2',
  'דלקת עור אלרגית',
  'דלקת אוזן תיכונה',
  'כאבי גב תחתון',
  'חרדה כללית',
  'שפעת עונתית',
  'אסתמה',
  'כאבי בטן',
  'בעיות עיכול',
  'דלקת מפרקים',
  'נזלת אלרגית',
  'הפרעות שינה',
]

const TREATMENTS = [
  'טיפול תרופתי - אנטיביוטיקה',
  'טיפול משכך כאבים',
  'שינוי תזונתי והמלצות לאורח חיים',
  'הפניה לבדיקות דם',
  'מרשם לטיפות עיניים',
  'פיזיותרפיה',
  'טיפול פסיכולוגי',
  'בדיקת לחץ דם יומית',
  'טיפול באינהלציה',
  'מנוחה וצריכת נוזלים',
]

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generatePhone(): string {
  const prefix = ['050', '052', '053', '054', '055', '058'][Math.floor(Math.random() * 6)]
  const number = Math.floor(Math.random() * 9000000) + 1000000
  return `${prefix}-${number}`
}

function generateLicense(): string {
  return `${Math.floor(Math.random() * 90000) + 10000}`
}

async function seedLocations() {
  console.log('Seeding locations...')

  const locations = CITIES.map((city) => ({
    name: `קליניקת MedClinic ${city.name}`,
    address: randomElement(city.addresses),
    city: city.name,
    phone: generatePhone(),
    is_active: true,
  }))

  const { data, error } = await supabase.from('locations').insert(locations).select()

  if (error) {
    console.error('Error seeding locations:', error)
    throw error
  }

  console.log(`Created ${data?.length} locations`)
  return data
}

async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: 'patient' | 'doctor' | 'admin'
) {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    console.error('Error creating auth user:', authError)
    throw authError
  }

  // Create user record
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      phone: generatePhone(),
      role,
    })
    .select()
    .single()

  if (userError) {
    console.error('Error creating user record:', userError)
    throw userError
  }

  return userData
}

async function seedDoctors(locations: { id: string }[]) {
  console.log('Seeding doctors...')

  const doctors = []
  const doctorRecords = []

  for (let i = 0; i < 30; i++) {
    const firstName = randomElement(FIRST_NAMES)
    const lastName = randomElement(LAST_NAMES)
    const fullName = `${firstName} ${lastName}`
    const email = `doctor${i + 1}@medclinic.test`

    try {
      const user = await createUser(email, 'password123', fullName, 'doctor')

      const doctorData = {
        user_id: user.id,
        specialization: SPECIALIZATIONS[i % SPECIALIZATIONS.length],
        bio: `ד"ר ${fullName} הוא רופא מנוסה בתחום ${SPECIALIZATIONS[i % SPECIALIZATIONS.length]} עם ניסיון של שנים רבות.`,
        license_number: generateLicense(),
        years_of_experience: Math.floor(Math.random() * 25) + 5,
        consultation_fee: (Math.floor(Math.random() * 5) + 2) * 100,
        is_active: true,
      }

      const { data: doctor, error } = await supabase
        .from('doctors')
        .insert(doctorData)
        .select()
        .single()

      if (error) throw error

      doctors.push({ ...doctor, user })
      doctorRecords.push(doctor)

      console.log(`Created doctor ${i + 1}/30: ${fullName}`)
    } catch (err) {
      console.error(`Error creating doctor ${i + 1}:`, err)
    }
  }

  console.log(`Created ${doctors.length} doctors`)
  return { doctors, doctorRecords }
}

async function seedPatients() {
  console.log('Seeding patients...')

  const patients = []

  for (let i = 0; i < 100; i++) {
    const firstName = randomElement(FIRST_NAMES)
    const lastName = randomElement(LAST_NAMES)
    const fullName = `${firstName} ${lastName}`
    const email = `patient${i + 1}@medclinic.test`

    try {
      const user = await createUser(email, 'password123', fullName, 'patient')
      patients.push(user)
      console.log(`Created patient ${i + 1}/100: ${fullName}`)
    } catch (err) {
      console.error(`Error creating patient ${i + 1}:`, err)
    }
  }

  console.log(`Created ${patients.length} patients`)
  return patients
}

async function seedAvailabilitySlots(
  doctorRecords: { id: string }[],
  locations: { id: string }[]
) {
  console.log('Seeding availability slots...')

  const slots = []
  const now = new Date()

  for (const doctor of doctorRecords) {
    // Create slots for next 3 months
    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
      const date = new Date(now)
      date.setDate(date.getDate() + dayOffset)

      // Skip weekends
      if (date.getDay() === 5 || date.getDay() === 6) continue

      // Create 8 slots per day (9:00 - 17:00)
      for (let hour = 9; hour < 17; hour++) {
        const slotDate = new Date(date)
        slotDate.setHours(hour, 0, 0, 0)

        slots.push({
          doctor_id: doctor.id,
          location_id: randomElement(locations).id,
          slot_datetime: slotDate.toISOString(),
          duration_minutes: 30,
          is_booked: false,
        })
      }
    }
  }

  // Insert in batches
  const batchSize = 1000
  for (let i = 0; i < slots.length; i += batchSize) {
    const batch = slots.slice(i, i + batchSize)
    const { error } = await supabase.from('doctor_availability_slots').insert(batch)

    if (error) {
      console.error('Error inserting slots batch:', error)
    } else {
      console.log(`Inserted slots batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(slots.length / batchSize)}`)
    }
  }

  console.log(`Created ${slots.length} availability slots`)
  return slots
}

async function seedTreatmentSummaries(
  doctorRecords: { id: string }[],
  patients: { id: string }[]
) {
  console.log('Seeding treatment summaries...')

  // First we need to create some appointments
  const { data: slots } = await supabase
    .from('doctor_availability_slots')
    .select('id, doctor_id')
    .eq('is_booked', false)
    .limit(3000)

  if (!slots) {
    console.error('No slots found')
    return
  }

  const appointments = []
  const summaries = []

  for (let i = 0; i < Math.min(slots.length, 3000); i++) {
    const slot = slots[i]
    const patient = randomElement(patients)
    const doctor = doctorRecords.find((d) => d.id === slot.doctor_id)

    if (!doctor) continue

    const appointmentId = crypto.randomUUID()

    appointments.push({
      id: appointmentId,
      patient_id: patient.id,
      doctor_id: slot.doctor_id,
      slot_id: slot.id,
      status: 'completed' as const,
      payment_status: 'paid',
      payment_amount: Math.floor(Math.random() * 500) + 200,
    })

    summaries.push({
      appointment_id: appointmentId,
      doctor_id: slot.doctor_id,
      patient_id: patient.id,
      diagnosis: randomElement(DIAGNOSES),
      treatment_notes: `${randomElement(TREATMENTS)}. המטופל הגיב היטב לטיפול. מומלץ להמשיך במעקב.`,
      prescription: Math.random() > 0.3 ? `${randomElement(['אקמול', 'נורופן', 'אופטלגין', 'קלקסן'])} - 3 פעמים ביום` : null,
      follow_up_required: Math.random() > 0.5,
      follow_up_date: Math.random() > 0.5 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
    })
  }

  // Mark slots as booked
  const slotIds = appointments.map((a) => a.slot_id)
  await supabase
    .from('doctor_availability_slots')
    .update({ is_booked: true })
    .in('id', slotIds)

  // Insert appointments in batches
  const batchSize = 500
  for (let i = 0; i < appointments.length; i += batchSize) {
    const batch = appointments.slice(i, i + batchSize)
    const { error } = await supabase.from('appointments').insert(batch)

    if (error) {
      console.error('Error inserting appointments batch:', error)
    } else {
      console.log(`Inserted appointments batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(appointments.length / batchSize)}`)
    }
  }

  // Insert summaries in batches
  for (let i = 0; i < summaries.length; i += batchSize) {
    const batch = summaries.slice(i, i + batchSize)
    const { error } = await supabase.from('treatment_summaries').insert(batch)

    if (error) {
      console.error('Error inserting summaries batch:', error)
    } else {
      console.log(`Inserted summaries batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(summaries.length / batchSize)}`)
    }
  }

  console.log(`Created ${appointments.length} appointments and ${summaries.length} treatment summaries`)
}

async function createAdminUser() {
  console.log('Creating admin user...')

  try {
    const user = await createUser('admin@medclinic.test', 'admin123', 'מנהל מערכת', 'admin')
    console.log('Created admin user:', user.email)
  } catch (err) {
    console.error('Error creating admin:', err)
  }
}

async function main() {
  console.log('Starting database seed...')
  console.log('='.repeat(50))

  try {
    // Create locations first
    const locations = await seedLocations()

    // Create admin user
    await createAdminUser()

    // Create doctors
    const { doctors, doctorRecords } = await seedDoctors(locations!)

    // Create patients
    const patients = await seedPatients()

    // Create availability slots
    await seedAvailabilitySlots(doctorRecords, locations!)

    // Create treatment summaries (and appointments)
    await seedTreatmentSummaries(doctorRecords, patients)

    console.log('='.repeat(50))
    console.log('Database seeding completed!')
    console.log('')
    console.log('חשבונות לבדיקה:')
    console.log('- מנהל: admin@medclinic.test / admin123')
    console.log('- רופאים: doctor1@medclinic.test עד doctor30@medclinic.test / password123')
    console.log('- מטופלים: patient1@medclinic.test עד patient100@medclinic.test / password123')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

main()
