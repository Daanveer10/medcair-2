import { createClient } from "@/lib/supabase/client";

export interface NotificationData {
  type: 'appointment_created' | 'appointment_accepted' | 'appointment_declined' | 'appointment_reminder';
  appointmentId: string;
  patientId: string;
  clinicId: string;
  message: string;
}

/**
 * Create in-app notification record in database
 */
export async function createNotification(data: NotificationData): Promise<void> {
  const supabase = createClient();
  
  try {
    const { error } = await supabase.from('notifications').insert({
      type: data.type,
      appointment_id: data.appointmentId,
      patient_id: data.patientId,
      clinic_id: data.clinicId,
      message: data.message,
      read: false,
    });
    
    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are non-critical
  }
}
