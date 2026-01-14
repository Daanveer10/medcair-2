"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, MapPin, User, CheckCircle2, XCircle, History, Sparkles } from "lucide-react";
import Link from "next/link";

// Prevent static generation - requires authentication
export const dynamic = 'force-dynamic';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason?: string;
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

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) return;

      // Get slot_id from appointment
      const { data: appointmentData } = await supabase
        .from("appointments")
        .select("slot_id")
        .eq("id", appointmentId)
        .single();

      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;

      // Free up the slot
      if (appointmentData?.slot_id) {
        await supabase
          .from("appointment_slots")
          .update({ is_available: true })
          .eq("id", appointmentData.slot_id);
      }

      alert("Appointment cancelled successfully!");
      loadAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Failed to cancel appointment.");
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
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-4 font-medium">Loading appointments...</p>
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelAppointment(appointment.id)}
                          className="bg-red-500 text-white hover:bg-red-600"
                        >
                          Cancel Appointment
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
