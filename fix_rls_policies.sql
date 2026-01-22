-- Fix RLS Policies for Clinics and Doctors tables to ensure visibility in Dashboard

-- 1. CLINICS TABLE POLICIES
-- Enable RLS just in case
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Allow hospital owners to ALL (select, insert, update, delete) their own clinics
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

-- Allow everyone to SELECT clinics (needed for patient booking flow)
DROP POLICY IF EXISTS "Public can view clinics" ON clinics;
CREATE POLICY "Public can view clinics"
ON clinics FOR SELECT
USING (true);


-- 2. DOCTORS TABLE POLICIES
-- Enable RLS just in case
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- Allow hospital owners to ALL (select, insert, update, delete) their own doctors
-- Validates ownership via the chain: Doctos -> Clinics -> Hospitals -> User
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

-- Allow everyone to SELECT doctors (needed for patient booking flow)
DROP POLICY IF EXISTS "Public can view doctors" ON doctors;
CREATE POLICY "Public can view doctors"
ON doctors FOR SELECT
USING (true);

-- 3. GRANT PERMISSIONS (Safety measure)
GRANT SELECT, INSERT, UPDATE, DELETE ON clinics TO authenticated;
GRANT SELECT ON clinics TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON doctors TO authenticated;
GRANT SELECT ON doctors TO anon;
