-- ============================================================================
-- Pipeline Fix Migration
-- Adds missing columns and relaxes constraints for the hospital→doctor→patient flow
-- ============================================================================

-- 1. Add availability_status to doctors (referenced in code but missing from schema)
ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available'
CHECK (availability_status IN ('available', 'unavailable', 'on_leave'));

-- 2. Make appointments.clinic_id nullable
-- Some doctors are linked directly to hospitals (via hospital_id), not through clinics.
-- Booking flow needs to work even if no clinic is assigned.
ALTER TABLE public.appointments ALTER COLUMN clinic_id DROP NOT NULL;
