-- ============================================================================
-- Phase 1 Features Migration
-- Enhanced Profiles, Reviews & Ratings, Advanced Filters Support
-- ============================================================================

-- ============================================================================
-- 1. ENHANCED PROFILES - Add photos, services, fees, credentials
-- ============================================================================

-- Add photo URL column to clinics
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT '{}';

-- Add photo URL, credentials to doctors
ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS credentials TEXT[] DEFAULT '{}', -- e.g., ['MBBS', 'MD', 'FACP']
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT '{}'; -- e.g., ['English', 'Hindi', 'Spanish']

-- Add photo URL and additional info to hospitals
ALTER TABLE public.hospitals
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- ============================================================================
-- 2. REVIEWS & RATINGS SYSTEM
-- ============================================================================

-- Clinic Reviews Table
CREATE TABLE IF NOT EXISTS clinic_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL, -- Optional: link to specific appointment
  is_verified BOOLEAN DEFAULT FALSE, -- True if review is from an actual appointment
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, patient_id, appointment_id) -- One review per appointment
);

-- Doctor Reviews Table
CREATE TABLE IF NOT EXISTS doctor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(doctor_id, patient_id, appointment_id)
);

-- Hospital Responses to Reviews
CREATE TABLE IF NOT EXISTS review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('clinic', 'doctor')),
  hospital_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. ADVANCED FILTERS SUPPORT - Insurance, Payment Methods
-- ============================================================================

-- Insurance providers accepted by clinic
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS insurance_providers TEXT[] DEFAULT '{}'; -- e.g., ['Aetna', 'Blue Cross', 'Medicare']

-- Payment methods accepted by clinic
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT '{}'; -- e.g., ['Cash', 'Credit Card', 'Insurance', 'UPI']

-- ============================================================================
-- 4. IN-APP MESSAGING SYSTEM
-- ============================================================================

-- Messages Table (for patient-hospital communication)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL, -- Optional: link to appointment
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL, -- For context
  subject TEXT,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  attachment_url TEXT, -- For prescription images, reports, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Threads (to group related messages)
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, hospital_id, appointment_id)
);

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_clinic_reviews_clinic_id ON clinic_reviews(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_reviews_patient_id ON clinic_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinic_reviews_rating ON clinic_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_patient_id ON doctor_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_rating ON doctor_reviews(rating);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_appointment_id ON messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_threads_patient_id ON message_threads(patient_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_hospital_id ON message_threads(hospital_id);

-- ============================================================================
-- 6. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE clinic_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Clinic Reviews Policies
CREATE POLICY "Anyone can view clinic reviews"
  ON clinic_reviews FOR SELECT
  USING (true);

CREATE POLICY "Patients can insert their own clinic reviews"
  ON clinic_reviews FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = patient_id AND role = 'patient'
    )
  );

CREATE POLICY "Patients can update their own clinic reviews"
  ON clinic_reviews FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = patient_id AND role = 'patient'
    )
  );

-- Doctor Reviews Policies
CREATE POLICY "Anyone can view doctor reviews"
  ON doctor_reviews FOR SELECT
  USING (true);

CREATE POLICY "Patients can insert their own doctor reviews"
  ON doctor_reviews FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = patient_id AND role = 'patient'
    )
  );

CREATE POLICY "Patients can update their own doctor reviews"
  ON doctor_reviews FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = patient_id AND role = 'patient'
    )
  );

-- Review Response Policies
CREATE POLICY "Anyone can view review responses"
  ON review_responses FOR SELECT
  USING (true);

CREATE POLICY "Hospital users can insert review responses"
  ON review_responses FOR INSERT
  WITH CHECK (
    auth.uid() = hospital_user_id AND
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE role = 'hospital'
    )
  );

CREATE POLICY "Hospital users can update their own review responses"
  ON review_responses FOR UPDATE
  USING (auth.uid() = hospital_user_id);

-- Messages Policies
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own received messages (mark as read)"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Message Threads Policies
CREATE POLICY "Users can view their own message threads"
  ON message_threads FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = patient_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM hospitals WHERE id = hospital_id
    )
  );

CREATE POLICY "Threads are created automatically via triggers"
  ON message_threads FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 7. HELPER FUNCTIONS FOR AVERAGE RATINGS
-- ============================================================================

-- Function to get clinic average rating
CREATE OR REPLACE FUNCTION get_clinic_avg_rating(clinic_uuid UUID)
RETURNS DECIMAL(3, 2) AS $$
  SELECT COALESCE(AVG(rating)::DECIMAL(3, 2), 0.00)
  FROM clinic_reviews
  WHERE clinic_id = clinic_uuid;
$$ LANGUAGE SQL STABLE;

-- Function to get doctor average rating
CREATE OR REPLACE FUNCTION get_doctor_avg_rating(doctor_uuid UUID)
RETURNS DECIMAL(3, 2) AS $$
  SELECT COALESCE(AVG(rating)::DECIMAL(3, 2), 0.00)
  FROM doctor_reviews
  WHERE doctor_id = doctor_uuid;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 8. UPDATED_AT TRIGGERS
-- ============================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_clinic_reviews_updated_at
  BEFORE UPDATE ON clinic_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_reviews_updated_at
  BEFORE UPDATE ON doctor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_responses_updated_at
  BEFORE UPDATE ON review_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();