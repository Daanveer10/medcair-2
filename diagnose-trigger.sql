-- Diagnostic SQL to check if trigger is working
-- Run this in Supabase SQL Editor to troubleshoot

-- 1. Check if trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- 3. Check recent users and their profiles
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created,
  u.raw_user_meta_data,
  p.id as profile_id,
  p.role,
  p.full_name,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 4. Check for users without profiles (these should have been created by trigger)
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- 5. Test the function manually (replace USER_ID with an actual user ID)
-- SELECT public.handle_new_user() FROM auth.users WHERE id = 'USER_ID_HERE';
