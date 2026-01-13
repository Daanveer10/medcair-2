-- Fix: Insert doctors correctly
-- Run this separately if doctors weren't created

-- First, check what clinics exist
SELECT id, name, department FROM clinics ORDER BY department;

-- Then insert doctors matching by department
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

-- Verify doctors were created
SELECT 'Doctors created:' as info, COUNT(*) as count FROM doctors;

-- Show doctors with their clinics
SELECT 
  d.name as doctor_name,
  d.specialization,
  c.name as clinic_name,
  c.department
FROM doctors d
JOIN clinics c ON c.id = d.clinic_id
ORDER BY c.department, d.name;
