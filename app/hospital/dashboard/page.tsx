"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, Plus, LogOut, Stethoscope, Settings, Sparkles, X, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

// Prevent static generation - requires authentication
export const dynamic = 'force-dynamic';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  slot_id?: string;
  patient_id?: string | null;
  clinic_id?: string | null;
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

interface Clinic {
  id: string;
  name: string;
  department: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  clinic_id: string;
}

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  clinic_id: string;
  doctor_id: string;
}

export default function HospitalDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    checkUser();
    loadAppointments();

    // Set up real-time subscription for appointment changes
    const channel = supabase
      .channel('hospital-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          // Reload appointments when changes occur
          loadAppointments();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (showCreateModal && hospitalId) {
      loadClinics();
    }
  }, [showCreateModal, hospitalId]);

  useEffect(() => {
    if (selectedClinic) {
      loadDoctors();
      loadSlots();
    }
  }, [selectedClinic]);

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

  const loadClinics = async () => {
    if (!hospitalId) return;
    const { data } = await supabase
      .from("clinics")
      .select("id, name, department")
      .eq("hospital_id", hospitalId);
    setClinics(data || []);
  };

  const loadDoctors = async () => {
    if (!selectedClinic) return;
    const { data } = await supabase
      .from("doctors")
      .select("id, name, specialization, clinic_id")
      .eq("clinic_id", selectedClinic);
    setDoctors(data || []);
  };

  const loadSlots = async () => {
    if (!selectedClinic) return;
    const { data } = await supabase
      .from("appointment_slots")
      .select("id, date, start_time, end_time, is_available, clinic_id, doctor_id")
      .eq("clinic_id", selectedClinic)
      .eq("is_available", true)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    setSlots(data || []);
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

      // Get appointments for these clinics (including pending ones)
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          slot_id,
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

      // Transform the data to match the interface
      const transformedAppointments = (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        slot_id: apt.slot_id,
        patient_id: apt.patient_id || null,
        clinic_id: apt.clinic_id || null,
        patient: {
          full_name: Array.isArray(apt.patient) ? apt.patient[0]?.full_name : apt.patient?.full_name || "Unknown",
        },
        clinic: {
          name: Array.isArray(apt.clinic) ? apt.clinic[0]?.name : apt.clinic?.name || "Unknown",
        },
        doctor: {
          name: Array.isArray(apt.doctor) ? apt.doctor[0]?.name : apt.doctor?.name || "Unknown",
        },
      }));

      setAppointments(transformedAppointments);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !patientName || !patientEmail) return;

    setCreating(true);
    try {
      // Find patient profile by looking up user by email in auth.users
      // Note: This requires the patient to already have an account
      // First, try to get user email from auth (we'll use a workaround)
      // Since we can't access admin API from client, we'll search user_profiles
      // by checking if we can find the user through a different method
      
      // Alternative: Search in a way that works with RLS
      // Actually, hospitals can't query all user_profiles due to RLS
      // So we'll simplify: require patient to book themselves, or
      // Show a message that this feature requires patient registration
      
      alert("Note: Patient appointment booking is best done by patients themselves through the patient portal. For now, please direct patients to sign up and book through their dashboard. Alternatively, you can manage appointment slots in Settings.");
      setCreating(false);
      setShowCreateModal(false);
      return;

      // TODO: For production, create a server-side API route that can:
      // 1. Accept patient email/name
      // 2. Use admin API to find/create user
      // 3. Create appointment
      // This requires server-side code with service role key
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      alert(`Error: ${error.message || "Failed to create appointment"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: "accepted",
          updated_at: new Date().toISOString()
        })
        .eq("id", appointmentId);

      if (error) throw error;

      // Update slot availability to false since appointment is accepted
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment?.slot_id) {
        await supabase
          .from("appointment_slots")
          .update({ is_available: false })
          .eq("id", appointment.slot_id);
      }

      // Send notification to patient
      if (appointment && appointment.patient_id) {
        try {
          const { createNotification } = await import("@/lib/notifications");
          await createNotification({
            type: 'appointment_accepted',
            appointmentId: appointmentId,
            patientId: appointment.patient_id,
            clinicId: appointment.clinic_id || "",
            message: `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been accepted.`
          });
        } catch (error) {
          console.error("Error creating notification:", error);
        }
      }

      alert("Appointment accepted successfully!");
      loadAppointments(); // Reload to refresh the list
    } catch (error: any) {
      console.error("Error accepting appointment:", error);
      alert(`Error: ${error.message || "Failed to accept appointment"}`);
    }
  };

  const handleDeclineAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: "declined",
          updated_at: new Date().toISOString()
        })
        .eq("id", appointmentId);

      if (error) throw error;

      // Send notification to patient
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment && appointment.patient_id) {
        try {
          const { createNotification } = await import("@/lib/notifications");
          await createNotification({
            type: 'appointment_declined',
            appointmentId: appointmentId,
            patientId: appointment.patient_id,
            clinicId: appointment.clinic_id || "",
            message: `Your appointment request for ${appointment.appointment_date} at ${appointment.appointment_time} has been declined. Please select another time slot.`
          });
        } catch (error) {
          console.error("Error creating notification:", error);
        }
      }

      alert("Appointment declined.");
      loadAppointments(); // Reload to refresh the list
    } catch (error: any) {
      console.error("Error declining appointment:", error);
      alert(`Error: ${error.message || "Failed to decline appointment"}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const pendingAppointments = appointments.filter(
    (apt) => apt.status === "pending"
  );
  const upcomingAppointments = appointments.filter(
    (apt) => (apt.status === "scheduled" || apt.status === "accepted") && new Date(apt.appointment_date) >= new Date()
  );
  const todayAppointments = upcomingAppointments.filter(
    (apt) => apt.appointment_date === new Date().toISOString().split("T")[0]
  );

  const filteredAppointments = statusFilter === "all" 
    ? appointments 
    : appointments.filter(apt => apt.status === statusFilter);

  const stats = [
    {
      label: "Pending Requests",
      value: pendingAppointments.length,
      icon: <Clock className="h-6 w-6" />,
      gradient: "bg-yellow-500",
    },
    {
      label: "Today's Appointments",
      value: todayAppointments.length,
      icon: <Calendar className="h-6 w-6" />,
      gradient: "bg-green-600",
    },
    {
      label: "Upcoming",
      value: upcomingAppointments.length,
      icon: <Clock className="h-6 w-6" />,
      gradient: "bg-green-600",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-600 rounded-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-black">
                medcAIr - Hospital Portal
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/hospital/settings">
                <Button variant="outline" size="sm" className="flex items-center gap-2 border-2 border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium">
                  <Settings className="h-4 w-4 text-gray-900" />
                  <span className="font-medium text-gray-900">Settings</span>
                </Button>
              </Link>
              <div className="hidden sm:block text-sm font-medium text-gray-700">
                Welcome, <span className="text-black font-bold">{userName}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-gray-300 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-green-600" />
            <h2 className="text-4xl md:text-5xl font-bold text-black">
              Hospital Dashboard
            </h2>
          </div>
          <p className="text-lg text-gray-700 font-medium">Manage appointments, schedules, and patient care</p>
        </div>

        {/* Vibrant Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-lg ${stat.gradient} p-6 shadow-md transform hover:scale-105 transition-all duration-300`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm text-white">
                    {stat.icon}
                  </div>
                </div>
                <p className="text-sm font-semibold text-white opacity-90 mb-1">{stat.label}</p>
                <p className="text-4xl font-bold text-white">{stat.value}</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            </div>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-gray-900">Appointments</h3>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={statusFilter === "all" ? "bg-green-600 text-white" : ""}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "scheduled" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("scheduled")}
                className={statusFilter === "scheduled" ? "bg-green-600 text-white" : ""}
              >
                Scheduled
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                className={statusFilter === "pending" ? "bg-yellow-500 text-white" : ""}
              >
                Pending
                {pendingAppointments.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">
                    {pendingAppointments.length}
                  </span>
                )}
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
                className={statusFilter === "completed" ? "bg-green-600 text-white" : ""}
              >
                Completed
              </Button>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg font-bold"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Appointment
          </Button>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-4 font-medium">Loading appointments...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <Card className="border border-gray-200 shadow-sm bg-white">
                <CardContent className="pt-6 text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-bold text-black mb-2">No appointments found</p>
                  <p className="text-gray-600 mb-4">Create your first appointment to get started</p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Appointment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredAppointments.map((appointment) => (
                <Card
                  key={appointment.id}
                  className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white transform hover:-translate-y-1"
                >
                  <div className={`absolute top-0 left-0 right-0 h-2 ${
                    appointment.status === "pending" ? "bg-yellow-500" :
                    appointment.status === "accepted" || appointment.status === "scheduled" ? "bg-green-600" :
                    appointment.status === "completed" ? "bg-green-600" :
                    appointment.status === "declined" ? "bg-red-500" :
                    appointment.status === "cancelled" ? "bg-red-500" :
                    "bg-gray-400"
                  }`}></div>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <span className="font-bold text-lg text-gray-900">
                              {new Date(appointment.appointment_date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-700 font-semibold">{appointment.appointment_time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-12">
                          <div>
                            <p className="text-xs font-bold text-gray-500 mb-1">PATIENT</p>
                            <p className="font-semibold text-gray-900">{appointment.patient.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 mb-1">CLINIC</p>
                            <p className="font-semibold text-gray-900">{appointment.clinic.name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 mb-1">DOCTOR</p>
                            <p className="font-semibold text-gray-900">{appointment.doctor.name}</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${
                            appointment.status === "pending"
                              ? "bg-yellow-500 text-white"
                              : appointment.status === "accepted" || appointment.status === "scheduled"
                              ? "bg-green-600 text-white"
                              : appointment.status === "completed"
                              ? "bg-green-600 text-white"
                              : appointment.status === "declined" || appointment.status === "cancelled"
                              ? "bg-red-500 text-white"
                              : "bg-gray-400 text-white"
                          }`}
                        >
                          {appointment.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {appointment.status === "pending" && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 text-white hover:bg-green-700"
                          onClick={() => handleAcceptAppointment(appointment.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => handleDeclineAppointment(appointment.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white">
            <CardHeader className="bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Create New Appointment</CardTitle>
                  <CardDescription className="text-white/90 mt-1">Book an appointment for a patient</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCreateModal(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-blue-900 mb-1">Note: Patient Booking</p>
                    <p className="text-sm text-blue-800">
                      Patients can book appointments directly through the patient portal. 
                      To manage appointment slots, go to Settings to create and manage available time slots.
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">To enable direct appointment creation by hospitals,</p>
                <p className="text-sm text-gray-500 mb-6">this feature requires server-side implementation with admin API access.</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="border-2"
                  >
                    Close
                  </Button>
                  <Link href="/hospital/settings">
                    <Button
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90 font-bold shadow-lg"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Go to Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
