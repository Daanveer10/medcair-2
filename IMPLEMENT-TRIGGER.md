# Implementing Option 2: Database Trigger Solution

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
- Open your Supabase project dashboard
- Navigate to **SQL Editor** (left sidebar)

### 2. Run the Trigger SQL
Copy and paste the entire contents of `auto-create-profile-trigger.sql` into the SQL Editor and click **Run**.

The SQL will:
- ✅ Create a function that automatically creates user profiles
- ✅ Create a trigger that fires when new users sign up
- ✅ Add the INSERT policy (as a backup)

### 3. Verify the Trigger Works
After running the SQL, you can verify it was created:

```sql
-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

You should see the trigger listed.

### 4. Test Signup
1. Go to your app's signup page
2. Create a new account with:
   - Email (use a new one to avoid rate limits)
   - Password
   - Full Name
   - Role (Patient or Hospital)
3. After signup, check Supabase Dashboard → Table Editor → `user_profiles`
4. You should see the new profile automatically created!

### 5. How It Works

The trigger:
1. **Listens** for new user signups in `auth.users` table
2. **Extracts** `role` and `full_name` from `raw_user_meta_data`
3. **Creates** the profile in `user_profiles` table automatically
4. **Uses** `SECURITY DEFINER` to bypass RLS (more reliable)

### Benefits

✅ **More Reliable**: Database-level trigger always runs  
✅ **No App Code Dependency**: Works even if app has bugs  
✅ **Automatic**: No need to handle profile creation in code  
✅ **Safe**: Uses `ON CONFLICT DO NOTHING` to prevent duplicates  

### Troubleshooting

**Trigger not working?**
- Make sure you ran the SQL in the correct database
- Check Supabase logs for errors
- Verify the trigger exists (use the SQL query above)

**Profile not created?**
- Check that `raw_user_meta_data` contains `role` and `full_name`
- The signup form passes these in the `data` option
- Check browser console for any errors

**Still getting 401?**
- Make sure the INSERT policy was created
- Wait a few minutes for rate limits to reset (if 429 error)

## What Changed in the Code

The signup form now:
- ✅ Still passes `role` and `full_name` in metadata (for the trigger)
- ✅ No longer manually creates the profile (trigger does it)
- ✅ Simpler and more reliable

The trigger handles everything automatically! 🎉
