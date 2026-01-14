-- Update appointments table to support pending, accepted, declined statuses
-- This allows hospitals to accept or decline appointment requests

-- First, update the status constraint to include new statuses
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'accepted', 'declined', 'scheduled', 'completed', 'cancelled', 'no_show'));

-- Update default status to 'pending' for new appointments
ALTER TABLE appointments 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add a comment to explain the status flow
COMMENT ON COLUMN appointments.status IS 
'pending: Patient requested, waiting for hospital approval
accepted: Hospital approved, appointment is confirmed (same as scheduled)
declined: Hospital declined the appointment request
scheduled: Appointment is confirmed (legacy, use accepted instead)
completed: Appointment was completed
cancelled: Appointment was cancelled
no_show: Patient did not show up';
