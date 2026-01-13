-- Fix: Add missing INSERT policy for user_profiles
-- Run this in your Supabase SQL Editor if you've already created the tables

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
