-- Create favorites table for saved clinics
CREATE TABLE IF NOT EXISTS favorite_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, clinic_id)
);

-- Enable RLS for favorites
ALTER TABLE favorite_clinics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorite_clinics
CREATE POLICY "Patients can view their own favorites"
  ON favorite_clinics FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can insert their own favorites"
  ON favorite_clinics FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can delete their own favorites"
  ON favorite_clinics FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_favorite_clinics_patient_id ON favorite_clinics(patient_id);
CREATE INDEX IF NOT EXISTS idx_favorite_clinics_clinic_id ON favorite_clinics(clinic_id);
