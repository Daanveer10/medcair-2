import { createClient } from "@/lib/supabase/client";

export interface NotificationData {
  type: 'appointment_created' | 'appointment_accepted' | 'appointment_declined' | 'appointment_reminder';
  appointmentId: string;
  patientId: string;
  clinicId: string;
  message: string;
}

/**
 * Send email notification (placeholder - integrate with email service)
 * For production, use Supabase Edge Functions or services like SendGrid, Resend, etc.
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  // TODO: Integrate with email service
  // For now, we'll log it and use Supabase's built-in email if available
  console.log('Email notification:', { to, subject, body });
  
  // You can integrate with:
  // - Supabase Edge Functions + Resend/SendGrid
  // - Direct API calls to email services
  // - Supabase's built-in email (if configured)
}

/**
 * Create notification record in database
 */
export async function createNotification(data: NotificationData): Promise<void> {
  const supabase = createClient();
  
  try {
    await supabase.from('notifications').insert({
      type: data.type,
      appointment_id: data.appointmentId,
      patient_id: data.patientId,
      clinic_id: data.clinicId,
      message: data.message,
      read: false,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation(
  patientEmail: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicName: string,
  doctorName: string
): Promise<void> {
  const subject = 'Appointment Request Submitted - medcAIr';
  const body = `
    Dear Patient,

    Your appointment request has been submitted successfully.

    Appointment Details:
    - Date: ${appointmentDate}
    - Time: ${appointmentTime}
    - Clinic: ${clinicName}
    - Doctor: ${doctorName}

    The hospital will review your request and notify you once it's approved.

    Thank you for using medcAIr!
  `;

  await sendEmailNotification(patientEmail, subject, body);
}

/**
 * Send appointment status update email
 */
export async function sendAppointmentStatusUpdate(
  patientEmail: string,
  status: 'accepted' | 'declined',
  appointmentDate: string,
  appointmentTime: string,
  clinicName: string
): Promise<void> {
  const subject = status === 'accepted' 
    ? 'Appointment Confirmed - medcAIr'
    : 'Appointment Request Update - medcAIr';
  
  const body = status === 'accepted'
    ? `
      Dear Patient,

      Great news! Your appointment has been confirmed.

      Appointment Details:
      - Date: ${appointmentDate}
      - Time: ${appointmentTime}
      - Clinic: ${clinicName}

      Please arrive 10 minutes early for your appointment.

      Thank you for using medcAIr!
    `
    : `
      Dear Patient,

      We regret to inform you that your appointment request has been declined.

      Appointment Details:
      - Date: ${appointmentDate}
      - Time: ${appointmentTime}
      - Clinic: ${clinicName}

      Please select another time slot or contact the clinic directly.

      Thank you for using medcAIr!
    `;

  await sendEmailNotification(patientEmail, subject, body);
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminder(
  patientEmail: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicName: string,
  doctorName: string,
  hoursBefore: number
): Promise<void> {
  const subject = `Appointment Reminder - ${hoursBefore} hour${hoursBefore > 1 ? 's' : ''} until your appointment`;
  const body = `
    Dear Patient,

    This is a reminder about your upcoming appointment.

    Appointment Details:
    - Date: ${appointmentDate}
    - Time: ${appointmentTime}
    - Clinic: ${clinicName}
    - Doctor: ${doctorName}

    Your appointment is in ${hoursBefore} hour${hoursBefore > 1 ? 's' : ''}. Please arrive 10 minutes early.

    Thank you for using medcAIr!
  `;

  await sendEmailNotification(patientEmail, subject, body);
}
