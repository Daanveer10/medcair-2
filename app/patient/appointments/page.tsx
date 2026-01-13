"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, MapPin, User, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

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

  useEffect(() => {
    loadAppointments();
  }, []);

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
      const { data, error } = await supabase
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
        .eq("patient_id", profile.id)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      if (error) throw error;

      // Load follow-ups for each appointment
      const appointmentsWithFollowUps = await Promise.all(
        (data || []).map(async (apt: any) => {
          const { data: followUps } = await supabase
            .from("follow_ups")
            .select("*")
            .eq("appointment_id", apt.id)
            .order("follow_up_date", { ascending: true });

          return {
            ...apt,
            follow_ups: followUps || [],
          };
        })
      );

      setAppointments(appointmentsWithFollowUps as Appointment[]);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;

      // Free up the slot
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (appointment) {
        // Note: In a real app, you'd need to get the slot_id from the appointment
        // For now, we'll just update the appointment status
      }

      alert("Appointment cancelled successfully!");
      loadAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Failed to cancel appointment.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/patient/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <h2 className="text-3xl font-bold mb-8">My Appointments</h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading appointments...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-500 text-center py-8">No appointments yet.</p>
                </CardContent>
              </Card>
            ) : (
              appointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{(appointment.clinic as any)?.name}</CardTitle>
                        <CardDescription>{(appointment.clinic as any)?.department}</CardDescription>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          appointment.status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : appointment.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : appointment.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {new Date(appointment.appointment_date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{appointment.appointment_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{(appointment.doctor as any)?.name} - {(appointment.doctor as any)?.specialization}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{(appointment.hospital as any)?.name}</span>
                        </div>
                      </div>

                      {appointment.reason && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                          <p className="text-sm text-gray-600">{appointment.reason}</p>
                        </div>
                      )}

                      {appointment.follow_ups && appointment.follow_ups.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Follow-ups:</p>
                          <div className="space-y-2">
                            {appointment.follow_ups.map((followUp) => (
                              <div
                                key={followUp.id}
                                className="p-3 bg-gray-50 rounded-lg border"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">
                                    {new Date(followUp.follow_up_date).toLocaleDateString()} at {followUp.follow_up_time}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded text-xs ${
                                      followUp.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : followUp.status === "pending"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-700"
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

                      {appointment.status === "scheduled" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelAppointment(appointment.id)}
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
