-- Complete RLS Fix for Doctor Viewing
-- Run this in Supabase SQL Editor to fix all policies

-- First, let's check and fix doctors table policy
DROP POLICY IF EXISTS "Anyone can view active doctors" ON doctors;
CREATE POLICY "Anyone can view active doctors"
  ON doctors FOR SELECT
  USING (is_active = TRUE);

-- Fix users table policy for viewing doctor profiles
DROP POLICY IF EXISTS "Anyone can view doctor profiles" ON users;
CREATE POLICY "Anyone can view doctor profiles"
  ON users FOR SELECT
  USING (
    role = 'doctor' OR
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM doctors WHERE doctors.user_id = users.id AND doctors.is_active = true
    )
  );

-- Allow viewing locations
DROP POLICY IF EXISTS "Anyone can view active locations" ON locations;
CREATE POLICY "Anyone can view active locations"
  ON locations FOR SELECT
  USING (is_active = TRUE);

-- Allow viewing all slots (needed for availability display)
DROP POLICY IF EXISTS "Anyone can view available slots" ON doctor_availability_slots;
DROP POLICY IF EXISTS "Anyone can view all slots" ON doctor_availability_slots;
CREATE POLICY "Anyone can view all slots"
  ON doctor_availability_slots FOR SELECT
  USING (true);

-- Allow viewing treatment types
DROP POLICY IF EXISTS "Anyone can view active treatment types" ON treatment_types;
CREATE POLICY "Anyone can view active treatment types"
  ON treatment_types FOR SELECT
  USING (is_active = TRUE);
