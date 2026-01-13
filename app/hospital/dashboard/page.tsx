"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, Plus, LogOut, Stethoscope, Settings } from "lucide-react";
import Link from "next/link";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patient: {
    full_name: string;
  };
  clinic: {
    name: string;
  };
  doctor: {
    name: string;
  };
}

export default function HospitalDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [hospitalId, setHospitalId] = useState("");

  useEffect(() => {
    checkUser();
    loadAppointments();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, role, id")
      .eq("user_id", user.id)
      .single();
    
    if (profile?.role !== "hospital") {
      router.push("/patient/dashboard");
      return;
    }
    
    setUserName(profile.full_name || "Hospital Admin");
    
    // Get hospital ID
    const { data: hospital } = await supabase
      .from("hospitals")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    if (hospital) {
      setHospitalId(hospital.id);
    }
  };

  const loadAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: hospital } = await supabase
        .from("hospitals")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!hospital) return;

      // Get all clinics for this hospital
      const { data: clinics } = await supabase
        .from("clinics")
        .select("id")
        .eq("hospital_id", hospital.id);

      if (!clinics || clinics.length === 0) {
        setLoading(false);
        return;
      }

      const clinicIds = clinics.map(c => c.id);

      // Get appointments for these clinics
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          patient:user_profiles!appointments_patient_id_fkey (
            full_name
          ),
          clinic:clinics (
            name
          ),
          doctor:doctors (
            name
          )
        `)
        .in("clinic_id", clinicIds)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;

      setAppointments((data || []) as Appointment[]);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const upcomingAppointments = appointments.filter(
    (apt) => apt.status === "scheduled" && new Date(apt.appointment_date) >= new Date()
  );
  const todayAppointments = upcomingAppointments.filter(
    (apt) => apt.appointment_date === new Date().toISOString().split("T")[0]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">MedCair AI - Hospital Portal</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {userName}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Hospital Dashboard</h2>
          <p className="text-gray-600">Manage appointments, schedules, and follow-ups</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Total upcoming appointments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground">All time appointments</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Appointments</h3>
            <Link href="/hospital/settings">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Manage Settings
              </Button>
            </Link>
          </div>
        </div>

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
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {new Date(appointment.appointment_date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                          <Clock className="h-4 w-4 text-gray-400 ml-4" />
                          <span>{appointment.appointment_time}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium">
                            Patient: {(appointment.patient as any)?.full_name || "N/A"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Clinic: {(appointment.clinic as any)?.name || "N/A"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Doctor: {(appointment.doctor as any)?.name || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
