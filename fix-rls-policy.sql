-- Fix: Add missing INSERT policy for user_profiles
-- Run this in your Supabase SQL Editor if you've already created the tables

-- Option 1: Simple fix - just add the INSERT policy
CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Option 2: Better solution - Use database trigger (see auto-create-profile-trigger.sql)
-- The trigger automatically creates profiles when users sign up
-- This is more reliable and doesn't require the app to handle profile creation
