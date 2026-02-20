import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lnhypawuvjiyzusvafeu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaHlwYXd1dmppeXp1c3ZhZmV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU2MDIwNywiZXhwIjoyMDg2MTM2MjA3fQ.jP-ShtFLUH1kvhG5OHPTFa6XCEmLETRdMiCrGaS9fIM',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('=== MEDCLINIC DATABASE STATE ===\n')

  // 1. All doctors with user info
  console.log('--- 1. ALL DOCTORS ---')
  const { data: doctors, error: doctorsErr } = await supabase
    .from('doctors')
    .select('id, user_id, specialization, is_active, users(full_name, email)')
    .order('created_at')
  if (doctorsErr) console.error('Doctors error:', doctorsErr)
  else {
    console.log(`Total doctors: ${doctors.length}`)
    doctors.forEach((d: any) => {
      console.log(`  id=${d.id}  user_id=${d.user_id}  spec="${d.specialization}"  name="${d.users?.full_name}"  email="${d.users?.email}"  active=${d.is_active}`)
    })
  }

  // 2. All patients
  console.log('\n--- 2. ALL PATIENTS (role=patient) ---')
  const { data: patients, error: patientsErr } = await supabase
    .from('users')
    .select('id, full_name, phone, email')
    .eq('role', 'patient')
    .order('created_at')
  if (patientsErr) console.error('Patients error:', patientsErr)
  else {
    console.log(`Total patients: ${patients.length}`)
    patients.forEach((p: any) => {
      console.log(`  id=${p.id}  name="${p.full_name}"  phone="${p.phone}"  email="${p.email}"`)
    })
  }

  // 3. All appointments
  console.log('\n--- 3. ALL APPOINTMENTS ---')
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('id, doctor_id, patient_id, status, payment_status, slot_id, doctor_availability_slots(slot_datetime, duration_minutes, location_id)')
    .order('created_at')
  if (apptErr) console.error('Appointments error:', apptErr)
  else {
    console.log(`Total appointments: ${appointments.length}`)
    appointments.slice(0, 20).forEach((a: any) => {
      const slot = a.doctor_availability_slots
      console.log(`  id=${a.id}  doctor=${a.doctor_id}  patient=${a.patient_id}  status=${a.status}  payment=${a.payment_status}  slot_datetime=${slot?.slot_datetime}  duration=${slot?.duration_minutes}min`)
    })
    if (appointments.length > 20) console.log(`  ... and ${appointments.length - 20} more`)
  }

  // 4. Treatment summaries count
  console.log('\n--- 4. TREATMENT SUMMARIES ---')
  const { count, error: tsErr } = await supabase
    .from('treatment_summaries')
    .select('*', { count: 'exact', head: true })
  if (tsErr) console.error('Treatment summaries error:', tsErr)
  else console.log(`Total treatment_summaries: ${count}`)

  // 5. Doctor availability slots
  console.log('\n--- 5. DOCTOR AVAILABILITY SLOTS ---')
  const { data: allSlots, error: slotsErr } = await supabase
    .from('doctor_availability_slots')
    .select('id, doctor_id, location_id, slot_datetime, duration_minutes, is_booked')
    .order('slot_datetime')
    .limit(20)
  if (slotsErr) console.error('Slots error:', slotsErr)
  else {
    // Get total count
    const { count: slotCount } = await supabase
      .from('doctor_availability_slots')
      .select('*', { count: 'exact', head: true })
    const { count: bookedCount } = await supabase
      .from('doctor_availability_slots')
      .select('*', { count: 'exact', head: true })
      .eq('is_booked', true)
    const { count: availableCount } = await supabase
      .from('doctor_availability_slots')
      .select('*', { count: 'exact', head: true })
      .eq('is_booked', false)

    console.log(`Total slots: ${slotCount}  |  Booked: ${bookedCount}  |  Available: ${availableCount}`)
    console.log('First 20 slots (by datetime):')
    allSlots.forEach((s: any) => {
      console.log(`  id=${s.id}  doctor=${s.doctor_id}  location=${s.location_id}  datetime=${s.slot_datetime}  duration=${s.duration_minutes}min  booked=${s.is_booked}`)
    })
  }

  // Bonus: locations and treatment_types
  console.log('\n--- BONUS: LOCATIONS ---')
  const { data: locations } = await supabase.from('locations').select('*')
  console.log(`Total locations: ${locations?.length}`)
  locations?.forEach((l: any) => {
    console.log(`  id=${l.id}  name="${l.name}"  city="${l.city}"  address="${l.address}"`)
  })

  console.log('\n--- BONUS: TREATMENT TYPES ---')
  const { data: ttypes } = await supabase.from('treatment_types').select('*')
  console.log(`Total treatment_types: ${ttypes?.length}`)
  ttypes?.forEach((t: any) => {
    console.log(`  id=${t.id}  doctor=${t.doctor_id}  name="${t.name}"  duration=${t.duration_minutes}min  price=${t.price}`)
  })

  // Bonus: users with admin role
  console.log('\n--- BONUS: ADMIN USERS ---')
  const { data: admins } = await supabase.from('users').select('id, full_name, email').eq('role', 'admin')
  console.log(`Total admins: ${admins?.length}`)
  admins?.forEach((a: any) => {
    console.log(`  id=${a.id}  name="${a.full_name}"  email="${a.email}"`)
  })

  // Bonus: transcriptions count
  console.log('\n--- BONUS: TRANSCRIPTIONS ---')
  const { count: transcCount, error: transcErr } = await supabase
    .from('transcriptions')
    .select('*', { count: 'exact', head: true })
  if (transcErr) console.error('Transcriptions error:', transcErr)
  else console.log(`Total transcriptions: ${transcCount}`)

  // Bonus: document_chunks count
  console.log('\n--- BONUS: DOCUMENT CHUNKS ---')
  const { count: chunkCount, error: chunkErr } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })
  if (chunkErr) console.error('Document chunks error:', chunkErr)
  else console.log(`Total document_chunks: ${chunkCount}`)
}

main().catch(console.error)
