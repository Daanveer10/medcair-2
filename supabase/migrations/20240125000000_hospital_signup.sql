-- ============================================================================
-- Hospital Profile Creation Trigger
-- Updates the handle_new_user trigger to synchronously create the hospital
-- profile using metadata supplied during sign up
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
  user_hospital_id UUID;
  user_specialization TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', (NEW.raw_user_meta_data->'role')::text, 'patient');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', (NEW.raw_user_meta_data->'full_name')::text, 'User');
  -- Clean quotes
  user_role := TRIM(BOTH '"' FROM user_role);
  user_full_name := TRIM(BOTH '"' FROM user_full_name);

  -- 1. Create Base Profile
  INSERT INTO public.user_profiles (user_id, role, full_name)
  VALUES (NEW.id, user_role, user_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Handle Hospital Role
  IF user_role = 'hospital' THEN
    INSERT INTO public.hospitals (
      user_id, 
      name, 
      email, 
      phone, 
      address, 
      city, 
      state, 
      zip_code
    )
    VALUES (
      NEW.id,
      user_full_name,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'address', ''),
      COALESCE(NEW.raw_user_meta_data->>'city', ''),
      COALESCE(NEW.raw_user_meta_data->>'state', ''),
      COALESCE(NEW.raw_user_meta_data->>'zip_code', '')
    );
  END IF;

  -- 3. Handle Doctor Role
  IF user_role = 'doctor' THEN
    user_hospital_id := (NEW.raw_user_meta_data->>'hospital_id')::UUID;
    user_specialization := COALESCE(NEW.raw_user_meta_data->>'specialization', 'General');
    
    IF user_hospital_id IS NOT NULL THEN
        INSERT INTO public.doctors (user_id, hospital_id, name, specialization)
        VALUES (NEW.id, user_hospital_id, user_full_name, user_specialization);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
