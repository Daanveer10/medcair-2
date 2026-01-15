"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, MapPin, User, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Prevent static generation - requires authentication and dynamic params
export const dynamic = 'force-dynamic';

interface Slot {
  id: string;
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  slot_status?: 'available' | 'booked' | 'pending' | 'unavailable';
  doctor: {
    id: string;
    name: string;
    specialization: string;
  };
}

interface Clinic {
  id: string;
  name: string;
  department: string;
  specialties: string[];
  hospital: {
    name: string;
    address: string;
    city: string;
  };
}

export default function ClinicPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    loadClinicData();

    // Set up real-time subscription for appointment changes
    const channel = supabase
      .channel('appointment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${params.id}`
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          // Reload clinic data when appointments change
          loadClinicData();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  const loadClinicData = async () => {
    try {
      // Load clinic info
      const { data: clinicData, error: clinicError } = await supabase
        .from("clinics")
        .select(`
          id,
          name,
          department,
          specialties,
          hospital:hospitals (
            id,
            name,
            address,
            city
          )
        `)
        .eq("id", params.id)
        .single();

      if (clinicError) throw clinicError;

      // Transform hospital relation (Supabase returns as array)
      const hospitalData = Array.isArray(clinicData.hospital) 
        ? clinicData.hospital[0] 
        : clinicData.hospital;

      setClinic({
        id: clinicData.id,
        name: clinicData.name,
        department: clinicData.department,
        specialties: clinicData.specialties || [],
        hospital: {
          name: hospitalData?.name || "Unknown",
          address: hospitalData?.address || "Unknown",
          city: hospitalData?.city || "Unknown",
        },
      });

      // Load slots for next 7 days
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const { data: slotsData, error: slotsError } = await supabase
        .from("appointment_slots")
        .select(`
          id,
          doctor_id,
          date,
          start_time,
          end_time,
          is_available,
          doctor:doctors (
            id,
            name,
            specialization
          )
        `)
        .eq("clinic_id", params.id)
        .gte("date", today.toISOString().split("T")[0])
        .lte("date", nextWeek.toISOString().split("T")[0])
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (slotsError) throw slotsError;

      // Get all appointments for these slots to check which are booked/pending
      const slotIds = (slotsData || []).map(s => s.id);
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("slot_id, status, patient_id")
        .in("slot_id", slotIds)
        .in("status", ["pending", "accepted", "scheduled"]);

      // Get current user's profile to check if they have pending appointments
      const { data: { user } } = await supabase.auth.getUser();
      let currentPatientId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        currentPatientId = profile?.id || null;
      }

      // Separate booked (accepted/scheduled) and pending appointments
      const bookedSlotIds = new Set(
        (appointmentsData || [])
          .filter(apt => apt.status === "accepted" || apt.status === "scheduled")
          .map(apt => apt.slot_id)
      );

      // Pending appointments by current user (waiting for response)
      const pendingByCurrentUser = new Set(
        (appointmentsData || [])
          .filter(apt => apt.status === "pending" && apt.patient_id === currentPatientId)
          .map(apt => apt.slot_id)
      );

      // Pending appointments by other users (unavailable)
      const pendingByOthers = new Set(
        (appointmentsData || [])
          .filter(apt => apt.status === "pending" && apt.patient_id !== currentPatientId)
          .map(apt => apt.slot_id)
      );

      // Transform slots data - handle doctor relation (Supabase returns as array)
      const transformedSlots = (slotsData || []).map((slot: any) => {
        const doctorData = Array.isArray(slot.doctor) 
          ? slot.doctor[0] 
          : slot.doctor;
        
        const isBooked = bookedSlotIds.has(slot.id);
        const isPendingByMe = pendingByCurrentUser.has(slot.id);
        const isPendingByOthers = pendingByOthers.has(slot.id);
        
        // Determine slot status
        let slotStatus: 'available' | 'booked' | 'pending' | 'unavailable' = 'available';
        if (isBooked) {
          slotStatus = 'booked';
        } else if (isPendingByMe) {
          slotStatus = 'pending';
        } else if (isPendingByOthers) {
          slotStatus = 'unavailable';
        }
        
        return {
          id: slot.id,
          doctor_id: slot.doctor_id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: slot.is_available && !isBooked && !isPendingByOthers, // Available if not booked and not pending by others
          slot_status: slotStatus, // Track status for UI display
          doctor: {
            id: doctorData?.id || "",
            name: doctorData?.name || "Unknown",
            specialization: doctorData?.specialization || "Unknown",
          },
        };
      });

      setSlots(transformedSlots);
    } catch (error) {
      const { handleError } = await import("@/lib/utils");
      handleError(error, { action: "loadClinicData", resource: "clinics" });
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (slotId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) return;

    const slot = slots.find(s => s.id === slotId);
    if (!slot || !slot.is_available) {
      toast.error("Slot Unavailable", {
        description: "This slot is no longer available. Please select another slot.",
      });
      loadClinicData(); // Reload to refresh slot availability
      return;
    }

    // Double-check slot is not booked or pending
    const { data: existingAppointment } = await supabase
      .from("appointments")
      .select("id, status")
      .eq("slot_id", slotId)
      .in("status", ["pending", "accepted", "scheduled"])
      .single();

    if (existingAppointment) {
      if (existingAppointment.status === "pending") {
        toast.warning("Slot Pending", {
          description: "This slot is currently pending approval. Please select another slot.",
        });
      } else {
        toast.error("Slot Booked", {
          description: "This slot has already been booked. Please select another slot.",
        });
      }
      loadClinicData();
      return;
    }

    try {
      // Validate booking data
      const clinicId = Array.isArray(params.id) ? params.id[0] : params.id;
      if (!clinicId) {
        toast.error("Invalid Clinic", {
          description: "Invalid clinic information. Please try again.",
        });
        return;
      }

      const { BookingSchema } = await import("@/lib/validations");
      const { validateData } = await import("@/lib/utils");
      
      const validation = validateData(BookingSchema, {
        patientId: profile.id,
        clinicId: clinicId,
        doctorId: slot.doctor_id,
        slotId: slotId,
      });

      if (!validation.success) {
        toast.error("Validation Failed", {
          description: validation.error?.message || "Invalid booking data. Please try again.",
        });
        return;
      }

      // Create appointment with pending status (waiting for hospital approval)
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: validation.data.patientId,
          clinic_id: validation.data.clinicId,
          doctor_id: validation.data.doctorId,
          slot_id: validation.data.slotId,
          appointment_date: slot.date,
          appointment_time: slot.start_time,
          status: "pending", // Start as pending, hospital will accept/decline
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Don't update slot availability yet - wait for hospital approval
      // Slot will show as unavailable to others but pending to the requester

      // Create in-app notification for patient
      try {
        const { createNotification } = await import("@/lib/notifications");
        const clinicId = Array.isArray(params.id) ? params.id[0] : params.id;
        if (!clinicId) return;
        
        const { data: clinicInfo } = await supabase
          .from("clinics")
          .select("name")
          .eq("id", clinicId)
          .single();

        if (clinicInfo && appointment) {
          await createNotification({
            type: 'appointment_created',
            appointmentId: appointment.id,
            patientId: profile.id,
            clinicId: clinicId,
            message: `Your appointment request for ${slot.date} at ${slot.start_time} with ${slot.doctor.name} at ${clinicInfo.name} has been submitted. Waiting for hospital approval.`
          });
        }
      } catch (error) {
        const { handleError } = await import("@/lib/utils");
        handleError(error, { action: "createNotification", resource: "notifications" });
        // Non-critical, continue
      }

      toast.success("Appointment Requested", {
        description: "The hospital will review and respond shortly. You can check the status in 'My Appointments'.",
      });
      loadClinicData(); // Reload to show updated status
    } catch (error) {
      const { handleError } = await import("@/lib/utils");
      const errorResponse = handleError(error, { action: "bookAppointment", resource: "appointments" });
      toast.error("Booking Failed", {
        description: errorResponse.error?.message || "Failed to book appointment. This slot may have been booked by someone else. Please try another slot.",
      });
      loadClinicData();
    }
  };

  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const availableDates = Object.keys(groupedSlots).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading clinic information...</p>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Clinic not found.</p>
            <Link href="/patient/dashboard">
              <Button className="mt-4">Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/patient/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{clinic.name}</CardTitle>
            <CardDescription>{clinic.department}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{clinic.hospital.name}</p>
                  <p className="text-sm text-gray-600">{clinic.hospital.address}, {clinic.hospital.city}</p>
                </div>
              </div>
              
              {clinic.specialties.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Specialties:</p>
                  <div className="flex flex-wrap gap-2">
                    {clinic.specialties.map((specialty, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4">Available Time Slots</h3>
          <p className="text-gray-600 mb-4">Select a date to view available slots</p>
          
          {availableDates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center py-8">No slots available at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {availableDates.map((date) => {
                const dateSlots = groupedSlots[date];
                const freeSlots = dateSlots.filter(s => s.is_available);
                const bookedSlots = dateSlots.filter(s => !s.is_available);
                
                return (
                  <Card key={date}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {new Date(date).toLocaleDateString("en-US", { 
                          weekday: "long", 
                          year: "numeric", 
                          month: "long", 
                          day: "numeric" 
                        })}
                      </CardTitle>
                      <CardDescription>
                        {freeSlots.length} available slots, {dateSlots.filter((s: any) => s.slot_status === 'booked').length} booked, {dateSlots.filter((s: any) => s.slot_status === 'pending' || s.slot_status === 'unavailable').length} pending
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dateSlots.map((slot: any) => {
                          const slotStatus = slot.slot_status || (slot.is_available ? 'available' : 'booked');
                          
                          // Determine styling based on status
                          let borderColor = "border-green-300";
                          let bgColor = "bg-green-50";
                          let hoverBg = "hover:bg-green-100";
                          let textColor = "text-gray-900";
                          let iconColor = "text-gray-600";
                          let statusIcon = <CheckCircle2 className="h-5 w-5 text-green-600" />;
                          let buttonContent = null;
                          let isDisabled = false;
                          
                          if (slotStatus === 'booked') {
                            borderColor = "border-red-300";
                            bgColor = "bg-red-100";
                            hoverBg = "";
                            textColor = "text-red-700";
                            iconColor = "text-red-600";
                            statusIcon = <XCircle className="h-5 w-5 text-red-600" />;
                            buttonContent = <Button size="sm" variant="outline" className="w-full border-red-300 text-red-700 bg-red-50 cursor-not-allowed" disabled>Booked</Button>;
                            isDisabled = true;
                          } else if (slotStatus === 'pending') {
                            borderColor = "border-yellow-400";
                            bgColor = "bg-yellow-50";
                            hoverBg = "hover:bg-yellow-100";
                            textColor = "text-yellow-800";
                            iconColor = "text-yellow-700";
                            statusIcon = <Clock className="h-5 w-5 text-yellow-600" />;
                            buttonContent = <Button size="sm" variant="outline" className="w-full border-yellow-400 text-yellow-700 bg-yellow-50 cursor-not-allowed" disabled>Waiting for Response</Button>;
                            isDisabled = true;
                          } else if (slotStatus === 'unavailable') {
                            borderColor = "border-gray-300";
                            bgColor = "bg-gray-100";
                            hoverBg = "";
                            textColor = "text-gray-600";
                            iconColor = "text-gray-500";
                            statusIcon = <XCircle className="h-5 w-5 text-gray-500" />;
                            buttonContent = <Button size="sm" variant="outline" className="w-full border-gray-300 text-gray-600 bg-gray-50 cursor-not-allowed" disabled>Unavailable</Button>;
                            isDisabled = true;
                          } else {
                            // available
                            buttonContent = (
                              <Button
                                size="sm"
                                className="w-full bg-green-600 text-white hover:bg-green-700"
                                onClick={() => handleBookAppointment(slot.id)}
                              >
                                Book Appointment
                              </Button>
                            );
                          }
                          
                          return (
                            <div
                              key={slot.id}
                              className={`p-4 rounded-lg border-2 transition-all ${borderColor} ${bgColor} ${hoverBg} ${isDisabled ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Clock className={`h-4 w-4 ${iconColor}`} />
                                  <span className={`font-medium ${textColor}`}>
                                    {slot.start_time} - {slot.end_time}
                                  </span>
                                </div>
                                {statusIcon}
                              </div>
                              <div className="flex items-center gap-2 mb-3">
                                <User className={`h-4 w-4 ${iconColor === "text-gray-600" ? "text-gray-400" : iconColor}`} />
                                <span className={`text-sm ${textColor}`}>
                                  {slot.doctor.name} - {slot.doctor.specialization}
                                </span>
                              </div>
                              {buttonContent}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
