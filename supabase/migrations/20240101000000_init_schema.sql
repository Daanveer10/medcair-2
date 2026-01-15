-- ============================================================================
-- MedCair Production Schema Migration
-- ============================================================================
-- This migration creates the complete database schema for MedCair.
-- Run this migration using: supabase migration up
-- Or in Supabase Dashboard: SQL Editor -> Run this file
-- ============================================================================

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'hospital')),
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinics Table
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  specialties TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointment Slots Table
CREATE TABLE IF NOT EXISTS appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments Table (with pending/accepted/declined statuses)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES appointment_slots(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'scheduled', 'completed', 'cancelled', 'no_show')),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-ups Table
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  follow_up_date DATE NOT NULL,
  follow_up_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorite Clinics Table
CREATE TABLE IF NOT EXISTS favorite_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, clinic_id)
);

-- Notifications Table
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

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_hospitals_user_id ON hospitals(user_id);
CREATE INDEX IF NOT EXISTS idx_clinics_hospital_id ON clinics(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_clinic_id ON appointment_slots(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_date ON appointment_slots(date);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_available ON appointment_slots(is_available);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_appointment_id ON follow_ups(appointment_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient_id ON follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_favorite_clinics_patient_id ON favorite_clinics(patient_id);
CREATE INDEX IF NOT EXISTS idx_favorite_clinics_clinic_id ON favorite_clinics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_id ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(patient_id, read);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Hospitals Policies
DROP POLICY IF EXISTS "Anyone can view hospitals" ON hospitals;
CREATE POLICY "Anyone can view hospitals"
  ON hospitals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Hospital owners can manage their hospital" ON hospitals;
CREATE POLICY "Hospital owners can manage their hospital"
  ON hospitals FOR ALL
  USING (auth.uid() = user_id);

-- Clinics Policies
DROP POLICY IF EXISTS "Anyone can view clinics" ON clinics;
CREATE POLICY "Anyone can view clinics"
  ON clinics FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Hospital owners can manage clinics" ON clinics;
CREATE POLICY "Hospital owners can manage clinics"
  ON clinics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = clinics.hospital_id
      AND hospitals.user_id = auth.uid()
    )
  );

-- Doctors Policies
DROP POLICY IF EXISTS "Anyone can view doctors" ON doctors;
CREATE POLICY "Anyone can view doctors"
  ON doctors FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Hospital owners can manage doctors" ON doctors;
CREATE POLICY "Hospital owners can manage doctors"
  ON doctors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      JOIN hospitals ON hospitals.id = clinics.hospital_id
      WHERE clinics.id = doctors.clinic_id
      AND hospitals.user_id = auth.uid()
    )
  );

-- Appointment Slots Policies
DROP POLICY IF EXISTS "Anyone can view available appointment slots" ON appointment_slots;
CREATE POLICY "Anyone can view available appointment slots"
  ON appointment_slots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Hospital owners can manage appointment slots" ON appointment_slots;
CREATE POLICY "Hospital owners can manage appointment slots"
  ON appointment_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      JOIN hospitals ON hospitals.id = clinics.hospital_id
      WHERE clinics.id = appointment_slots.clinic_id
      AND hospitals.user_id = auth.uid()
    )
  );

-- Appointments Policies
DROP POLICY IF EXISTS "Patients can view their own appointments" ON appointments;
CREATE POLICY "Patients can view their own appointments"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = appointments.patient_id
      AND user_profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hospital owners can view appointments for their clinics" ON appointments;
CREATE POLICY "Hospital owners can view appointments for their clinics"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      JOIN hospitals ON hospitals.id = clinics.hospital_id
      WHERE clinics.id = appointments.clinic_id
      AND hospitals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;
CREATE POLICY "Patients can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = appointments.patient_id
      AND user_profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Patients can update their own appointments" ON appointments;
CREATE POLICY "Patients can update their own appointments"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = appointments.patient_id
      AND user_profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hospital owners can update appointments" ON appointments;
CREATE POLICY "Hospital owners can update appointments"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      JOIN hospitals ON hospitals.id = clinics.hospital_id
      WHERE clinics.id = appointments.clinic_id
      AND hospitals.user_id = auth.uid()
    )
  );

-- Follow-ups Policies
DROP POLICY IF EXISTS "Patients can view their own follow-ups" ON follow_ups;
CREATE POLICY "Patients can view their own follow-ups"
  ON follow_ups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = follow_ups.patient_id
      AND user_profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hospital owners can view follow-ups for their clinics" ON follow_ups;
CREATE POLICY "Hospital owners can view follow-ups for their clinics"
  ON follow_ups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      JOIN hospitals ON hospitals.id = clinics.hospital_id
      WHERE clinics.id = follow_ups.clinic_id
      AND hospitals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hospital owners can manage follow-ups" ON follow_ups;
CREATE POLICY "Hospital owners can manage follow-ups"
  ON follow_ups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      JOIN hospitals ON hospitals.id = clinics.hospital_id
      WHERE clinics.id = follow_ups.clinic_id
      AND hospitals.user_id = auth.uid()
    )
  );

-- Favorite Clinics Policies
DROP POLICY IF EXISTS "Patients can view their own favorites" ON favorite_clinics;
CREATE POLICY "Patients can view their own favorites"
  ON favorite_clinics FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

DROP POLICY IF EXISTS "Patients can insert their own favorites" ON favorite_clinics;
CREATE POLICY "Patients can insert their own favorites"
  ON favorite_clinics FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

DROP POLICY IF EXISTS "Patients can delete their own favorites" ON favorite_clinics;
CREATE POLICY "Patients can delete their own favorites"
  ON favorite_clinics FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

-- Notifications Policies
DROP POLICY IF EXISTS "Patients can view their own notifications" ON notifications;
CREATE POLICY "Patients can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

DROP POLICY IF EXISTS "Patients can update their own notifications" ON notifications;
CREATE POLICY "Patients can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = patient_id));

-- ============================================================================
-- 5. DATABASE TRIGGERS
-- ============================================================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
BEGIN
  -- Extract metadata (handle both JSONB and text formats)
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    (NEW.raw_user_meta_data->'role')::text,
    'patient'
  );
  
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->'full_name')::text,
    'User'
  );
  
  -- Remove quotes if present (JSONB sometimes returns quoted strings)
  user_role := TRIM(BOTH '"' FROM user_role);
  user_full_name := TRIM(BOTH '"' FROM user_full_name);
  
  -- Insert the profile
  INSERT INTO public.user_profiles (user_id, role, full_name)
  VALUES (NEW.id, user_role, user_full_name)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if profile already exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN appointments.status IS 
'pending: Patient requested, waiting for hospital approval
accepted: Hospital approved, appointment is confirmed (same as scheduled)
declined: Hospital declined the appointment request
scheduled: Appointment is confirmed (legacy, use accepted instead)
completed: Appointment was completed
cancelled: Appointment was cancelled
no_show: Patient did not show up';

COMMENT ON TABLE user_profiles IS 'User profile information linked to auth.users';
COMMENT ON TABLE hospitals IS 'Hospital information and settings';
COMMENT ON TABLE clinics IS 'Clinic/department information within hospitals';
COMMENT ON TABLE appointments IS 'Patient appointments with status tracking';
COMMENT ON TABLE favorite_clinics IS 'Patient saved/favorite clinics';
COMMENT ON TABLE notifications IS 'In-app notifications for patients';
