-- Fix Doctor Visibility Issues
-- 1. Ensure required columns exist
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS doctor_id TEXT,
ADD COLUMN IF NOT EXISTS degree TEXT;

-- 2. Drop existing RLS policies for doctors to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view doctors" ON doctors;
DROP POLICY IF EXISTS "Hospital owners can manage doctors" ON doctors;
DROP POLICY IF EXISTS "Public can view doctors" ON doctors;

-- 3. Re-create RLS policies with correct permissions
-- Allow EVERYONE to view doctors (needed for Patient view)
CREATE POLICY "Public can view doctors"
  ON doctors FOR SELECT
  USING (true);

-- Allow Hospital Owners to manage their own doctors
-- This uses the join through clinics -> hospitals -> user_id
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

-- 4. Verify/Grant permissions explicitly (just in case)
GRANT SELECT ON doctors TO anon, authenticated;
GRANT ALL ON doctors TO authenticated;

-- 5. Fix any potential orphaned doctors (optional/safety)
-- This query just lists them for now, doesn't delete, to avoid data loss
-- SELECT * FROM doctors WHERE clinic_id NOT IN (SELECT id FROM clinics);
