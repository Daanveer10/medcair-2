-- Alternative Solution: Auto-create user profile using database trigger
-- This is MORE RELIABLE than creating profiles in the app code
-- Run this in your Supabase SQL Editor

-- Step 1: Create the function that will create the profile
-- This version includes better error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
BEGIN
  -- Extract metadata (handle both JSONB and text formats)
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    (NEW.raw_user_meta_data->'role')::text,
    'patient'
  );
  
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->'full_name')::text,
    'User'
  );
  
  -- Remove quotes if present (JSONB sometimes returns quoted strings)
  user_role := TRIM(BOTH '"' FROM user_role);
  user_full_name := TRIM(BOTH '"' FROM user_full_name);
  
  -- Insert the profile
  INSERT INTO public.user_profiles (user_id, role, full_name)
  VALUES (NEW.id, user_role, user_full_name)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if profile already exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    -- You can check Supabase logs to see these errors
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger that fires when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Still need the INSERT policy (but trigger will handle it)
-- This policy allows the trigger to work
-- Drop policy if it exists, then create it
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: The trigger uses SECURITY DEFINER, so it bypasses RLS
-- But we still need the policy for manual inserts from the app
