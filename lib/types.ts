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
  photo_url?: string; // Phase 1: Enhanced Profiles
  website_url?: string; // Phase 1: Website URL
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
  photo_url?: string; // Phase 1: Enhanced Profiles
  consultation_fee?: number; // Phase 1: Consultation fee
  services?: string[]; // Phase 1: Services offered
  insurance_providers?: string[]; // Phase 1: Insurance accepted
  payment_methods?: string[]; // Phase 1: Payment methods accepted
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
  photo_url?: string; // Phase 1: Enhanced Profiles
  credentials?: string[]; // Phase 1: e.g., ['MBBS', 'MD', 'FACP']
  years_of_experience?: number; // Phase 1: Years of experience
  languages_spoken?: string[]; // Phase 1: e.g., ['English', 'Hindi']
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

// Phase 1: Reviews & Ratings
export interface ClinicReview {
  id: string;
  clinic_id: string;
  patient_id: string;
  rating: number; // 1-5
  review_text?: string;
  appointment_id?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorReview {
  id: string;
  doctor_id: string;
  patient_id: string;
  rating: number; // 1-5
  review_text?: string;
  appointment_id?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  review_type: 'clinic' | 'doctor';
  hospital_user_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
}

// Phase 1: Messaging
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  appointment_id?: string;
  clinic_id?: string;
  subject?: string;
  message_text: string;
  is_read: boolean;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageThread {
  id: string;
  patient_id: string;
  hospital_id: string;
  appointment_id?: string;
  clinic_id?: string;
  last_message_at: string;
  created_at: string;
}
