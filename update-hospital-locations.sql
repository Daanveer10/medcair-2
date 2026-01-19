-- Script to update existing hospitals with location data
-- This script helps hospitals created via Supabase to get location data
-- 
-- Usage:
-- 1. Hospitals should update their address in the Hospital Settings page
-- 2. The geocoding will happen automatically when they click "Update & Geocode Location"
-- 
-- OR manually update hospitals with coordinates:
-- UPDATE hospitals 
-- SET latitude = 40.7128, longitude = -74.0060  -- Example: New York coordinates
-- WHERE id = 'your-hospital-id';
--
-- To find hospitals without location data:
-- SELECT id, name, address, city, state, zip_code 
-- FROM hospitals 
-- WHERE latitude IS NULL OR longitude IS NULL;

-- View hospitals without location data
SELECT 
  id,
  name,
  address,
  city,
  state,
  zip_code,
  email
FROM hospitals 
WHERE latitude IS NULL OR longitude IS NULL
ORDER BY created_at DESC;
