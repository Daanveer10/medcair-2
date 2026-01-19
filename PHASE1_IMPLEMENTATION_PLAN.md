# Phase 1 Implementation Plan

## Overview
Enhancing medcAIr to match Practo's core features:
1. Enhanced Profiles (photos, credentials, services, fees)
2. Reviews & Ratings
3. Advanced Filters (insurance, fees, languages, experience)
4. In-App Messaging

---

## 1. Enhanced Profiles

### Database Changes
- Add to `clinics` table:
  - `consultation_fee` (DECIMAL)
  - `profile_image_url` (TEXT)
  - `languages_spoken` (TEXT[])
  - `services_offered` (TEXT[])
  - `operating_hours` (JSONB) - stores weekly schedule
  - `description` (TEXT) - already exists
  
- Add to `doctors` table:
  - `profile_image_url` (TEXT)
  - `years_of_experience` (INTEGER)
  - `education` (TEXT[]) - degrees, certifications
  - `awards` (TEXT[])
  - `languages_spoken` (TEXT[])

- Add to `hospitals` table:
  - `profile_image_url` (TEXT)
  - `insurance_accepted` (TEXT[]) - list of insurance providers

### UI Changes
- Clinic detail page: Show fees, photos, services, hours, languages
- Doctor cards: Show photos, experience, languages, education
- Hospital profile: Show insurance accepted, hospital image
- Edit forms in hospital settings

---

## 2. Reviews & Ratings

### Database Changes
- Create `reviews` table:
  ```sql
  CREATE TABLE reviews (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES user_profiles(id),
    doctor_id UUID REFERENCES doctors(id),
    clinic_id UUID REFERENCES clinics(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    appointment_id UUID REFERENCES appointments(id), -- optional
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    response_text TEXT, -- doctor/hospital response
    response_date TIMESTAMP
  );
  ```

- Update `doctors` and `clinics` to compute average ratings (computed field or materialized view)

### UI Changes
- Review form on clinic/doctor detail pages
- Display average ratings and reviews
- Filter clinics by ratings
- Hospital dashboard: View and respond to reviews

---

## 3. Advanced Filters

### Database Changes
- Add indexes on frequently filtered columns:
  - `clinics.consultation_fee`
  - `clinics.specialties` (GIN index for array search)
  - `doctors.years_of_experience`

### UI Changes
- Patient dashboard: Add filter UI for:
  - Consultation fee range (slider)
  - Insurance accepted (multi-select)
  - Languages spoken (multi-select)
  - Years of experience (slider)
  - Ratings (star filter)

---

## 4. In-App Messaging

### Database Changes
- Create `messages` table:
  ```sql
  CREATE TABLE messages (
    id UUID PRIMARY KEY,
    sender_id UUID REFERENCES user_profiles(id),
    recipient_id UUID REFERENCES user_profiles(id),
    appointment_id UUID REFERENCES appointments(id), -- optional
    message_text TEXT NOT NULL,
    attachment_url TEXT, -- for prescriptions, reports
    read_at TIMESTAMP,
    created_at TIMESTAMP
  );
  ```

- Create `conversations` table (optional, for better organization):
  ```sql
  CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    participant_1_id UUID REFERENCES user_profiles(id),
    participant_2_id UUID REFERENCES user_profiles(id),
    appointment_id UUID REFERENCES appointments(id),
    last_message_at TIMESTAMP,
    created_at TIMESTAMP
  );
  ```

### UI Changes
- Chat interface component
- Message list in patient dashboard
- Message list in hospital dashboard
- Real-time message updates using Supabase subscriptions
- File upload for prescriptions/reports

---

## Implementation Order

1. **Enhanced Profiles** (Day 1-2)
   - Database migration
   - Update types
   - Update UI components
   - Update forms

2. **Reviews & Ratings** (Day 3-4)
   - Database migration
   - Review submission form
   - Display reviews
   - Rating filters

3. **Advanced Filters** (Day 5)
   - Update search UI
   - Add filter components
   - Update query logic

4. **In-App Messaging** (Day 6-7)
   - Database migration
   - Chat UI component
   - Real-time messaging
   - File upload

---

## Testing Checklist for Phase 1

### Enhanced Profiles
- [ ] Photos upload and display correctly
- [ ] Fees display and filter works
- [ ] Services/languages display correctly
- [ ] Operating hours display and edit works

### Reviews & Ratings
- [ ] Can submit reviews after appointment
- [ ] Ratings display correctly
- [ ] Average ratings calculated correctly
- [ ] Filter by ratings works
- [ ] Hospital can respond to reviews

### Advanced Filters
- [ ] Fee range filter works
- [ ] Insurance filter works
- [ ] Languages filter works
- [ ] Experience filter works
- [ ] Multiple filters work together

### In-App Messaging
- [ ] Can send messages
- [ ] Messages display in real-time
- [ ] File attachments work
- [ ] Read receipts work
- [ ] Message history loads correctly
