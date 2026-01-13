-- Fix users without profiles
-- Run this in Supabase SQL Editor

-- Step 1: Find users without profiles
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data,
  u.user_metadata
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- Step 2: Create profiles for users missing them
-- This will create profiles from their metadata
INSERT INTO public.user_profiles (user_id, role, full_name)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'role',
    u.user_metadata->>'role',
    'patient'
  ) as role,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.user_metadata->>'full_name',
    SPLIT_PART(u.email, '@', 1) -- Use email prefix as fallback
  ) as full_name
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify all users now have profiles
SELECT 
  'Verification' as check_type,
  COUNT(*) as users_without_profiles,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All users have profiles'
    ELSE '⚠️ Still missing profiles'
  END as status
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
WHERE p.id IS NULL;
