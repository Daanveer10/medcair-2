-- Migration: Add hospital notifications support
-- This migration updates the notifications table to support both patient and hospital notifications

-- Make patient_id nullable to support hospital notifications
ALTER TABLE notifications 
  ALTER COLUMN patient_id DROP NOT NULL;

-- Add hospital_id column for hospital notifications
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE;

-- Add index for hospital_id
CREATE INDEX IF NOT EXISTS idx_notifications_hospital_id ON notifications(hospital_id);

-- Add index for hospital_id and read status
CREATE INDEX IF NOT EXISTS idx_notifications_hospital_read ON notifications(hospital_id, read);

-- Add check constraint to ensure either patient_id or hospital_id is set
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_recipient_check 
  CHECK (
    (patient_id IS NOT NULL AND hospital_id IS NULL) OR 
    (patient_id IS NULL AND hospital_id IS NOT NULL)
  );

-- Update RLS policies to allow hospitals to view their notifications
DROP POLICY IF EXISTS "Hospitals can view their own notifications" ON notifications;
CREATE POLICY "Hospitals can view their own notifications"
  ON notifications FOR SELECT
  USING (
    hospital_id IS NOT NULL AND
    hospital_id IN (
      SELECT id FROM hospitals WHERE user_id = auth.uid()
    )
  );

-- Allow hospitals to update their notifications (mark as read)
DROP POLICY IF EXISTS "Hospitals can update their own notifications" ON notifications;
CREATE POLICY "Hospitals can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    hospital_id IS NOT NULL AND
    hospital_id IN (
      SELECT id FROM hospitals WHERE user_id = auth.uid()
    )
  );

-- Update comment
COMMENT ON COLUMN notifications.hospital_id IS 'Hospital ID for hospital notifications (nullable, mutually exclusive with patient_id)';
COMMENT ON COLUMN notifications.patient_id IS 'Patient ID for patient notifications (nullable, mutually exclusive with hospital_id)';
