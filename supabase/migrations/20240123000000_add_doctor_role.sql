-- Add 'doctor' to user_profiles role check constraint
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_role_check') THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
  END IF;
END $$;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('patient', 'hospital', 'doctor'));

-- Update doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10, 2);
ALTER TABLE doctors ALTER COLUMN clinic_id DROP NOT NULL;

-- Add unique constraint for one doctor profile per user (Idempotent)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doctors_user_id_key') THEN
    ALTER TABLE doctors ADD CONSTRAINT doctors_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Update notifications table to allow linking to doctors
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE;

-- Update handle_new_user function to handle doctor role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
  user_hospital_id UUID;
  user_specialization TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', (NEW.raw_user_meta_data->'role')::text, 'patient');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', (NEW.raw_user_meta_data->'full_name')::text, 'User');
  -- Clean quotes
  user_role := TRIM(BOTH '"' FROM user_role);
  user_full_name := TRIM(BOTH '"' FROM user_full_name);

  INSERT INTO public.user_profiles (user_id, role, full_name)
  VALUES (NEW.id, user_role, user_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  IF user_role = 'doctor' THEN
    user_hospital_id := (NEW.raw_user_meta_data->>'hospital_id')::UUID;
    user_specialization := COALESCE(NEW.raw_user_meta_data->>'specialization', 'General');
    
    IF user_hospital_id IS NOT NULL THEN
        INSERT INTO public.doctors (user_id, hospital_id, name, specialization)
        VALUES (NEW.id, user_hospital_id, user_full_name, user_specialization);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER function to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.check_user_profile_access(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user owns the profile
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = profile_id AND user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if the current user is a doctor who has an appointment with this patient
  IF EXISTS (
    SELECT 1 FROM appointments
    JOIN doctors ON doctors.id = appointments.doctor_id
    WHERE appointments.patient_id = profile_id AND doctors.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
-- Helper to drop policy if exists (Idempotent creation)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctors' AND policyname = 'Doctors can view their own profile') THEN
    CREATE POLICY "Doctors can view their own profile" ON doctors FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctors' AND policyname = 'Doctors can update their own profile') THEN
    CREATE POLICY "Doctors can update their own profile" ON doctors FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "Doctors can view their own appointments" ON appointments;
CREATE POLICY "Doctors can view their own appointments" ON appointments FOR SELECT USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid()));

DROP POLICY IF EXISTS "Doctors can update their own appointments" ON appointments;
CREATE POLICY "Doctors can update their own appointments" ON appointments FOR UPDATE USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid()));

DROP POLICY IF EXISTS "Doctors can view patient profiles assigned to them" ON user_profiles;
CREATE POLICY "Doctors can view patient profiles assigned to them" ON user_profiles FOR SELECT USING (check_user_profile_access(id));
