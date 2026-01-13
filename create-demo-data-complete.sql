-- Complete Demo Data Creation Script
-- This script creates everything needed for demo data
-- Run this ENTIRE script in Supabase SQL Editor

-- IMPORTANT: You need a hospital user first!
-- If you don't have one, sign up in your app as "hospital" role, then run this script

-- ============================================
-- STEP 1: Check if hospital user exists
-- ============================================
DO $$
DECLARE
  hospital_user_id UUID;
  hospital_count INTEGER;
BEGIN
  -- Find hospital user
  SELECT u.id INTO hospital_user_id
  FROM auth.users u
  JOIN user_profiles p ON p.user_id = u.id
  WHERE p.role = 'hospital'
  LIMIT 1;
  
  -- Check if hospitals already exist
  SELECT COUNT(*) INTO hospital_count FROM hospitals;
  
  IF hospital_user_id IS NULL THEN
    RAISE EXCEPTION 'No hospital user found! Please sign up as a hospital user first, then run this script.';
  END IF;
  
  RAISE NOTICE 'Found hospital user: %', hospital_user_id;
  RAISE NOTICE 'Existing hospitals: %', hospital_count;
END $$;

-- ============================================
-- STEP 2: Create Hospitals (with RLS bypass)
-- ============================================
-- Temporarily disable RLS for hospitals
ALTER TABLE hospitals DISABLE ROW LEVEL SECURITY;

INSERT INTO hospitals (user_id, name, address, city, state, zip_code, phone, email, description)
SELECT 
  u.id,
  hospital_data.name,
  hospital_data.address,
  hospital_data.city,
  hospital_data.state,
  hospital_data.zip_code,
  hospital_data.phone,
  hospital_data.email,
  hospital_data.description
FROM auth.users u
JOIN user_profiles p ON p.user_id = u.id
CROSS JOIN (VALUES
  ('City General Hospital', '123 Medical Center Drive', 'New York', 'NY', '10001', '+1-555-0101', 'info@citygeneral.com', 'A leading healthcare facility providing comprehensive medical services'),
  ('Metro Health Center', '456 Healthcare Boulevard', 'Los Angeles', 'CA', '90001', '+1-555-0102', 'contact@metrohealth.com', 'State-of-the-art medical center serving the community'),
  ('Regional Medical Institute', '789 Wellness Avenue', 'Chicago', 'IL', '60601', '+1-555-0103', 'info@regionalmed.com', 'Comprehensive healthcare services with expert medical professionals')
) AS hospital_data(name, address, city, state, zip_code, phone, email, description)
WHERE p.role = 'hospital'
ON CONFLICT DO NOTHING;

-- Re-enable RLS
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create Clinics (with RLS bypass)
-- ============================================
ALTER TABLE clinics DISABLE ROW LEVEL SECURITY;

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
ON CONFLICT DO NOTHING;

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create Doctors (with RLS bypass)
-- ============================================
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;

INSERT INTO doctors (clinic_id, name, specialization, email, phone)
SELECT 
  c.id,
  doctor_data.name,
  doctor_data.specialization,
  doctor_data.email,
  doctor_data.phone
FROM clinics c
CROSS JOIN (VALUES
  ('Dr. Sarah Johnson', 'Cardiologist', 'sarah.johnson@hospital.com', '+1-555-1001', 'Cardiology'),
  ('Dr. Michael Chen', 'Neurologist', 'michael.chen@hospital.com', '+1-555-1002', 'Neurology'),
  ('Dr. Emily Rodriguez', 'Orthopedic Surgeon', 'emily.rodriguez@hospital.com', '+1-555-1003', 'Orthopedics'),
  ('Dr. James Wilson', 'Pediatrician', 'james.wilson@hospital.com', '+1-555-1004', 'Pediatrics'),
  ('Dr. Lisa Anderson', 'Dermatologist', 'lisa.anderson@hospital.com', '+1-555-1005', 'Dermatology'),
  ('Dr. Robert Taylor', 'Oncologist', 'robert.taylor@hospital.com', '+1-555-1006', 'Oncology'),
  ('Dr. Maria Garcia', 'Endocrinologist', 'maria.garcia@hospital.com', '+1-555-1007', 'Endocrinology'),
  ('Dr. David Brown', 'Gastroenterologist', 'david.brown@hospital.com', '+1-555-1008', 'Gastroenterology'),
  ('Dr. Jennifer Lee', 'Pulmonologist', 'jennifer.lee@hospital.com', '+1-555-1009', 'Pulmonology'),
  ('Dr. Christopher Martinez', 'Rheumatologist', 'christopher.martinez@hospital.com', '+1-555-1010', 'Rheumatology')
) AS doctor_data(name, specialization, email, phone, department)
WHERE c.department = doctor_data.department;

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create Appointment Slots (with RLS bypass)
-- ============================================
ALTER TABLE appointment_slots DISABLE ROW LEVEL SECURITY;

INSERT INTO appointment_slots (clinic_id, doctor_id, date, start_time, end_time, is_available)
SELECT 
  c.id,
  d.id,
  date_slot.date,
  time_slot.start_time::TIME,
  time_slot.end_time::TIME,
  true
FROM clinics c
INNER JOIN doctors d ON d.clinic_id = c.id
CROSS JOIN (
  SELECT CURRENT_DATE + (n || ' days')::interval as date
  FROM generate_series(0, 6) n
) date_slot
CROSS JOIN (VALUES
  ('09:00:00'::TEXT, '09:30:00'::TEXT),
  ('09:30:00'::TEXT, '10:00:00'::TEXT),
  ('10:00:00'::TEXT, '10:30:00'::TEXT),
  ('10:30:00'::TEXT, '11:00:00'::TEXT),
  ('11:00:00'::TEXT, '11:30:00'::TEXT),
  ('14:00:00'::TEXT, '14:30:00'::TEXT),
  ('14:30:00'::TEXT, '15:00:00'::TEXT),
  ('15:00:00'::TEXT, '15:30:00'::TEXT),
  ('15:30:00'::TEXT, '16:00:00'::TEXT),
  ('16:00:00'::TEXT, '16:30:00'::TEXT)
) AS time_slot(start_time, end_time);

ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Hospitals:' as info, COUNT(*) as count FROM hospitals
UNION ALL
SELECT 'Clinics:', COUNT(*) FROM clinics
UNION ALL
SELECT 'Doctors:', COUNT(*) FROM doctors
UNION ALL
SELECT 'Appointment Slots:', COUNT(*) FROM appointment_slots;

-- Detailed view
SELECT 
  h.name as hospital_name,
  COUNT(DISTINCT c.id) as clinic_count,
  COUNT(DISTINCT d.id) as doctor_count,
  COUNT(DISTINCT s.id) as slot_count
FROM hospitals h
LEFT JOIN clinics c ON c.hospital_id = h.id
LEFT JOIN doctors d ON d.clinic_id = c.id
LEFT JOIN appointment_slots s ON s.clinic_id = c.id
GROUP BY h.id, h.name
ORDER BY h.name;
