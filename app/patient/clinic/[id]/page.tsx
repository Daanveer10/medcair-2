"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, MapPin, User, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

// Prevent static generation - requires authentication and dynamic params
export const dynamic = 'force-dynamic';

interface Slot {
  id: string;
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
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

      // Get all appointments for these slots to check which are booked
      const slotIds = (slotsData || []).map(s => s.id);
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("slot_id, status")
        .in("slot_id", slotIds)
        .eq("status", "scheduled");

      const bookedSlotIds = new Set(
        (appointmentsData || []).map(apt => apt.slot_id)
      );

      // Transform slots data - handle doctor relation (Supabase returns as array)
      const transformedSlots = (slotsData || []).map((slot: any) => {
        const doctorData = Array.isArray(slot.doctor) 
          ? slot.doctor[0] 
          : slot.doctor;
        
        const isBooked = bookedSlotIds.has(slot.id);
        
        return {
          id: slot.id,
          doctor_id: slot.doctor_id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: slot.is_available && !isBooked, // Slot is available only if not booked
          doctor: {
            id: doctorData?.id || "",
            name: doctorData?.name || "Unknown",
            specialization: doctorData?.specialization || "Unknown",
          },
        };
      });

      setSlots(transformedSlots);
    } catch (error) {
      console.error("Error loading clinic data:", error);
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
      alert("This slot is no longer available. Please select another slot.");
      loadClinicData(); // Reload to refresh slot availability
      return;
    }

    // Double-check slot is not booked
    const { data: existingAppointment } = await supabase
      .from("appointments")
      .select("id")
      .eq("slot_id", slotId)
      .eq("status", "scheduled")
      .single();

    if (existingAppointment) {
      alert("This slot has already been booked. Please select another slot.");
      loadClinicData();
      return;
    }

    try {
      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: profile.id,
          clinic_id: params.id,
          doctor_id: slot.doctor_id,
          slot_id: slotId,
          appointment_date: slot.date,
          appointment_time: slot.start_time,
          status: "scheduled",
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Update slot availability
      await supabase
        .from("appointment_slots")
        .update({ is_available: false })
        .eq("id", slotId);

      alert("Appointment booked successfully!");
      loadClinicData(); // Reload to update slot availability
    } catch (error) {
      console.error("Error booking appointment:", error);
      alert("Failed to book appointment. This slot may have been booked by someone else. Please try another slot.");
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
                        {freeSlots.length} available slots, {bookedSlots.length} booked
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dateSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              slot.is_available
                                ? "border-green-300 bg-green-50 hover:bg-green-100 hover:shadow-md"
                                : "border-red-300 bg-red-100 opacity-80 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Clock className={`h-4 w-4 ${slot.is_available ? "text-gray-600" : "text-red-600"}`} />
                                <span className={`font-medium ${slot.is_available ? "text-gray-900" : "text-red-700"}`}>
                                  {slot.start_time} - {slot.end_time}
                                </span>
                              </div>
                              {slot.is_available ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <User className={`h-4 w-4 ${slot.is_available ? "text-gray-400" : "text-red-500"}`} />
                              <span className={`text-sm ${slot.is_available ? "text-gray-600" : "text-red-600"}`}>
                                {slot.doctor.name} - {slot.doctor.specialization}
                              </span>
                            </div>
                            {slot.is_available ? (
                              <Button
                                size="sm"
                                className="w-full bg-green-600 text-white hover:bg-green-700"
                                onClick={() => handleBookAppointment(slot.id)}
                              >
                                Book Appointment
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full border-red-300 text-red-700 bg-red-50 cursor-not-allowed" 
                                disabled
                              >
                                Booked
                              </Button>
                            )}
                          </div>
                        ))}
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
