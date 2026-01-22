-- Migration: Doctor-Centric Changes

-- 1. Updates to Doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'unavailable', 'break'));

-- Make clinic_id optional (nullable)
ALTER TABLE doctors ALTER COLUMN clinic_id DROP NOT NULL;

-- 2. Updates to Appointments table status
-- Drop existing constraint if possible, or just add a new check. 
-- Supabase/Postgres doesn't allow easy modification of check constraints, so we drop and re-add.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show', 'pending', 'accepted', 'rejected'));

-- 3. Create Notifications/Messages table for real-time alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment_request', 'appointment_status', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_id UUID, -- e.g., appointment_id
  entity_type TEXT, -- 'appointment'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM user_profiles WHERE id = notifications.recipient_id));

-- 4. Update RLS policies for Doctors to involve Hospital ownership directly
CREATE POLICY "Hospital owners can manage doctors linked to their hospital"
  ON doctors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = doctors.hospital_id
      AND hospitals.user_id = auth.uid()
    )
  );
