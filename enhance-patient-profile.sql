-- Enhance patient profile with additional fields
-- Run this in Supabase SQL Editor

-- Add new columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_number TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create medical history table
CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  diagnosis_date DATE,
  status TEXT CHECK (status IN ('active', 'resolved', 'chronic')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  prescribed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create allergies table
CREATE TABLE IF NOT EXISTS allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  allergen_name TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  reaction_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for new tables
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Medical history policies
CREATE POLICY "Patients can view their own medical history"
  ON medical_history FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can insert their own medical history"
  ON medical_history FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can update their own medical history"
  ON medical_history FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

-- Medications policies
CREATE POLICY "Patients can view their own medications"
  ON medications FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can insert their own medications"
  ON medications FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can update their own medications"
  ON medications FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

-- Allergies policies
CREATE POLICY "Patients can view their own allergies"
  ON allergies FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can insert their own allergies"
  ON allergies FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can update their own allergies"
  ON allergies FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

-- Notifications policies
CREATE POLICY "Patients can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

CREATE POLICY "Patients can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_history_patient_id ON medical_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_id ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(patient_id, read);
