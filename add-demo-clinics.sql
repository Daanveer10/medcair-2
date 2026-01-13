-- Add Demo Clinics and Hospitals
-- Run this in your Supabase SQL Editor to populate demo data
-- 
-- IMPORTANT: Before running this script:
-- 1. Create at least one hospital user account (sign up as "hospital" role)
-- 2. Get the user_id from auth.users table
-- 3. Replace the user_id references below, OR
-- 4. The script will try to find a user with 'hospital' in their email

-- Step 1: Create demo hospitals
-- If you have a hospital user, replace the SELECT below with the actual user_id
-- Example: '00000000-0000-0000-0000-000000000000'::uuid

DO $$
DECLARE
  hospital_user_id UUID;
BEGIN
  -- Try to find a hospital user
  SELECT id INTO hospital_user_id
  FROM auth.users u
  JOIN user_profiles p ON p.user_id = u.id
  WHERE p.role = 'hospital'
  LIMIT 1;
  
  -- If no hospital user found, you'll need to create one first
  IF hospital_user_id IS NULL THEN
    RAISE NOTICE 'No hospital user found. Please create a hospital account first, then update the user_id in this script.';
    RETURN;
  END IF;
  
  -- Insert demo hospitals
  INSERT INTO hospitals (user_id, name, address, city, state, zip_code, phone, email, description)
  VALUES
    (
      hospital_user_id,
      'City General Hospital',
      '123 Medical Center Drive',
      'New York',
      'NY',
      '10001',
      '+1-555-0101',
      'info@citygeneral.com',
      'A leading healthcare facility providing comprehensive medical services'
    ),
    (
      hospital_user_id,
      'Metro Health Center',
      '456 Healthcare Boulevard',
      'Los Angeles',
      'CA',
      '90001',
      '+1-555-0102',
      'contact@metrohealth.com',
      'State-of-the-art medical center serving the community'
    ),
    (
      hospital_user_id,
      'Regional Medical Institute',
      '789 Wellness Avenue',
      'Chicago',
      'IL',
      '60601',
      '+1-555-0103',
      'info@regionalmed.com',
      'Comprehensive healthcare services with expert medical professionals'
    )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Hospitals created successfully';
END $$;

-- Step 2: Get hospital IDs (adjust based on your actual hospital IDs)
-- You can check with: SELECT id, name FROM hospitals;

-- Step 3: Insert demo clinics
-- Replace hospital_id values with actual IDs from your hospitals table
INSERT INTO clinics (hospital_id, name, department, specialties, description)
SELECT 
  h.id,
  clinic_data.name,
  clinic_data.department,
  clinic_data.specialties,
  clinic_data.description
FROM hospitals h
CROSS JOIN (VALUES
  ('Cardiology Center', 'Cardiology', ARRAY['Heart Disease', 'Hypertension', 'Arrhythmia', 'Cardiac Surgery'], 'Expert cardiac care and treatment'),
  ('Neurology Department', 'Neurology', ARRAY['Epilepsy', 'Migraine', 'Parkinson''s Disease', 'Stroke'], 'Advanced neurological diagnosis and treatment'),
  ('Orthopedics Clinic', 'Orthopedics', ARRAY['Joint Replacement', 'Sports Medicine', 'Fracture Care', 'Spine Surgery'], 'Comprehensive orthopedic services'),
  ('Pediatrics Unit', 'Pediatrics', ARRAY['Child Development', 'Vaccinations', 'Childhood Diseases', 'Newborn Care'], 'Specialized care for children'),
  ('Dermatology Center', 'Dermatology', ARRAY['Acne Treatment', 'Skin Cancer', 'Eczema', 'Psoriasis'], 'Expert skin care and treatment'),
  ('Oncology Department', 'Oncology', ARRAY['Cancer Treatment', 'Chemotherapy', 'Radiation Therapy', 'Cancer Screening'], 'Comprehensive cancer care'),
  ('Endocrinology Clinic', 'Endocrinology', ARRAY['Diabetes', 'Thyroid Disorders', 'Hormone Therapy', 'Metabolic Disorders'], 'Specialized endocrine care'),
  ('Gastroenterology Unit', 'Gastroenterology', ARRAY['Digestive Disorders', 'Liver Disease', 'IBD', 'Endoscopy'], 'Expert digestive health care'),
  ('Pulmonology Center', 'Pulmonology', ARRAY['Asthma', 'COPD', 'Lung Cancer', 'Sleep Apnea'], 'Respiratory health specialists'),
  ('Rheumatology Department', 'Rheumatology', ARRAY['Arthritis', 'Autoimmune Diseases', 'Joint Pain', 'Lupus'], 'Rheumatic disease management')
) AS clinic_data(name, department, specialties, description)
WHERE h.name IN ('City General Hospital', 'Metro Health Center', 'Regional Medical Institute')
ON CONFLICT DO NOTHING;

