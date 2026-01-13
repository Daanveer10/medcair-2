# Troubleshooting: Profile Not Created After Signup

## Problem
- ✅ Email confirmation is sent
- ❌ User profile is NOT created in `user_profiles` table
- ❌ 400 error on token endpoint

## Quick Fixes

### 1. Check if Trigger Exists
Run this in Supabase SQL Editor:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

If no results, the trigger wasn't created. Re-run `auto-create-profile-trigger.sql`.

### 2. Check Recent Users
Run this to see if profiles are being created:
```sql
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data,
  p.id as profile_id
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;
```

### 3. Manual Profile Creation (Temporary Fix)
If a user exists but has no profile, create it manually:
```sql
-- Replace USER_ID_HERE with the actual user ID from auth.users
INSERT INTO public.user_profiles (user_id, role, full_name)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'role', 'patient'),
  COALESCE(raw_user_meta_data->>'full_name', 'User')
FROM auth.users
WHERE id = 'USER_ID_HERE'
ON CONFLICT (user_id) DO NOTHING;
```

### 4. Check Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Look for errors related to `handle_new_user` function
3. Check for RLS policy violations

### 5. Verify RLS Policies
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_profiles';
```

You should see:
- SELECT policy
- INSERT policy ← **This is critical!**
- UPDATE policy

### 6. Re-run Trigger Setup
If trigger isn't working, re-run the entire `auto-create-profile-trigger.sql` file.

## Common Issues

### Issue: Trigger Not Firing
**Cause**: Trigger wasn't created or was dropped  
**Fix**: Re-run `auto-create-profile-trigger.sql`

### Issue: Metadata Not Passed
**Cause**: `raw_user_meta_data` is empty  
**Fix**: Check signup form - it should pass `data: { role, full_name }`

### Issue: RLS Blocking Insert
**Cause**: INSERT policy missing or incorrect  
**Fix**: Run the INSERT policy creation from `fix-rls-policy.sql`

### Issue: Email Confirmation Required
**Cause**: Supabase requires email confirmation before user is "active"  
**Fix**: 
- Check Supabase Settings → Authentication → Email Auth
- Either disable email confirmation for testing, or
- Make sure users confirm email before trying to use the app

## Diagnostic Script
Run `diagnose-trigger.sql` to get a full diagnostic report of your setup.

## Fallback Solution
The signup form now includes a fallback that:
1. Waits 500ms for trigger to fire
2. Checks if profile exists
3. Creates profile manually if trigger didn't work

This ensures profiles are always created, even if trigger fails.
