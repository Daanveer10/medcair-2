-- Test the trigger function manually
-- This helps verify the trigger is working correctly

-- Step 1: Check the most recent user and their metadata
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data,
  user_metadata,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 1;

-- Step 2: Test the trigger function manually (replace USER_ID with actual ID from step 1)
-- Uncomment and replace USER_ID_HERE with the actual user ID
/*
DO $$
DECLARE
  test_user RECORD;
  profile_created BOOLEAN := FALSE;
BEGIN
  -- Get the most recent user
  SELECT * INTO test_user
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Try to create profile using the trigger function logic
  BEGIN
    INSERT INTO public.user_profiles (user_id, role, full_name)
    VALUES (
      test_user.id,
      COALESCE(
        test_user.raw_user_meta_data->>'role',
        'patient'
      ),
      COALESCE(
        test_user.raw_user_meta_data->>'full_name',
        'User'
      )
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    profile_created := TRUE;
    RAISE NOTICE 'Profile creation attempted for user: %', test_user.email;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error: %', SQLERRM;
  END;
  
  -- Check if profile was created
  IF profile_created THEN
    SELECT * INTO profile_created
    FROM public.user_profiles
    WHERE user_id = test_user.id;
    
    IF profile_created THEN
      RAISE NOTICE '✅ Profile created successfully';
    ELSE
      RAISE NOTICE '❌ Profile creation failed';
    END IF;
  END IF;
END $$;
*/

-- Step 3: Check if trigger fired for recent users
SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  p.created_at as profile_created,
  EXTRACT(EPOCH FROM (p.created_at - u.created_at)) as seconds_difference,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Profile exists'
    ELSE '❌ No profile'
  END as status
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '1 day'
ORDER BY u.created_at DESC;
