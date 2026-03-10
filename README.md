# MedCair - Healthcare Management Platform

A production-ready healthcare management platform built with Next.js 15 and Supabase. Manages appointments across three user roles: **Patients**, **Doctors**, and **Hospitals**.

## Features

### For Patients 🏥
- **Smart Doctor Search**: Search by specialty, location, or condition
- **Real-time Slot Availability**: View available appointment slots
- **Easy Booking**: Book appointments with just a few clicks
- **Appointment Management**: Track and manage all appointments
- **Doctor Profiles**: View doctor specializations and consultation fees

### For Doctors 👨‍⚕️
- **Centralized Dashboard**: View all appointments in one place
- **Appointment Management**: Accept/decline appointment requests
- **Patient History**: Access patient records for scheduled appointments
- **Schedule Management**: Manage availability and time slots
- **Hospital Integration**: Linked to hospital for seamless coordination

### For Hospitals 🏨
- **Multi-Doctor Management**: Add and manage doctors
- **Comprehensive Dashboard**: View all appointments, patients, and analytics
- **Revenue Tracking**: Monitor earnings from consultations
- **Waiting Room View**: See today's schedule and waiting patients
- **Analytics**: Track patient volume, appointment trends, and more

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([sign up here](https://supabase.com))
- Vercel account for deployment (optional)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd medcair-2
npm install
```

### 2. Set Up Environment Variables

See **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** for detailed instructions.

Quick setup:
```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Get these values from your [Supabase Dashboard](https://app.supabase.com) → Settings → API

### 3. Set Up Database

Apply migrations in your Supabase SQL Editor (in order):
1. `supabase/migrations/20240101000000_init_schema.sql`
2. `supabase/migrations/20240102000000_add_doctor_fields.sql`
3. `supabase/migrations/20240103000000_phase1_features.sql`
4. `supabase/migrations/20240104000000_add_hospital_notifications.sql`
5. `supabase/migrations/20240123000000_add_doctor_role.sql`
6. `fix_appointments_schema.sql`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### Database Schema

The application uses the following main tables:

- **user_profiles**: User information with role (patient/doctor/hospital)
- **hospitals**: Hospital information and settings
- **doctors**: Doctor profiles linked to hospitals
- **clinics**: Departments within hospitals (optional)
- **appointment_slots**: Available time slots
- **appointments**: Patient appointments
- **notifications**: User notifications

All tables have Row Level Security (RLS) enabled with role-based access policies.

### User Roles & Access

| Role | Can Access | Filtered By |
|------|-----------|-------------|
| **Patient** | Own appointments, doctor search | User ID |
| **Doctor** | Own appointments, patient records | Doctor ID |
| **Hospital** | All hospital's appointments, doctors, analytics | Hospital ID |

## Project Structure

```
medcair-2/
├── app/
│   ├── api/               # API routes (server-side)
│   ├── auth/              # Authentication pages
│   ├── patient/           # Patient dashboard & features
│   ├── doctor/            # Doctor dashboard & features
│   ├── hospital/          # Hospital dashboard & features
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── hospital/          # Hospital-specific components
│   └── ...                # Shared components
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Utility functions
├── supabase/
│   └── migrations/        # Database migrations
├── .env.local.example     # Environment variable template
├── ENVIRONMENT_SETUP.md   # Environment setup guide
└── PRODUCTION_DEPLOYMENT.md # Production deployment guide
```

## Key Features Explained

### Role-Based Dashboards

Each role has a dedicated dashboard with role-specific features:

- **Hospital Dashboard** (`/hospital/dashboard`)
  - Filtered by hospital owner's hospital_id
  - Shows only appointments for doctors in their hospital
  - Revenue calculated from their doctors' consultation fees

- **Doctor Dashboard** (`/doctor/dashboard`)
  - Filtered by doctor's user_id
  - Shows only appointments assigned to this doctor
  - Displays hospital affiliation

- **Patient Dashboard** (`/patient/dashboard`)
  - Search and book appointments
  - View personal appointment history
  - Find doctors by location/specialty

### Security

- **Row Level Security (RLS)**: All database queries are filtered at the database level
- **Role-Based Access**: Users can only access data they're authorized to see
- **Server-Side API Routes**: Sensitive operations use service role key on server
- **Type Safety**: Full TypeScript coverage prevents runtime errors

## Testing

### Local Testing

1. **Sign up as Hospital**:
   ```
   Navigate to /auth/sign-up
   Select "Hospital" role
   Complete registration
   Access /hospital/dashboard
   ```

2. **Add a Doctor** (as Hospital):
   ```
   Click "Add Doctor" button
   Fill in doctor details
   Doctor appears in "Your Doctors" list
   ```

3. **Sign up as Doctor**:
   ```
   Select "Doctor" role
   Choose your hospital from dropdown
   Enter specialization
   Access /doctor/dashboard
   ```

4. **Sign up as Patient**:
   ```
   Select "Patient" role
   Search for doctors
   Book an appointment
   ```

5. **Test End-to-End Flow**:
   ```
   Patient books appointment → Doctor sees in Pending → 
   Doctor accepts → Patient sees Confirmed → 
   Hospital sees in stats
   ```

## Production Deployment

See **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** for complete deployment guide.

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Then redeploy for changes to take effect
```

## Troubleshooting

### Common Issues

**"supabaseUrl is required" error**
- Environment variables not set correctly
- Restart dev server after updating `.env.local`

**Can't see appointments in dashboard**
- User might have wrong role in database
- Check `user_profiles` table for correct role assignment
- For doctors, verify `hospital_id` is set in `doctors` table

**Doctor can't see hospital name**
- Database join might be incorrect
- Already fixed in latest version - update code if needed

### Getting Help

1. Check [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for detailed troubleshooting
2. Review [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for configuration issues
3. Open an issue in the repository

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.
