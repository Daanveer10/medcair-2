"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, MapPin, User, CheckCircle2, XCircle, History, Sparkles, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppointmentCardSkeleton } from "@/components/skeleton-loader";

// Prevent static generation - requires authentication
export const dynamic = 'force-dynamic';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason?: string;
  slot_id?: string;
  clinic_id?: string;
  clinic: {
    name: string;
    department: string;
  };
  hospital: {
    name: string;
    address: string;
  };
  doctor: {
    name: string;
    specialization: string;
  };
  follow_ups?: FollowUp[];
}

interface FollowUp {
  id: string;
  follow_up_date: string;
  follow_up_time: string;
  status: string;
  notes?: string;
}

export default function PatientAppointments() {
  const router = useRouter();
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrevious, setShowPrevious] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [showPrevious]);

  const loadAppointments = async () => {
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

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let query = supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          reason,
          slot_id,
          clinic_id,
          clinic:clinics (
            name,
            department
          ),
          hospital:hospitals!inner (
            name,
            address
          ),
          doctor:doctors (
            name,
            specialization
          )
        `)
        .eq("patient_id", profile.id);

      // Filter based on showPrevious state
      if (showPrevious) {
        // Show previous appointments (past dates or completed/cancelled)
        query = query.or(`appointment_date.lt.${today.toISOString().split("T")[0]},status.eq.completed,status.eq.cancelled`);
      } else {
        // Show active appointments (future dates with scheduled status)
        query = query.gte("appointment_date", today.toISOString().split("T")[0]).eq("status", "scheduled");
      }

      const { data, error } = await query
        .order("appointment_date", showPrevious ? { ascending: false } : { ascending: true })
        .order("appointment_time", showPrevious ? { ascending: false } : { ascending: true });

      if (error) throw error;

      // Load follow-ups for each appointment and transform data
      const appointmentsWithFollowUps = await Promise.all(
        (data || []).map(async (apt: any) => {
          const { data: followUps } = await supabase
            .from("follow_ups")
            .select("*")
            .eq("appointment_id", apt.id)
            .order("follow_up_date", { ascending: true });

          // Transform relations from arrays to objects
          return {
            id: apt.id,
            appointment_date: apt.appointment_date,
            appointment_time: apt.appointment_time,
            status: apt.status,
            reason: apt.reason,
            slot_id: apt.slot_id,
            clinic_id: apt.clinic_id,
            clinic: {
              name: Array.isArray(apt.clinic) ? apt.clinic[0]?.name : apt.clinic?.name || "Unknown",
              department: Array.isArray(apt.clinic) ? apt.clinic[0]?.department : apt.clinic?.department || "Unknown",
            },
            hospital: {
              name: Array.isArray(apt.hospital) ? apt.hospital[0]?.name : apt.hospital?.name || "Unknown",
              address: Array.isArray(apt.hospital) ? apt.hospital[0]?.address : apt.hospital?.address || "Unknown",
            },
            doctor: {
              name: Array.isArray(apt.doctor) ? apt.doctor[0]?.name : apt.doctor?.name || "Unknown",
              specialization: Array.isArray(apt.doctor) ? apt.doctor[0]?.specialization : apt.doctor?.specialization || "Unknown",
            },
            follow_ups: followUps || [],
          };
        })
      );

      setAppointments(appointmentsWithFollowUps);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: "cancelled",
          reason: cancelReason || "Cancelled by patient"
        })
        .eq("id", selectedAppointment.id);

      if (error) throw error;

      // Free up the slot
      if (selectedAppointment.slot_id) {
        await supabase
          .from("appointment_slots")
          .update({ is_available: true })
          .eq("id", selectedAppointment.slot_id);
      }

      // Create notification
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profile && selectedAppointment.clinic_id) {
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          type: 'appointment_declined',
          appointmentId: selectedAppointment.id,
          patientId: profile.id,
          clinicId: selectedAppointment.clinic_id,
          message: `Your appointment on ${selectedAppointment.appointment_date} at ${selectedAppointment.appointment_time} has been cancelled.`
        });
      }

      alert("Appointment cancelled successfully!");
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Failed to cancel appointment.");
    }
  };

  const handleRescheduleClick = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
    
    // Load available slots for this clinic
    if (appointment.clinic_id) {
      try {
        const { data } = await supabase
          .from("appointment_slots")
          .select(`
            id,
            date,
            start_time,
            end_time,
            doctor:doctors (
              name,
              specialization
            )
          `)
          .eq("clinic_id", appointment.clinic_id)
          .eq("is_available", true)
          .gte("date", new Date().toISOString().split("T")[0])
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        // Filter out slots that are already booked
        const { data: bookedSlots } = await supabase
          .from("appointments")
          .select("slot_id")
          .in("status", ["pending", "accepted", "scheduled"])
          .neq("id", appointment.id);

        const bookedSlotIds = new Set((bookedSlots || []).map(s => s.slot_id));
        const available = (data || []).filter(slot => !bookedSlotIds.has(slot.id));
        
        setAvailableSlots(available);
      } catch (error) {
        console.error("Error loading slots:", error);
      }
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment || !selectedSlot) return;

    setRescheduling(true);
    try {
      // Free up old slot
      if (selectedAppointment.slot_id) {
        await supabase
          .from("appointment_slots")
          .update({ is_available: true })
          .eq("id", selectedAppointment.slot_id);
      }

      // Get new slot details
      const newSlot = availableSlots.find(s => s.id === selectedSlot);
      if (!newSlot) throw new Error("Slot not found");

      // Update appointment with new slot
      const { error } = await supabase
        .from("appointments")
        .update({
          slot_id: selectedSlot,
          appointment_date: newSlot.date,
          appointment_time: newSlot.start_time,
          status: "pending" // Reset to pending for hospital approval
        })
        .eq("id", selectedAppointment.id);

      if (error) throw error;

      // Mark new slot as unavailable
      await supabase
        .from("appointment_slots")
        .update({ is_available: false })
        .eq("id", selectedSlot);

      // Create notification
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profile && selectedAppointment.clinic_id) {
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          type: 'appointment_created',
          appointmentId: selectedAppointment.id,
          patientId: profile.id,
          clinicId: selectedAppointment.clinic_id,
          message: `Your appointment has been rescheduled to ${newSlot.date} at ${newSlot.start_time}. Waiting for hospital approval.`
        });
      }

      alert("Appointment rescheduled successfully! Waiting for hospital approval.");
      setShowRescheduleModal(false);
      setSelectedSlot("");
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      alert("Failed to reschedule appointment.");
    } finally {
      setRescheduling(false);
    }
  };

  const activeAppointments = appointments.filter(
    apt => apt.status === "scheduled" && new Date(apt.appointment_date) >= new Date()
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/patient/dashboard">
          <Button variant="ghost" className="mb-6 hover:bg-pink-100">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-green-600" />
            <h2 className="text-4xl font-bold text-black">
              My Appointments
            </h2>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={!showPrevious ? "default" : "outline"}
              onClick={() => setShowPrevious(false)}
              className={!showPrevious ? "bg-green-600 text-white" : ""}
            >
              Active Appointments
              {!showPrevious && activeAppointments.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">
                  {activeAppointments.length}
                </span>
              )}
            </Button>
            <Button
              variant={showPrevious ? "default" : "outline"}
              onClick={() => setShowPrevious(true)}
              className={showPrevious ? "bg-green-600 text-white" : ""}
            >
              <History className="h-4 w-4 mr-2" />
              Previous Appointments
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <AppointmentCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <Card className="border border-gray-200 shadow-sm bg-white">
                <CardContent className="pt-6 text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-bold text-black mb-2">
                    {showPrevious ? "No previous appointments" : "No active appointments"}
                  </p>
                  <p className="text-gray-600 mb-4">
                    {showPrevious 
                      ? "You haven't had any previous appointments yet." 
                      : "You don't have any upcoming appointments. Book one now!"}
                  </p>
                  {!showPrevious && (
                    <Link href="/patient/dashboard">
                      <Button className="bg-green-600 text-white hover:bg-green-700">
                        Browse Clinics
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              appointments.map((appointment) => (
                <Card
                  key={appointment.id}
                  className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white transform hover:-translate-y-1"
                >
                  <div className={`absolute top-0 left-0 right-0 h-2 ${
                    appointment.status === "scheduled" ? "bg-green-600" :
                    appointment.status === "completed" ? "bg-green-600" :
                    appointment.status === "cancelled" ? "bg-red-500" :
                    "bg-gray-400"
                  }`}></div>
                  <CardHeader className="pt-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-1 group-hover:text-pink-600 transition-colors">
                          {appointment.clinic.name}
                        </CardTitle>
                        <CardDescription className="font-medium">{appointment.clinic.department}</CardDescription>
                      </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${
                            appointment.status === "scheduled"
                              ? "bg-green-600 text-white"
                              : appointment.status === "completed"
                              ? "bg-green-600 text-white"
                              : appointment.status === "cancelled"
                              ? "bg-red-500 text-white"
                              : "bg-gray-400 text-white"
                          }`}
                        >
                        {appointment.status.toUpperCase()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500">DATE</p>
                            <span className="font-semibold text-gray-900">
                              {new Date(appointment.appointment_date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Clock className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500">TIME</p>
                            <span className="font-semibold text-gray-900">{appointment.appointment_time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500">DOCTOR</p>
                            <span className="font-semibold text-gray-900">
                              {appointment.doctor.name} - {appointment.doctor.specialization}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-cyan-100 rounded-lg">
                            <MapPin className="h-4 w-4 text-cyan-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500">LOCATION</p>
                            <span className="font-semibold text-gray-900">{appointment.hospital.name}</span>
                            <p className="text-xs text-gray-600">{appointment.hospital.address}</p>
                          </div>
                        </div>
                      </div>

                      {appointment.reason && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-bold text-gray-700 mb-1">Reason:</p>
                          <p className="text-sm text-gray-600">{appointment.reason}</p>
                        </div>
                      )}

                      {appointment.follow_ups && appointment.follow_ups.length > 0 && (
                        <div>
                          <p className="text-sm font-bold text-gray-700 mb-2">Follow-ups:</p>
                          <div className="space-y-2">
                            {appointment.follow_ups.map((followUp) => (
                              <div
                                key={followUp.id}
                                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold">
                                    {new Date(followUp.follow_up_date).toLocaleDateString()} at {followUp.follow_up_time}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-bold ${
                                      followUp.status === "completed"
                                        ? "bg-green-500 text-white"
                                        : followUp.status === "pending"
                                        ? "bg-yellow-500 text-white"
                                        : "bg-red-500 text-white"
                                    }`}
                                  >
                                    {followUp.status}
                                  </span>
                                </div>
                                {followUp.notes && (
                                  <p className="text-xs text-gray-600 mt-1">{followUp.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {appointment.status === "scheduled" && !showPrevious && (
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRescheduleClick(appointment)}
                            className="border-green-600 text-green-600 hover:bg-green-50"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reschedule
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelClick(appointment)}
                            className="bg-red-500 text-white hover:bg-red-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Appointment
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Cancel Appointment</CardTitle>
                <CardDescription>
                  Are you sure you want to cancel this appointment?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cancelReason">Reason for cancellation (optional)</Label>
                  <Input
                    id="cancelReason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason("");
                      setSelectedAppointment(null);
                    }}
                    className="flex-1"
                  >
                    Keep Appointment
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelAppointment}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    Cancel Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Reschedule Appointment</CardTitle>
                <CardDescription>
                  Select a new date and time for your appointment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No available slots found. Please try again later.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`p-3 border-2 rounded-lg text-left transition-all ${
                            selectedSlot === slot.id
                              ? "border-green-600 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-semibold text-gray-900">
                            {new Date(slot.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {slot.start_time} - {slot.end_time}
                          </div>
                          {slot.doctor && (
                            <div className="text-xs text-gray-500 mt-1">
                              Dr. {Array.isArray(slot.doctor) ? slot.doctor[0]?.name : slot.doctor?.name}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRescheduleModal(false);
                          setSelectedSlot("");
                          setSelectedAppointment(null);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRescheduleAppointment}
                        disabled={!selectedSlot || rescheduling}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {rescheduling ? "Rescheduling..." : "Confirm Reschedule"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
