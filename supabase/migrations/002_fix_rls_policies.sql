-- Fix RLS Policies for public doctor viewing
-- Run this in Supabase SQL Editor

-- Allow anyone to view basic info of users who are doctors
CREATE POLICY "Anyone can view doctor profiles"
  ON users FOR SELECT
  USING (
    role = 'doctor' OR
    EXISTS (
      SELECT 1 FROM doctors WHERE doctors.user_id = users.id AND doctors.is_active = true
    )
  );

-- Allow viewing booked slots (needed for appointment display)
DROP POLICY IF EXISTS "Anyone can view available slots" ON doctor_availability_slots;

CREATE POLICY "Anyone can view all slots"
  ON doctor_availability_slots FOR SELECT
  USING (true);

-- Allow patients to update their appointments (for cancellation)
CREATE POLICY "Patients can update their own appointments"
  ON appointments FOR UPDATE
  USING (patient_id = auth.uid());

-- Allow doctors to view patient info for their appointments
CREATE POLICY "Doctors can view their patients info"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = users.id
      AND d.user_id = auth.uid()
    )
  );
