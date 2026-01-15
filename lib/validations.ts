import { z } from "zod";

// ============================================================================
// APPOINTMENT VALIDATIONS
// ============================================================================

export const BookingSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  clinicId: z.string().uuid("Invalid clinic ID"),
  doctorId: z.string().uuid("Invalid doctor ID"),
  slotId: z.string().uuid("Invalid slot ID"),
  reason: z.string().optional(),
});

export const AppointmentUpdateSchema = z.object({
  status: z.enum(["pending", "accepted", "declined", "scheduled", "completed", "cancelled", "no_show"]),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const AppointmentRescheduleSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  newSlotId: z.string().uuid("Invalid slot ID"),
});

export const AppointmentCancelSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  reason: z.string().min(1, "Cancellation reason is required").optional(),
});

// ============================================================================
// CLINIC VALIDATIONS
// ============================================================================

export const ClinicSchema = z.object({
  name: z.string().min(1, "Clinic name is required").max(200, "Clinic name is too long"),
  department: z.string().min(1, "Department is required").max(100, "Department name is too long"),
  specialties: z.array(z.string()).default([]).optional(),
  description: z.string().max(1000, "Description is too long").optional(),
  hospitalId: z.string().uuid("Invalid hospital ID"),
});

export const ClinicUpdateSchema = ClinicSchema.partial().extend({
  id: z.string().uuid("Invalid clinic ID"),
});

// ============================================================================
// DOCTOR VALIDATIONS
// ============================================================================

export const DoctorSchema = z.object({
  name: z.string().min(1, "Doctor name is required").max(200, "Doctor name is too long"),
  specialization: z.string().min(1, "Specialization is required").max(100, "Specialization is too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(20, "Phone number is too long").optional(),
  clinicId: z.string().uuid("Invalid clinic ID"),
});

export const DoctorUpdateSchema = DoctorSchema.partial().extend({
  id: z.string().uuid("Invalid doctor ID"),
});

// ============================================================================
// APPOINTMENT SLOT VALIDATIONS
// ============================================================================

export const AppointmentSlotSchema = z.object({
  clinicId: z.string().uuid("Invalid clinic ID"),
  doctorId: z.string().uuid("Invalid doctor ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format"),
}).refine(
  (data) => {
    // Validate that end time is after start time
    const start = new Date(`2000-01-01T${data.startTime}`);
    const end = new Date(`2000-01-01T${data.endTime}`);
    return end > start;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
).refine(
  (data) => {
    // Validate that date is not in the past
    const slotDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return slotDate >= today;
  },
  {
    message: "Appointment date cannot be in the past",
    path: ["date"],
  }
);

export const AppointmentSlotUpdateSchema = AppointmentSlotSchema.partial().extend({
  id: z.string().uuid("Invalid slot ID"),
  isAvailable: z.boolean().optional(),
});

// ============================================================================
// HOSPITAL VALIDATIONS
// ============================================================================

export const HospitalSchema = z.object({
  name: z.string().min(1, "Hospital name is required").max(200, "Hospital name is too long"),
  address: z.string().min(1, "Address is required").max(500, "Address is too long"),
  city: z.string().min(1, "City is required").max(100, "City name is too long"),
  state: z.string().min(1, "State is required").max(100, "State name is too long"),
  zipCode: z.string().min(1, "Zip code is required").max(20, "Zip code is too long"),
  phone: z.string().min(1, "Phone number is required").max(20, "Phone number is too long"),
  email: z.string().email("Invalid email address"),
  description: z.string().max(1000, "Description is too long").optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const HospitalUpdateSchema = HospitalSchema.partial();

// ============================================================================
// FAVORITE CLINIC VALIDATIONS
// ============================================================================

export const FavoriteClinicSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  clinicId: z.string().uuid("Invalid clinic ID"),
});

// ============================================================================
// NOTIFICATION VALIDATIONS
// ============================================================================

export const NotificationSchema = z.object({
  type: z.enum(["appointment_created", "appointment_accepted", "appointment_declined", "appointment_reminder"]),
  appointmentId: z.string().uuid("Invalid appointment ID"),
  patientId: z.string().uuid("Invalid patient ID"),
  clinicId: z.string().uuid("Invalid clinic ID"),
  message: z.string().min(1, "Message is required").max(500, "Message is too long"),
});

// ============================================================================
// VALIDATION HELPER TYPES
// ============================================================================

export type BookingInput = z.infer<typeof BookingSchema>;
export type AppointmentUpdateInput = z.infer<typeof AppointmentUpdateSchema>;
export type AppointmentRescheduleInput = z.infer<typeof AppointmentRescheduleSchema>;
export type AppointmentCancelInput = z.infer<typeof AppointmentCancelSchema>;
export type ClinicInput = z.infer<typeof ClinicSchema>;
export type ClinicUpdateInput = z.infer<typeof ClinicUpdateSchema>;
export type DoctorInput = z.infer<typeof DoctorSchema>;
export type DoctorUpdateInput = z.infer<typeof DoctorUpdateSchema>;
export type AppointmentSlotInput = z.infer<typeof AppointmentSlotSchema>;
export type AppointmentSlotUpdateInput = z.infer<typeof AppointmentSlotUpdateSchema>;
export type HospitalInput = z.infer<typeof HospitalSchema>;
export type HospitalUpdateInput = z.infer<typeof HospitalUpdateSchema>;
export type FavoriteClinicInput = z.infer<typeof FavoriteClinicSchema>;
export type NotificationInput = z.infer<typeof NotificationSchema>;
