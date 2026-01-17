-- Add doctor_id and degree columns to doctors table
-- Migration: 20240102000000_add_doctor_fields.sql

ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS doctor_id TEXT,
ADD COLUMN IF NOT EXISTS degree TEXT;

-- Create index on doctor_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctors_doctor_id ON doctors(doctor_id) WHERE doctor_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN doctors.doctor_id IS 'License ID or unique identifier for the doctor';
COMMENT ON COLUMN doctors.degree IS 'Medical degree (e.g., MD, MBBS, etc.)';
