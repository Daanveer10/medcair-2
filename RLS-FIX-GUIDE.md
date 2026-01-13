# Fixing 401 and 429 Errors

## Understanding the Errors

### 429 Error (Rate Limiting)
- **Cause**: Too many signup attempts in a short time
- **Solution**: Wait a few minutes before trying again, or use a different email

### 401 Error (Unauthorized)
- **Cause**: Missing RLS (Row Level Security) policy for INSERT on `user_profiles` table
- **Solution**: Run the SQL below in your Supabase SQL Editor

## Step-by-Step Fix

### 1. Fix the RLS Policy (401 Error)

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Check if policy already exists (optional - will error if exists, that's okay)
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Create the INSERT policy
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 2. Verify All Policies Exist

Run this to check your policies:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';
```

You should see 3 policies:
- "Users can view their own profile" (SELECT)
- "Users can insert their own profile" (INSERT) ← This one was missing
- "Users can update their own profile" (UPDATE)

### 3. Handle Rate Limiting (429 Error)

If you're getting 429 errors:

1. **Wait 5-10 minutes** - Rate limits reset automatically
2. **Use a different email** for testing
3. **Check Supabase Dashboard** → Settings → API → Rate Limits
4. **For development**, you can temporarily increase rate limits in Supabase settings

### 4. Alternative: Use Database Trigger (Recommended)

Instead of creating the profile in the app, you can use a database trigger to auto-create it:

```sql
-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Benefits of using a trigger:**
- Profile is created automatically
- No need for INSERT policy (trigger runs with SECURITY DEFINER)
- More reliable - can't fail due to RLS
- Works even if the app code has issues

### 5. Test the Fix

1. Wait for rate limit to reset (if 429 error)
2. Try signing up with a new email
3. Check Supabase Dashboard → Table Editor → `user_profiles` to verify the profile was created

## Troubleshooting

### Still getting 401 after adding policy?
- Make sure you ran the SQL in the correct database
- Check that RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_profiles';`
- Verify the policy was created: Check the policies list in Supabase Dashboard

### Still getting 429?
- Wait longer (up to 15 minutes)
- Check your Supabase plan limits
- Use Supabase Dashboard to manually create a test user

### Profile not being created?
- Check browser console for errors
- Verify the INSERT policy allows the operation
- Consider using the database trigger approach (more reliable)
