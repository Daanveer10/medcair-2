# MedCair AI - Hospital Receptionist Web App

An AI-powered hospital receptionist web application built with Next.js and Supabase. This app helps hospitals manage appointments and allows patients to search for clinics, book appointments, and manage follow-ups.

## Features

### For Patients
- **Smart Clinic Search**: Search for clinics by disease, specialty, availability, and location
- **Real-time Slot Availability**: View booked and free appointment slots
- **Easy Appointment Booking**: Book appointments with just a few clicks
- **Appointment Management**: View and manage all your appointments
- **Follow-up Tracking**: See scheduled follow-ups for your appointments

### For Hospitals
- **Multi-clinic Management**: Manage multiple clinics and departments
- **Appointment Scheduling**: Create and manage appointment slots
- **Doctor Management**: Add doctors and their specializations
- **Dashboard Overview**: View all appointments, today's schedule, and statistics
- **Follow-up Scheduling**: Schedule follow-ups for patients

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd medcair-2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   
   **Option A: Using Supabase CLI (Recommended)**
   ```bash
   # If you have Supabase CLI installed
   supabase db reset
   # or
   supabase migration up
   ```
   
   **Option B: Using Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/20240101000000_init_schema.sql`
   
   **Note:** The migration file includes all tables, indexes, RLS policies, and triggers needed for the application.

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main tables:

- **user_profiles**: User information with role (patient/hospital)
- **hospitals**: Hospital information
- **clinics**: Clinic/department information within hospitals
- **doctors**: Doctor information linked to clinics
- **appointment_slots**: Available time slots for appointments
- **appointments**: Patient appointments
- **follow_ups**: Follow-up appointments

All tables have Row Level Security (RLS) enabled with appropriate policies.

## Project Structure

```
medcair-2/
├── app/
│   ├── auth/              # Authentication pages
│   ├── patient/           # Patient interface
│   │   ├── dashboard/     # Patient dashboard with clinic search
│   │   ├── clinic/        # Clinic detail and booking page
│   │   └── appointments/  # Patient appointments view
│   ├── hospital/          # Hospital interface
│   │   ├── dashboard/     # Hospital dashboard
│   │   └── settings/      # Hospital settings and slot management
│   └── protected/         # Protected route (redirects based on role)
├── components/            # Reusable components
├── lib/                   # Utilities and types
│   ├── supabase/          # Supabase client setup
│   └── types.ts           # TypeScript type definitions
└── supabase/
    └── migrations/         # Database migrations
        └── 20240101000000_init_schema.sql  # Initial schema migration
```

## User Roles

### Patient
- Can search for clinics
- Can view available slots
- Can book appointments
- Can view and manage their appointments
- Can see follow-ups

### Hospital
- Can create and manage clinics
- Can add doctors
- Can create appointment slots
- Can view all appointments
- Can schedule follow-ups

## Features in Detail

### Clinic Search
Patients can search for clinics using:
- Clinic or department name
- Disease/condition/specialty
- City/location

### Slot Visualization
When viewing a clinic, patients can see:
- All available slots for the next 7 days
- Booked slots (marked in red)
- Free slots (marked in green)
- Doctor information for each slot

### Appointment Management
- Hospitals can view all appointments in a unified dashboard
- Patients can view their appointment history
- Both can see appointment status (scheduled, completed, cancelled)

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Hospitals can only manage their own clinics and appointments
- Patients can only view and manage their own appointments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.
