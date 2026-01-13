-- Diagnostic queries to find why slots weren't created
-- Run these to see what data exists

-- 1. Check if clinics exist
SELECT 'Clinics' as table_name, COUNT(*) as count, 
  STRING_AGG(name, ', ') as names
FROM clinics;

-- 2. Check if doctors exist
SELECT 'Doctors' as table_name, COUNT(*) as count
FROM doctors;

-- 3. Check clinic-doctor relationships
SELECT 
  c.name as clinic_name,
  c.department,
  COUNT(d.id) as doctor_count
FROM clinics c
LEFT JOIN doctors d ON d.clinic_id = c.id
GROUP BY c.id, c.name, c.department
ORDER BY c.name;

-- 4. Check which clinics match the WHERE clause
SELECT 
  c.name,
  CASE 
    WHEN c.name IN ('Cardiology Center', 'Neurology Department', 'Orthopedics Clinic', 'Pediatrics Unit', 'Dermatology Center')
    THEN '✅ Matches'
    ELSE '❌ Does not match'
  END as match_status
FROM clinics c;

-- 5. Test the slot creation query (without INSERT)
SELECT 
  c.id as clinic_id,
  c.name as clinic_name,
  d.id as doctor_id,
  d.name as doctor_name,
  date_slot.date,
  time_slot.start_time::TIME,
  time_slot.end_time::TIME
FROM clinics c
INNER JOIN doctors d ON d.clinic_id = c.id
CROSS JOIN (
  SELECT CURRENT_DATE + (n || ' days')::interval as date
  FROM generate_series(0, 6) n
) date_slot
CROSS JOIN (VALUES
  ('09:00:00'::TEXT, '09:30:00'::TEXT)
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
LIMIT 10;
