-- MedClinic Database Schema
-- Multi-doctor clinic management system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Doctors table (for doctor-specific information)
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialization TEXT NOT NULL,
  bio TEXT,
  license_number TEXT NOT NULL UNIQUE,
  years_of_experience INTEGER DEFAULT 0,
  consultation_fee DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Locations table (10 cities)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Treatment types per doctor
CREATE TABLE treatment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  price DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Doctor availability slots
CREATE TABLE doctor_availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  slot_datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  is_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doctor_id, slot_datetime)  -- Prevent double-booking
);

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL UNIQUE REFERENCES doctor_availability_slots(id) ON DELETE CASCADE,
  treatment_type_id UUID REFERENCES treatment_types(id) ON DELETE SET NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Treatment summaries with full-text search
CREATE TABLE treatment_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diagnosis TEXT NOT NULL,
  treatment_notes TEXT NOT NULL,
  prescription TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create full-text search index
CREATE INDEX treatment_summaries_search_idx ON treatment_summaries USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_treatment_summary_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.diagnosis, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.treatment_notes, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.prescription, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic search vector update
CREATE TRIGGER treatment_summaries_search_vector_update
  BEFORE INSERT OR UPDATE ON treatment_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_treatment_summary_search_vector();

-- Support tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Function to search treatment summaries
CREATE OR REPLACE FUNCTION search_treatment_summaries(
  search_query TEXT,
  doctor_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  diagnosis TEXT,
  treatment_notes TEXT,
  patient_name TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id,
    ts.diagnosis,
    ts.treatment_notes,
    u.full_name AS patient_name,
    ts.created_at,
    ts_rank(ts.search_vector, plainto_tsquery('simple', search_query)) AS rank
  FROM treatment_summaries ts
  JOIN users u ON ts.patient_id = u.id
  WHERE
    ts.search_vector @@ plainto_tsquery('simple', search_query)
    AND (doctor_filter IS NULL OR ts.doctor_id = doctor_filter)
  ORDER BY rank DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_summaries_updated_at
  BEFORE UPDATE ON treatment_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update all users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Doctors policies (publicly viewable)
CREATE POLICY "Anyone can view active doctors"
  ON doctors FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Doctors can update their own profile"
  ON doctors FOR UPDATE
  USING (user_id = auth.uid());

-- Locations policies (publicly viewable)
CREATE POLICY "Anyone can view active locations"
  ON locations FOR SELECT
  USING (is_active = TRUE);

-- Treatment types policies (publicly viewable)
CREATE POLICY "Anyone can view active treatment types"
  ON treatment_types FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Doctors can manage their treatment types"
  ON treatment_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM doctors WHERE id = treatment_types.doctor_id AND user_id = auth.uid()
    )
  );

-- Availability slots policies
CREATE POLICY "Anyone can view available slots"
  ON doctor_availability_slots FOR SELECT
  USING (is_booked = FALSE);

CREATE POLICY "Doctors can manage their availability"
  ON doctor_availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM doctors WHERE id = doctor_availability_slots.doctor_id AND user_id = auth.uid()
    )
  );

-- Appointments policies
CREATE POLICY "Patients can view their own appointments"
  ON appointments FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can view their appointments"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors WHERE id = appointments.doctor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can update their appointments"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM doctors WHERE id = appointments.doctor_id AND user_id = auth.uid()
    )
  );

-- Treatment summaries policies
CREATE POLICY "Patients can view their own summaries"
  ON treatment_summaries FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view and manage their summaries"
  ON treatment_summaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM doctors WHERE id = treatment_summaries.doctor_id AND user_id = auth.uid()
    )
  );

-- Tickets policies
CREATE POLICY "Users can view their own tickets"
  ON tickets FOR SELECT
  USING (user_id = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage all tickets"
  ON tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_treatment_types_doctor_id ON treatment_types(doctor_id);
CREATE INDEX idx_availability_slots_doctor_id ON doctor_availability_slots(doctor_id);
CREATE INDEX idx_availability_slots_datetime ON doctor_availability_slots(slot_datetime);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_treatment_summaries_doctor_id ON treatment_summaries(doctor_id);
CREATE INDEX idx_treatment_summaries_patient_id ON treatment_summaries(patient_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);