-- Step 4: Insert demo doctors
INSERT INTO doctors (clinic_id, name, specialization, email, phone)
SELECT 
  c.id,
  doctor_data.name,
  doctor_data.specialization,
  doctor_data.email,
  doctor_data.phone
FROM clinics c
CROSS JOIN (VALUES
  ('Dr. Sarah Johnson', 'Cardiologist', 'sarah.johnson@hospital.com', '+1-555-1001'),
  ('Dr. Michael Chen', 'Neurologist', 'michael.chen@hospital.com', '+1-555-1002'),
  ('Dr. Emily Rodriguez', 'Orthopedic Surgeon', 'emily.rodriguez@hospital.com', '+1-555-1003'),
  ('Dr. James Wilson', 'Pediatrician', 'james.wilson@hospital.com', '+1-555-1004'),
  ('Dr. Lisa Anderson', 'Dermatologist', 'lisa.anderson@hospital.com', '+1-555-1005'),
  ('Dr. Robert Taylor', 'Oncologist', 'robert.taylor@hospital.com', '+1-555-1006'),
  ('Dr. Maria Garcia', 'Endocrinologist', 'maria.garcia@hospital.com', '+1-555-1007'),
  ('Dr. David Brown', 'Gastroenterologist', 'david.brown@hospital.com', '+1-555-1008'),
  ('Dr. Jennifer Lee', 'Pulmonologist', 'jennifer.lee@hospital.com', '+1-555-1009'),
  ('Dr. Christopher Martinez', 'Rheumatologist', 'christopher.martinez@hospital.com', '+1-555-1010')
) AS doctor_data(name, specialization, email, phone)
WHERE c.department = 
  CASE doctor_data.specialization
    WHEN 'Cardiologist' THEN 'Cardiology'
    WHEN 'Neurologist' THEN 'Neurology'
    WHEN 'Orthopedic Surgeon' THEN 'Orthopedics'
    WHEN 'Pediatrician' THEN 'Pediatrics'
    WHEN 'Dermatologist' THEN 'Dermatology'
    WHEN 'Oncologist' THEN 'Oncology'
    WHEN 'Endocrinologist' THEN 'Endocrinology'
    WHEN 'Gastroenterologist' THEN 'Gastroenterology'
    WHEN 'Pulmonologist' THEN 'Pulmonology'
    WHEN 'Rheumatologist' THEN 'Rheumatology'
  END
ON CONFLICT DO NOTHING;

-- Step 5: Create demo appointment slots for the next 7 days
-- This creates slots for each doctor, every day for the next week
INSERT INTO appointment_slots (clinic_id, doctor_id, date, start_time, end_time, is_available)
SELECT 
  c.id,
  d.id,
  date_slot.date,
  time_slot.start_time,
  time_slot.end_time,
  true
FROM clinics c
INNER JOIN doctors d ON d.clinic_id = c.id
CROSS JOIN (
  SELECT CURRENT_DATE + (n || ' days')::interval as date
  FROM generate_series(0, 6) n
) date_slot
CROSS JOIN (VALUES
  ('09:00:00', '09:30:00'),
  ('09:30:00', '10:00:00'),
  ('10:00:00', '10:30:00'),
  ('10:30:00', '11:00:00'),
  ('11:00:00', '11:30:00'),
  ('14:00:00', '14:30:00'),
  ('14:30:00', '15:00:00'),
  ('15:00:00', '15:30:00'),
  ('15:30:00', '16:00:00'),
  ('16:00:00', '16:30:00')
) AS time_slot(start_time, end_time)
WHERE c.name IN (
  SELECT name FROM (VALUES
    ('Cardiology Center'),
    ('Neurology Department'),
    ('Orthopedics Clinic'),
    ('Pediatrics Unit'),
    ('Dermatology Center')
  ) AS clinic_names(name)
)
ON CONFLICT DO NOTHING;

-- Verification queries
-- Check hospitals
SELECT 'Hospitals created:' as info, COUNT(*) as count FROM hospitals;

-- Check clinics
SELECT 'Clinics created:' as info, COUNT(*) as count FROM clinics;

-- Check doctors
SELECT 'Doctors created:' as info, COUNT(*) as count FROM doctors;

-- Check appointment slots
SELECT 'Appointment slots created:' as info, COUNT(*) as count FROM appointment_slots;

-- View all clinics with their hospitals
SELECT 
  c.name as clinic_name,
  c.department,
  h.name as hospital_name,
  h.city,
  array_length(c.specialties, 1) as specialty_count
FROM clinics c
JOIN hospitals h ON h.id = c.hospital_id
ORDER BY h.name, c.name;
