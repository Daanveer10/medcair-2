"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
        (payload: any) => {
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
      const slotIds = (slotsData || []).map((s: any) => s.id);
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
          .filter((apt: any) => apt.status === "accepted" || apt.status === "scheduled")
          .map((apt: any) => apt.slot_id)
      );

      // Pending appointments by current user (waiting for response)
      const pendingByCurrentUser = new Set(
        (appointmentsData || [])
          .filter((apt: any) => apt.status === "pending" && apt.patient_id === currentPatientId)
          .map((apt: any) => apt.slot_id)
      );

      // Pending appointments by other users (unavailable)
      const pendingByOthers = new Set(
        (appointmentsData || [])
          .filter((apt: any) => apt.status === "pending" && apt.patient_id !== currentPatientId)
          .map((apt: any) => apt.slot_id)
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

      // Type assertion - we know validation.success is true here
      const validatedData = validation.data as {
        patientId: string;
        clinicId: string;
        doctorId: string;
        slotId: string;
      };

      // Create appointment with pending status (waiting for hospital approval)
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: validatedData.patientId,
          clinic_id: validatedData.clinicId,
          doctor_id: validatedData.doctorId,
          slot_id: validatedData.slotId,
          appointment_date: slot.date,
          appointment_time: slot.start_time,
          status: "pending", // Start as pending, hospital will accept/decline
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Mark slot as unavailable immediately to prevent double-booking
      // This prevents other patients from booking the same slot while waiting for hospital approval
      const { error: slotUpdateError } = await supabase
        .from("appointment_slots")
        .update({ is_available: false })
        .eq("id", slotId);

      if (slotUpdateError) {
        console.error("Error updating slot availability:", slotUpdateError);
        // Non-critical - appointment is created, slot will be checked on reload
      }

      // Hospital is already notified via real-time subscription on appointments table
      // The hospital dashboard will automatically refresh when new appointments are created

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
  
  // Filter slots by selected date
  const slotsForSelectedDate = selectedDate ? (groupedSlots[selectedDate] || []) : [];
  
  // Generate time slots (15 minutes apart) for the selected date
  const generateTimeSlots = (date: string) => {
    if (!groupedSlots[date]) return [];
    const dateSlots = groupedSlots[date];
    const allTimes = new Set<string>();
    dateSlots.forEach((slot: Slot) => {
      allTimes.add(slot.start_time);
    });
    return Array.from(allTimes).sort();
  };

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
                    {clinic.specialties.map((specialty: string, idx: number) => (
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
          <Card className="mb-6 border-2 border-gray-200 shadow-md bg-white">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b-2 border-gray-200">
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-green-600" />
                Select Date & Time
              </CardTitle>
              <CardDescription className="text-gray-700 font-medium mt-2">
                Choose your preferred date first, then select an available time slot
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {availableDates.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-700 mb-2">No slots available</p>
                  <p className="text-gray-600">Please check back later for available appointments.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Date Selection */}
                  <div>
                    <Label className="text-base font-semibold text-gray-900 mb-3 block">
                      Select Date:
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {availableDates.map((date) => {
                        const dateSlots = groupedSlots[date];
                        const availableCount = dateSlots.filter(s => s.slot_status === 'available' || (s.is_available && !s.slot_status)).length;
                        const isSelected = selectedDate === date;
                        
                        return (
                          <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? "border-green-600 bg-green-50 shadow-md"
                                : "border-gray-300 bg-white hover:border-green-400 hover:bg-green-50/50"
                            }`}
                          >
                            <div className={`font-bold text-sm mb-1 ${
                              isSelected ? "text-green-700" : "text-gray-700"
                            }`}>
                              {new Date(date).toLocaleDateString("en-US", { weekday: "short" })}
                            </div>
                            <div className={`font-semibold text-lg ${
                              isSelected ? "text-green-900" : "text-gray-900"
                            }`}>
                              {new Date(date).toLocaleDateString("en-US", { day: "numeric" })}
                            </div>
                            <div className={`text-xs mt-1 ${
                              isSelected ? "text-green-700" : "text-gray-600"
                            }`}>
                              {new Date(date).toLocaleDateString("en-US", { month: "short" })}
                            </div>
                            <div className={`text-xs mt-2 font-medium ${
                              isSelected ? "text-green-700" : "text-gray-500"
                            }`}>
                              {availableCount} available
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slot Selection for Selected Date */}
                  {selectedDate && slotsForSelectedDate.length > 0 && (
                    <div className="border-t-2 border-gray-200 pt-6">
                      <Label className="text-base font-semibold text-gray-900 mb-3 block">
                        Available Time Slots for {new Date(selectedDate).toLocaleDateString("en-US", { 
                          weekday: "long", 
                          year: "numeric", 
                          month: "long", 
                          day: "numeric" 
                        })}:
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {slotsForSelectedDate.map((slot: any) => {
                          const slotStatus = slot.slot_status || (slot.is_available ? 'available' : 'booked');
                          
                          // Determine styling based on status - improved contrast
                          let borderColor = "border-green-500";
                          let bgColor = "bg-white";
                          let hoverBg = "hover:bg-green-50 hover:border-green-600";
                          let textColor = "text-gray-900";
                          let timeTextColor = "text-gray-900 font-bold";
                          let iconColor = "text-green-600";
                          let statusIcon = null;
                          let buttonContent = null;
                          let isDisabled = false;
                          
                          if (slotStatus === 'booked') {
                            borderColor = "border-red-400";
                            bgColor = "bg-red-50";
                            hoverBg = "";
                            textColor = "text-red-900";
                            timeTextColor = "text-red-900 font-bold";
                            iconColor = "text-red-600";
                            statusIcon = <XCircle className="h-5 w-5 text-red-600" />;
                            buttonContent = (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full border-red-400 text-red-900 bg-red-50 hover:bg-red-50 cursor-not-allowed font-semibold" 
                                disabled
                              >
                                Booked
                              </Button>
                            );
                            isDisabled = true;
                          } else if (slotStatus === 'pending') {
                            borderColor = "border-yellow-500";
                            bgColor = "bg-yellow-50";
                            hoverBg = "hover:bg-yellow-100";
                            textColor = "text-yellow-900";
                            timeTextColor = "text-yellow-900 font-bold";
                            iconColor = "text-yellow-600";
                            statusIcon = <Clock className="h-5 w-5 text-yellow-600" />;
                            buttonContent = (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full border-yellow-500 text-yellow-900 bg-yellow-50 hover:bg-yellow-50 cursor-not-allowed font-semibold" 
                                disabled
                              >
                                Pending
                              </Button>
                            );
                            isDisabled = true;
                          } else if (slotStatus === 'unavailable') {
                            borderColor = "border-gray-400";
                            bgColor = "bg-gray-100";
                            hoverBg = "";
                            textColor = "text-gray-700";
                            timeTextColor = "text-gray-700 font-bold";
                            iconColor = "text-gray-600";
                            statusIcon = <XCircle className="h-5 w-5 text-gray-600" />;
                            buttonContent = (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full border-gray-400 text-gray-700 bg-gray-100 hover:bg-gray-100 cursor-not-allowed font-semibold" 
                                disabled
                              >
                                Unavailable
                              </Button>
                            );
                            isDisabled = true;
                          } else {
                            // available - high contrast
                            buttonContent = (
                              <Button
                                size="sm"
                                className="w-full bg-green-600 text-white hover:bg-green-700 font-semibold shadow-sm hover:shadow-md transition-all"
                                onClick={() => handleBookAppointment(slot.id)}
                              >
                                Book Now
                              </Button>
                            );
                          }
                          
                          // Calculate end time (15 minutes after start time)
                          const [hours, minutes] = slot.start_time.split(':').map(Number);
                          const startDate = new Date();
                          startDate.setHours(hours, minutes, 0, 0);
                          const endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
                          const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
                          
                          return (
                            <div
                              key={slot.id}
                              className={`p-4 rounded-lg border-2 transition-all ${borderColor} ${bgColor} ${hoverBg} ${isDisabled ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'} shadow-sm`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Clock className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
                                  <div>
                                    <div className={`text-lg ${timeTextColor}`}>
                                      {slot.start_time}
                                    </div>
                                    <div className={`text-xs ${textColor} opacity-75`}>
                                      - {endTime}
                                    </div>
                                  </div>
                                </div>
                                {statusIcon}
                              </div>
                              <div className="mb-3 pb-3 border-b border-gray-200">
                                <div className={`text-xs font-semibold mb-1 ${textColor} opacity-80`}>
                                  Doctor:
                                </div>
                                <div className={`text-sm font-medium ${textColor}`}>
                                  {slot.doctor.name}
                                </div>
                                <div className={`text-xs ${textColor} opacity-70 mt-1`}>
                                  {slot.doctor.specialization}
                                </div>
                              </div>
                              {buttonContent}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedDate && slotsForSelectedDate.length === 0 && (
                    <div className="border-t-2 border-gray-200 pt-6 text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-semibold mb-1">No slots available</p>
                      <p className="text-gray-600 text-sm">Please select another date.</p>
                    </div>
                  )}

                  {!selectedDate && (
                    <div className="border-t-2 border-gray-200 pt-6 text-center py-8 bg-gray-50 rounded-lg">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-semibold mb-1">Select a date above</p>
                      <p className="text-gray-600 text-sm">Choose a date to see available time slots</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
