# medcAIr - Comprehensive Test Plan

## Testing Strategy
Before implementing Phase 1 features, we'll thoroughly test all existing functionality to ensure a solid foundation.

## Test Checklist

### 1. Authentication Flow
- [ ] **Sign Up (Patient)**
  - [ ] Create account with valid email
  - [ ] Password requirements validation
  - [ ] Email confirmation flow
  - [ ] Profile creation after confirmation
  - [ ] Error handling for duplicate emails

- [ ] **Sign Up (Hospital)**
  - [ ] Create hospital account
  - [ ] Role assignment (hospital)
  - [ ] Hospital record creation

- [ ] **Login**
  - [ ] Login with correct credentials
  - [ ] Login with wrong password
  - [ ] Login with non-existent email
  - [ ] Redirect to correct dashboard (patient/hospital)
  - [ ] Session persistence

- [ ] **Password Reset**
  - [ ] Forgot password email sent
  - [ ] Password update flow
  - [ ] Invalid token handling

- [ ] **Logout**
  - [ ] Logout clears session
  - [ ] Redirect to home page
  - [ ] Protected routes inaccessible after logout

### 2. Patient Dashboard
- [ ] **Clinic Search**
  - [ ] Search by disease/specialty
  - [ ] Search by city/location
  - [ ] Search by clinic name
  - [ ] Combined filters work correctly
  - [ ] Empty state when no results
  - [ ] Loading states display properly

- [ ] **Filters**
  - [ ] Favorites filter works
  - [ ] Distance calculation (if geolocation enabled)
  - [ ] Filter combinations don't break

- [ ] **Clinic Cards**
  - [ ] All clinic information displays correctly
  - [ ] Favorite/unfavorite functionality
  - [ ] Link to clinic detail page works

- [ ] **Navigation**
  - [ ] "My Appointments" button works
  - [ ] Settings button works (if applicable)
  - [ ] Notification center works

### 3. Clinic Detail Page
- [ ] **Clinic Information**
  - [ ] Clinic details display correctly
  - [ ] Doctor list shows correctly
  - [ ] Specialties display properly

- [ ] **Appointment Slots**
  - [ ] Available slots show in green
  - [ ] Booked slots show in red (disabled)
  - [ ] Pending slots show correctly (yellow for owner, grey for others)
  - [ ] Slots grouped by date correctly
  - [ ] Past slots don't show

- [ ] **Booking Flow**
  - [ ] Click available slot books appointment
  - [ ] Slot becomes pending after booking
  - [ ] Toast notification shows success
  - [ ] Real-time updates (open in two tabs)
  - [ ] Double-booking prevented
  - [ ] Booking with unavailable slot shows error

### 4. Patient Appointments Page
- [ ] **Active Appointments**
  - [ ] Shows pending appointments
  - [ ] Shows accepted appointments
  - [ ] Shows scheduled appointments
  - [ ] Appointment details correct

- [ ] **Previous Appointments**
  - [ ] Toggle to view previous appointments
  - [ ] Shows completed/cancelled appointments
  - [ ] Historical data displays correctly

- [ ] **Appointment Actions**
  - [ ] Cancel appointment works
  - [ ] Reschedule appointment works
  - [ ] Status updates reflect correctly

### 5. Hospital Dashboard
- [ ] **Statistics**
  - [ ] Today's appointments count correct
  - [ ] Upcoming appointments count correct
  - [ ] Total appointments count correct
  - [ ] Pending appointments count correct

- [ ] **Appointment List**
  - [ ] All appointments display
  - [ ] Filters work (All, Scheduled, Pending, Completed)
  - [ ] Appointment details correct
  - [ ] Patient name displays

- [ ] **Appointment Actions**
  - [ ] Accept appointment works
  - [ ] Decline appointment works
  - [ ] Status updates correctly
  - [ ] Notifications sent on accept/decline

- [ ] **Doctors & Schedules**
  - [ ] All doctors list displays
  - [ ] Expand/collapse doctor cards works
  - [ ] Upcoming schedule tab shows correct appointments
  - [ ] Patient history tab shows past appointments
  - [ ] Doctor information correct

- [ ] **Add Doctor Modal**
  - [ ] Form validation works
  - [ ] Clinic dropdown shows all clinics
  - [ ] Doctor creation successful
  - [ ] Error handling for duplicate doctor IDs
  - [ ] Form resets after creation

### 6. Hospital Settings
- [ ] **Hospital Info**
  - [ ] Hospital details display
  - [ ] Edit functionality (if applicable)

- [ ] **Clinic Management**
  - [ ] Create clinic works
  - [ ] Validation for required fields
  - [ ] Clinic appears in list after creation
  - [ ] Clinic appears in dashboard after creation

- [ ] **Doctor Management**
  - [ ] Add doctor form works
  - [ ] All doctor fields save correctly
  - [ ] Doctor appears in list after creation
  - [ ] Doctor appears in dashboard after creation

- [ ] **Slot Management**
  - [ ] Create appointment slot works
  - [ ] Date validation (no past dates)
  - [ ] Time validation (end > start)
  - [ ] Slot appears in clinic detail page

### 7. Real-time Features
- [ ] **Appointment Updates**
  - [ ] Booking in one tab updates in another
  - [ ] Accept/decline in hospital updates in patient view
  - [ ] Slot status updates in real-time

- [ ] **Notifications**
  - [ ] Notification appears when appointment accepted
  - [ ] Notification appears when appointment declined
  - [ ] Notification center shows all notifications
  - [ ] Notifications mark as read

### 8. Data Integrity
- [ ] **Database Constraints**
  - [ ] Foreign key constraints work
  - [ ] Unique constraints enforced (doctor_id, etc.)
  - [ ] Required fields validated

- [ ] **RLS Policies**
  - [ ] Patients can only see their own appointments
  - [ ] Hospitals can only see their own clinics/appointments
  - [ ] Unauthorized access prevented

### 9. Error Handling
- [ ] **Network Errors**
  - [ ] Offline handling
  - [ ] API errors show user-friendly messages
  - [ ] 401 errors redirect to login
  - [ ] 403 errors show appropriate message

- [ ] **Validation Errors**
  - [ ] Form validation messages clear
  - [ ] Required field errors show
  - [ ] Invalid format errors show

### 10. UI/UX
- [ ] **Responsive Design**
  - [ ] Mobile view works
  - [ ] Tablet view works
  - [ ] Desktop view works

- [ ] **Loading States**
  - [ ] Loading spinners appear during data fetch
  - [ ] Skeleton loaders show (where implemented)
  - [ ] Loading states don't persist indefinitely

- [ ] **Empty States**
  - [ ] Empty states show when no data
  - [ ] Empty states have helpful messages

- [ ] **Toast Notifications**
  - [ ] Success toasts appear
  - [ ] Error toasts appear
  - [ ] Toasts auto-dismiss

## Testing Process
1. Manual testing of each feature
2. Check browser console for errors
3. Test with multiple user accounts
4. Test edge cases (empty data, network errors, etc.)
5. Fix any bugs found before proceeding to Phase 1

## Known Issues to Check
- [ ] Clinic loading in doctor modal
- [ ] Persistent loading icons
- [ ] Real-time subscription cleanup
- [ ] Form validation consistency
- [ ] Error message clarity