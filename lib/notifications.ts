import { createClient } from "@/lib/supabase/client";

export interface NotificationData {
  type: 'appointment_created' | 'appointment_accepted' | 'appointment_declined' | 'appointment_reminder';
  appointmentId: string;
  patientId?: string;
  hospitalId?: string;
  clinicId: string;
  message: string;
}

/**
 * Create in-app notification record in database
 * Supports both patient and hospital notifications
 */
export async function createNotification(data: NotificationData): Promise<void> {
  const supabase = createClient();
  
  try {
    // Validate that either patientId or hospitalId is provided
    if (!data.patientId && !data.hospitalId) {
      throw new Error('Either patientId or hospitalId must be provided');
    }

    const notificationData: any = {
      type: data.type,
      appointment_id: data.appointmentId,
      clinic_id: data.clinicId,
      message: data.message,
      read: false,
    };

    // Set patient_id or hospital_id (mutually exclusive)
    if (data.patientId) {
      notificationData.patient_id = data.patientId;
      notificationData.hospital_id = null;
    } else if (data.hospitalId) {
      notificationData.hospital_id = data.hospitalId;
      notificationData.patient_id = null;
    }

    const { error } = await supabase.from('notifications').insert(notificationData);
    
    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are non-critical
  }
}
