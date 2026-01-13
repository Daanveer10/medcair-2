# Quick Start: Creating Demo Data

## The Problem
All counts are showing 0 because:
1. **No hospital user exists** - The script needs a hospital user to create hospitals
2. **RLS is blocking inserts** - Row Level Security prevents direct SQL inserts

## Solution: Step-by-Step

### Step 1: Create a Hospital User Account
1. Go to your app: `https://your-app.vercel.app/auth/sign-up`
2. Sign up with:
   - Email: `hospital@demo.com` (or any email)
   - Password: (choose a password)
   - **Role: Hospital** ← Important!
   - Full Name: `Demo Hospital Admin`
3. Confirm your email (if required)

### Step 2: Run the Complete Demo Script
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the **ENTIRE** contents of `create-demo-data-complete.sql`
3. Click **Run**
4. The script will:
   - ✅ Check if hospital user exists
   - ✅ Create 3 hospitals
   - ✅ Create 30 clinics (10 per hospital)
   - ✅ Create 30 doctors (1 per clinic)
   - ✅ Create ~2,100 appointment slots (7 days × 10 slots × 30 doctors)

### Step 3: Verify
After running, you should see:
- Hospitals: 3
- Clinics: 30
- Doctors: 30
- Appointment Slots: ~2,100

## Alternative: Manual Creation (If Script Fails)

If the script still doesn't work, create data manually:

### 1. Get Your Hospital User ID
```sql
SELECT u.id, u.email, p.role
FROM auth.users u
JOIN user_profiles p ON p.user_id = u.id
WHERE p.role = 'hospital';
```

### 2. Create One Hospital Manually
```sql
-- Replace USER_ID_HERE with the ID from step 1
INSERT INTO hospitals (user_id, name, address, city, state, zip_code, phone, email, description)
VALUES (
  'USER_ID_HERE'::uuid,
  'City General Hospital',
  '123 Medical Center Drive',
  'New York',
  'NY',
  '10001',
  '+1-555-0101',
  'info@citygeneral.com',
  'A leading healthcare facility'
);
```

### 3. Create One Clinic
```sql
-- Replace HOSPITAL_ID_HERE with the hospital ID from step 2
INSERT INTO clinics (hospital_id, name, department, specialties, description)
VALUES (
  'HOSPITAL_ID_HERE'::uuid,
  'Cardiology Center',
  'Cardiology',
  ARRAY['Heart Disease', 'Hypertension'],
  'Expert cardiac care'
);
```

### 4. Create One Doctor
```sql
-- Replace CLINIC_ID_HERE with the clinic ID from step 3
INSERT INTO doctors (clinic_id, name, specialization, email, phone)
VALUES (
  'CLINIC_ID_HERE'::uuid,
  'Dr. Sarah Johnson',
  'Cardiologist',
  'sarah.johnson@hospital.com',
  '+1-555-1001'
);
```

### 5. Create Appointment Slots
```sql
-- Replace CLINIC_ID_HERE and DOCTOR_ID_HERE
INSERT INTO appointment_slots (clinic_id, doctor_id, date, start_time, end_time, is_available)
SELECT 
  'CLINIC_ID_HERE'::uuid,
  'DOCTOR_ID_HERE'::uuid,
  CURRENT_DATE + (n || ' days')::interval,
  '09:00:00'::TIME,
  '09:30:00'::TIME,
  true
FROM generate_series(0, 6) n;
```

## Troubleshooting

### "No hospital user found" Error
- **Solution**: Create a hospital user account first (Step 1 above)

### "Permission denied" or RLS Error
- **Solution**: The `create-demo-data-complete.sql` script handles this by temporarily disabling RLS

### Still Getting 0 Counts
1. Check if tables exist: `SELECT COUNT(*) FROM hospitals;`
2. Check RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('hospitals', 'clinics', 'doctors', 'appointment_slots');`
3. Try running each step separately from `create-demo-data-complete.sql`

## Expected Results

After successful execution:
- ✅ 3 Hospitals
- ✅ 30 Clinics (10 per hospital)
- ✅ 30 Doctors (1 per clinic, matched by department)
- ✅ ~2,100 Appointment Slots (7 days × 10 time slots × 30 doctors)

## Next Steps

Once demo data is created:
1. Log in as a patient
2. Go to patient dashboard
3. You should see all 30 clinics available for search
4. Click on any clinic to see available appointment slots
5. Book an appointment!
