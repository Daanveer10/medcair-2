export type UserRole = 'patient' | 'hospital';

export interface UserProfile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  hospital_id: string;
  name: string;
  department: string; // e.g., Cardiology, Neurology, etc.
  specialties: string[]; // Diseases/conditions treated
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  clinic_id: string;
  name: string;
  specialization: string;
  doctor_id?: string;
  degree?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentSlot {
  id: string;
  clinic_id: string;
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  clinic_id: string;
  doctor_id: string;
  slot_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'accepted' | 'declined' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  appointment_id: string;
  patient_id: string;
  clinic_id: string;
  follow_up_date: string;
  follow_up_time: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}
