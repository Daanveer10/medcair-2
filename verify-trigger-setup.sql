-- Quick verification script to check if trigger is set up correctly
-- Run this in Supabase SQL Editor

-- 1. Check if trigger exists
SELECT 
  'Trigger Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 2. Check if function exists
SELECT 
  'Function Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'handle_new_user'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 3. Check INSERT policy
SELECT 
  'INSERT Policy Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'user_profiles' 
      AND policyname = 'Users can insert their own profile'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 4. Check all RLS policies for user_profiles
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE '⚠️ No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN '✅ Has WITH CHECK clause'
    ELSE '⚠️ No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- 5. Check recent users without profiles (should be empty if trigger works)
SELECT 
  'Users Without Profiles' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All users have profiles'
    ELSE '⚠️ Some users missing profiles'
  END as status
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
WHERE p.id IS NULL
AND u.created_at > NOW() - INTERVAL '1 day';
