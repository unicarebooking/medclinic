-- Transcriptions table for storing medical consultation transcriptions
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  patient_id UUID REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id),
  original_filename TEXT NOT NULL,
  transcription_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transcriptions_doctor_id ON transcriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_patient_id ON transcriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);

-- RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Doctors can view their own transcriptions
CREATE POLICY "Doctors can view their transcriptions"
  ON transcriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors WHERE doctors.id = transcriptions.doctor_id AND doctors.user_id = auth.uid()
    )
  );

-- Doctors can create transcriptions
CREATE POLICY "Doctors can create transcriptions"
  ON transcriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM doctors WHERE doctors.id = transcriptions.doctor_id AND doctors.user_id = auth.uid()
    )
  );

-- Doctors can update their transcriptions
CREATE POLICY "Doctors can update their transcriptions"
  ON transcriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM doctors WHERE doctors.id = transcriptions.doctor_id AND doctors.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_transcriptions_updated_at
  BEFORE UPDATE ON transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
