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
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to auth user
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL, -- Made optional
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  consultation_fee NUMERIC(10, 2) DEFAULT 0.00,
  experience_years INTEGER DEFAULT 0,
  about TEXT,
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'unavailable', 'break')),
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

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES appointment_slots(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show', 'pending', 'accepted', 'rejected')),
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

-- Create indexes for better query performance
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

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for hospitals
CREATE POLICY "Anyone can view hospitals"
  ON hospitals FOR SELECT
  USING (true);

CREATE POLICY "Hospital owners can manage their hospital"
  ON hospitals FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for clinics
CREATE POLICY "Anyone can view clinics"
  ON clinics FOR SELECT
  USING (true);

CREATE POLICY "Hospital owners can manage clinics"
  ON clinics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = clinics.hospital_id
      AND hospitals.user_id = auth.uid()
    )
  );

-- RLS Policies for doctors
CREATE POLICY "Anyone can view doctors"
  ON doctors FOR SELECT
  USING (true);

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

-- RLS Policies for appointment_slots
CREATE POLICY "Anyone can view available appointment slots"
  ON appointment_slots FOR SELECT
  USING (true);

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

-- RLS Policies for appointments
CREATE POLICY "Patients can view their own appointments"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = appointments.patient_id
      AND user_profiles.user_id = auth.uid()
    )
  );

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

CREATE POLICY "Patients can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = appointments.patient_id
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can update their own appointments"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = appointments.patient_id
      AND user_profiles.user_id = auth.uid()
    )
  );

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

-- RLS Policies for follow_ups
CREATE POLICY "Patients can view their own follow-ups"
  ON follow_ups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = follow_ups.patient_id
      AND user_profiles.user_id = auth.uid()
    )
  );

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
