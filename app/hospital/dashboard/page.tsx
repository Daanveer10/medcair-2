"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { handleError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, Plus, LogOut, Stethoscope, Settings, Sparkles, X, CheckCircle2, AlertCircle, BarChart3, User, ChevronDown, ChevronUp, History } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

interface DoctorAppointment {
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
  notes?: string;
}

interface DoctorWithSchedule {
  id: string;
  name: string;
  specialization: string;
  clinic_id: string;
  clinic_name: string;
  upcomingAppointments: DoctorAppointment[];
  patientHistory: DoctorAppointment[];
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
  const [doctorsWithSchedules, setDoctorsWithSchedules] = useState<DoctorWithSchedule[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "schedule">("list");
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    name: "",
    doctor_id: "",
    specialization: "",
    degree: "",
    email: "",
    phone: "",
    clinic_id: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (hospitalId) {
      loadClinics();
      loadAppointments();
      loadDoctorsWithSchedules();
    }
  }, [hospitalId]);

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
          // Reload appointments and doctor schedules when changes occur
          loadAppointments();
          loadDoctorsWithSchedules();
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
      handleError(error, { action: "loadAppointments", resource: "appointments" });
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorsWithSchedules = async () => {
    try {
      setLoadingDoctors(true);
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
        .select("id, name")
        .eq("hospital_id", hospital.id);

      if (!clinics || clinics.length === 0) {
        setLoadingDoctors(false);
        return;
      }

      const clinicIds = clinics.map(c => c.id);
      const clinicMap = new Map(clinics.map(c => [c.id, c.name]));

      // Get all doctors from these clinics
      const { data: doctors } = await supabase
        .from("doctors")
        .select("id, name, specialization, clinic_id")
        .in("clinic_id", clinicIds);

      if (!doctors || doctors.length === 0) {
        setDoctorsWithSchedules([]);
        setLoadingDoctors(false);
        return;
      }

      const doctorIds = doctors.map(d => d.id);
      const today = new Date().toISOString().split("T")[0];

      // Get upcoming appointments (scheduled, accepted, pending) - today and future
      const { data: upcomingApts } = await supabase
        .from("appointments")
        .select(`
          id,
          doctor_id,
          appointment_date,
          appointment_time,
          status,
          notes,
          patient:user_profiles!appointments_patient_id_fkey (
            full_name
          ),
          clinic:clinics (
            name
          )
        `)
        .in("doctor_id", doctorIds)
        .in("status", ["scheduled", "accepted", "pending"])
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      // Get patient history (completed, cancelled, no_show) - past appointments
      const { data: historyApts } = await supabase
        .from("appointments")
        .select(`
          id,
          doctor_id,
          appointment_date,
          appointment_time,
          status,
          notes,
          patient:user_profiles!appointments_patient_id_fkey (
            full_name
          ),
          clinic:clinics (
            name
          )
        `)
        .in("doctor_id", doctorIds)
        .in("status", ["completed", "cancelled", "no_show"])
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .limit(50); // Limit history to last 50 appointments per doctor

      // Transform appointments
      const transformAppointment = (apt: any): DoctorAppointment => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        patient: {
          full_name: Array.isArray(apt.patient) ? apt.patient[0]?.full_name : apt.patient?.full_name || "Unknown",
        },
        clinic: {
          name: Array.isArray(apt.clinic) ? apt.clinic[0]?.name : apt.clinic?.name || "Unknown",
        },
        notes: apt.notes,
      });

      const upcomingMap = new Map<string, DoctorAppointment[]>();
      const historyMap = new Map<string, DoctorAppointment[]>();

      (upcomingApts || []).forEach((apt: any) => {
        const transformed = transformAppointment(apt);
        const existing = upcomingMap.get(apt.doctor_id) || [];
        existing.push(transformed);
        upcomingMap.set(apt.doctor_id, existing);
      });

      (historyApts || []).forEach((apt: any) => {
        const transformed = transformAppointment(apt);
        const existing = historyMap.get(apt.doctor_id) || [];
        existing.push(transformed);
        historyMap.set(apt.doctor_id, existing);
      });

      // Combine doctors with their schedules
      const doctorsWithData: DoctorWithSchedule[] = doctors.map(doctor => ({
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        clinic_id: doctor.clinic_id,
        clinic_name: clinicMap.get(doctor.clinic_id) || "Unknown",
        upcomingAppointments: upcomingMap.get(doctor.id) || [],
        patientHistory: historyMap.get(doctor.id) || [],
      }));

      setDoctorsWithSchedules(doctorsWithData);
    } catch (error) {
      handleError(error, { action: "loadDoctorsWithSchedules", resource: "doctors" });
    } finally {
      setLoadingDoctors(false);
    }
  };

  const toggleDoctorExpanded = (doctorId: string) => {
    const newExpanded = new Set(expandedDoctors);
    if (newExpanded.has(doctorId)) {
      newExpanded.delete(doctorId);
    } else {
      newExpanded.add(doctorId);
    }
    setExpandedDoctors(newExpanded);
  };

  const handleCreateDoctor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!doctorForm.clinic_id) {
      toast.error("Validation Failed", {
        description: "Please select a clinic.",
      });
      return;
    }

    try {
      const { DoctorSchema } = await import("@/lib/validations");
      const { validateData } = await import("@/lib/utils");

      const validation = validateData(DoctorSchema, {
        name: doctorForm.name,
        specialization: doctorForm.specialization,
        clinicId: doctorForm.clinic_id,
      });

      if (!validation.success) {
        toast.error("Validation Failed", {
          description: validation.error?.message || "Invalid doctor information.",
        });
        return;
      }

      // Check if doctor with same ID already exists
      if (doctorForm.doctor_id) {
        const { data: existingDoctor } = await supabase
          .from("doctors")
          .select("id")
          .eq("doctor_id", doctorForm.doctor_id)
          .single();

        if (existingDoctor) {
          toast.error("Doctor ID Exists", {
            description: "A doctor with this license ID already exists.",
          });
          return;
        }
      }

      // Create doctor
      const { error } = await supabase.from("doctors").insert({
        clinic_id: validation.data.clinicId,
        name: validation.data.name,
        specialization: validation.data.specialization,
        doctor_id: doctorForm.doctor_id || null,
        degree: doctorForm.degree || null,
        email: doctorForm.email || null,
        phone: doctorForm.phone || null,
      });

      if (error) throw error;

      toast.success("Doctor Created", {
        description: "The doctor has been added successfully.",
      });
      setDoctorForm({
        name: "",
        doctor_id: "",
        specialization: "",
        degree: "",
        email: "",
        phone: "",
        clinic_id: "",
      });
      setShowDoctorModal(false);
      loadDoctorsWithSchedules();
      loadClinics();
    } catch (error) {
      const errorResponse = handleError(error, { action: "createDoctor", resource: "doctors" });
      toast.error("Creation Failed", {
        description: errorResponse.error?.message || "Failed to create doctor.",
      });
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
      
      toast.info("Appointment Booking", {
        description: "Patient appointment booking is best done by patients themselves through the patient portal. Please direct patients to sign up and book through their dashboard.",
      });
      setCreating(false);
      setShowCreateModal(false);
      return;

      // TODO: For production, create a server-side API route that can:
      // 1. Accept patient email/name
      // 2. Use admin API to find/create user
      // 3. Create appointment
      // This requires server-side code with service role key
    } catch (error: any) {
      const errorResponse = handleError(error, { action: "createAppointment", resource: "appointments" });
      toast.error("Creation Failed", {
        description: errorResponse.error?.message || "Failed to create appointment.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptAppointment = async (appointmentId: string) => {
    try {
      const { AppointmentUpdateSchema } = await import("@/lib/validations");
      const { validateData } = await import("@/lib/utils");

      const validation = validateData(AppointmentUpdateSchema, {
        status: "accepted",
      });

      if (!validation.success) {
        toast.error("Validation Failed", {
          description: validation.error?.message || "Invalid appointment status.",
        });
        return;
      }

      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: validation.data.status,
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
          handleError(error, { action: "createNotification", resource: "notifications" });
        }
      }

      toast.success("Appointment Accepted", {
        description: "The appointment has been accepted successfully.",
      });
      loadAppointments(); // Reload to refresh the list
      loadDoctorsWithSchedules(); // Reload doctor schedules
    } catch (error: any) {
      const errorResponse = handleError(error, { action: "acceptAppointment", resource: "appointments" });
      toast.error("Action Failed", {
        description: errorResponse.error?.message || "Failed to accept appointment.",
      });
    }
  };

  const handleDeclineAppointment = async (appointmentId: string) => {
    try {
      const { AppointmentUpdateSchema } = await import("@/lib/validations");
      const { validateData } = await import("@/lib/utils");

      const validation = validateData(AppointmentUpdateSchema, {
        status: "declined",
      });

      if (!validation.success) {
        toast.error("Validation Failed", {
          description: validation.error?.message || "Invalid appointment status.",
        });
        return;
      }

      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: validation.data.status,
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
          handleError(error, { action: "createNotification", resource: "notifications" });
        }
      }

      toast.success("Appointment Declined", {
        description: "The appointment request has been declined.",
      });
      loadAppointments(); // Reload to refresh the list
      loadDoctorsWithSchedules(); // Reload doctor schedules
    } catch (error: any) {
      const errorResponse = handleError(error, { action: "declineAppointment", resource: "appointments" });
      toast.error("Action Failed", {
        description: errorResponse.error?.message || "Failed to decline appointment.",
      });
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
              <Link href="/hospital/analytics">
                <Button variant="outline" size="sm" className="flex items-center gap-2 border-2 border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium">
                  <BarChart3 className="h-4 w-4 text-gray-900" />
                  <span className="font-medium text-gray-900">Analytics</span>
                </Button>
              </Link>
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
            <div className="flex gap-2 border-r border-gray-300 pr-3 mr-3">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-green-600 text-white" : ""}
              >
                List View
              </Button>
              <Button
                variant={viewMode === "schedule" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("schedule")}
                className={viewMode === "schedule" ? "bg-green-600 text-white" : ""}
              >
                Schedule View
              </Button>
            </div>
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
          <div className="flex gap-3">
            <Button
              onClick={() => setShowDoctorModal(true)}
              className="bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg font-bold"
            >
              <User className="h-5 w-5 mr-2" />
              Add Doctor
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg font-bold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Appointment
            </Button>
          </div>
        </div>

        {/* Appointments List/Schedule */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-4 font-medium">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
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
            ) : viewMode === "schedule" ? (
              // Schedule View - Group by date
              (() => {
                // Group appointments by date
                const groupedByDate = filteredAppointments.reduce((acc, apt) => {
                  const date = apt.appointment_date;
                  if (!acc[date]) {
                    acc[date] = [];
                  }
                  acc[date].push(apt);
                  return acc;
                }, {} as Record<string, typeof filteredAppointments>);

                // Sort dates
                const sortedDates = Object.keys(groupedByDate).sort();

                return (
                  <div className="space-y-6">
                    {sortedDates.map((date) => {
                      const dateAppointments = groupedByDate[date];
                      // Sort appointments by time
                      const sortedAppointments = [...dateAppointments].sort((a, b) => {
                        return a.appointment_time.localeCompare(b.appointment_time);
                      });

                      // Calculate end time (15 minutes after start)
                      const formatEndTime = (startTime: string) => {
                        const [hours, minutes] = startTime.split(':').map(Number);
                        const startDate = new Date();
                        startDate.setHours(hours, minutes, 0, 0);
                        const endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
                        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
                      };

                      return (
                        <Card key={date} className="border-2 border-gray-200 shadow-md bg-white">
                          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b-2 border-gray-200">
                            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-green-600" />
                              {new Date(date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </CardTitle>
                            <CardDescription className="text-gray-700 font-medium mt-1">
                              {sortedAppointments.length} appointment{sortedAppointments.length !== 1 ? 's' : ''} scheduled
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {sortedAppointments.map((appointment) => {
                                const statusColor = 
                                  appointment.status === "pending" ? "border-yellow-500 bg-yellow-50" :
                                  appointment.status === "accepted" || appointment.status === "scheduled" ? "border-green-500 bg-green-50" :
                                  appointment.status === "completed" ? "border-blue-500 bg-blue-50" :
                                  appointment.status === "declined" || appointment.status === "cancelled" ? "border-red-500 bg-red-50" :
                                  "border-gray-300 bg-gray-50";

                                return (
                                  <div
                                    key={appointment.id}
                                    className={`p-4 rounded-lg border-2 ${statusColor} shadow-sm hover:shadow-md transition-all`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-gray-700" />
                                        <div>
                                          <div className="font-bold text-lg text-gray-900">
                                            {appointment.appointment_time}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            - {formatEndTime(appointment.appointment_time)}
                                          </div>
                                        </div>
                                      </div>
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                                          appointment.status === "pending"
                                            ? "bg-yellow-500 text-white"
                                            : appointment.status === "accepted" || appointment.status === "scheduled"
                                            ? "bg-green-600 text-white"
                                            : appointment.status === "completed"
                                            ? "bg-blue-600 text-white"
                                            : appointment.status === "declined" || appointment.status === "cancelled"
                                            ? "bg-red-500 text-white"
                                            : "bg-gray-400 text-white"
                                        }`}
                                      >
                                        {appointment.status.toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Patient</p>
                                        <p className="font-semibold text-gray-900">{appointment.patient.full_name}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Doctor</p>
                                        <p className="font-medium text-gray-900">{appointment.doctor.name}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Clinic</p>
                                        <p className="text-sm text-gray-800">{appointment.clinic.name}</p>
                                      </div>
                                    </div>
                                    {appointment.status === "pending" && (
                                      <div className="mt-4 pt-3 border-t border-gray-300 flex gap-2">
                                        <Button
                                          size="sm"
                                          className="flex-1 bg-green-600 text-white hover:bg-green-700 text-xs"
                                          onClick={() => handleAcceptAppointment(appointment.id)}
                                        >
                                          Accept
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50 text-xs"
                                          onClick={() => handleDeclineAppointment(appointment.id)}
                                        >
                                          Decline
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              // List View
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
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
              ))}
            </div>
          )
        }

        {/* Doctors & Schedules Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-black mb-2">Doctors & Schedules</h2>
            <p className="text-gray-600">View doctors, their upcoming schedules, and patient history</p>
          </div>

          {loadingDoctors ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : doctorsWithSchedules.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl font-bold text-black mb-2">No doctors found</p>
                <p className="text-gray-600 mb-4">Add doctors in Settings to see their schedules</p>
                <Link href="/hospital/settings">
                  <Button className="bg-green-600 text-white hover:bg-green-700">
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {doctorsWithSchedules.map((doctor) => {
                const isExpanded = expandedDoctors.has(doctor.id);
                const totalUpcoming = doctor.upcomingAppointments.length;
                const totalHistory = doctor.patientHistory.length;

                return (
                  <Card
                    key={doctor.id}
                    className="border-0 shadow-lg bg-white hover:shadow-xl transition-all"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-black">{doctor.name}</h3>
                              <p className="text-sm text-gray-600">{doctor.specialization}</p>
                            </div>
                          </div>
                          <div className="ml-12 mt-2">
                            <p className="text-sm text-gray-500">
                              <span className="font-semibold">Clinic:</span> {doctor.clinic_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">{totalUpcoming}</div>
                            <div className="text-xs text-gray-500">Upcoming</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-600">{totalHistory}</div>
                            <div className="text-xs text-gray-500">History</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleDoctorExpanded(doctor.id)}
                            className="ml-2"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Upcoming Schedule */}
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <Calendar className="h-5 w-5 text-green-600" />
                                <h4 className="text-lg font-bold text-black">Upcoming Schedule</h4>
                                <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  {totalUpcoming}
                                </span>
                              </div>
                              {totalUpcoming === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">No upcoming appointments</p>
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                  {doctor.upcomingAppointments.map((apt) => (
                                    <div
                                      key={apt.id}
                                      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <p className="font-semibold text-black">{apt.patient.full_name}</p>
                                          <p className="text-xs text-gray-500">{apt.clinic.name}</p>
                                        </div>
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-semibold ${
                                            apt.status === "pending"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : apt.status === "accepted" || apt.status === "scheduled"
                                              ? "bg-green-100 text-green-700"
                                              : "bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          {apt.status}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(apt.appointment_date).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          })}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {apt.appointment_time}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Patient History */}
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <History className="h-5 w-5 text-gray-600" />
                                <h4 className="text-lg font-bold text-black">Patient History</h4>
                                <span className="ml-auto px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                                  {totalHistory}
                                </span>
                              </div>
                              {totalHistory === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                  <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">No patient history</p>
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                  {doctor.patientHistory.map((apt) => (
                                    <div
                                      key={apt.id}
                                      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <p className="font-semibold text-black">{apt.patient.full_name}</p>
                                          <p className="text-xs text-gray-500">{apt.clinic.name}</p>
                                        </div>
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-semibold ${
                                            apt.status === "completed"
                                              ? "bg-green-100 text-green-700"
                                              : apt.status === "cancelled"
                                              ? "bg-red-100 text-red-700"
                                              : "bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          {apt.status}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(apt.appointment_date).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          })}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {apt.appointment_time}
                                        </div>
                                      </div>
                                      {apt.notes && (
                                        <p className="text-xs text-gray-500 mt-2 italic">Note: {apt.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
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

      {/* Add Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white">
            <CardHeader className="bg-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Add Doctor</CardTitle>
                  <CardDescription className="text-white/90 mt-1">Add a new doctor to your clinic</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowDoctorModal(false);
                    setDoctorForm({
                      name: "",
                      doctor_id: "",
                      specialization: "",
                      degree: "",
                      email: "",
                      phone: "",
                      clinic_id: "",
                    });
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateDoctor} className="space-y-4">
                <div>
                  <Label htmlFor="clinic_id" className="text-black font-semibold">Select Clinic</Label>
                  <select
                    id="clinic_id"
                    value={doctorForm.clinic_id}
                    onChange={(e) => setDoctorForm({ ...doctorForm, clinic_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-green-600 focus:outline-none text-black mt-1"
                  >
                    <option value="">Select a clinic</option>
                    {clinics.map((clinic: Clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name} - {clinic.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="doctor_name" className="text-black font-semibold">Doctor Name *</Label>
                  <Input
                    id="doctor_name"
                    value={doctorForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, name: e.target.value })
                    }
                    required
                    placeholder="Dr. John Doe"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label htmlFor="doctor_id" className="text-black font-semibold">License ID / Doctor ID</Label>
                  <Input
                    id="doctor_id"
                    value={doctorForm.doctor_id}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, doctor_id: e.target.value })
                    }
                    placeholder="MD12345"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label htmlFor="specialization" className="text-black font-semibold">Specialization / Occupation *</Label>
                  <Input
                    id="specialization"
                    value={doctorForm.specialization}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, specialization: e.target.value })
                    }
                    required
                    placeholder="Cardiologist"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label htmlFor="degree" className="text-black font-semibold">Degree</Label>
                  <Input
                    id="degree"
                    value={doctorForm.degree}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, degree: e.target.value })
                    }
                    placeholder="MD, MBBS, etc."
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label htmlFor="doctor_email" className="text-black font-semibold">Email</Label>
                  <Input
                    id="doctor_email"
                    type="email"
                    value={doctorForm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, email: e.target.value })
                    }
                    placeholder="doctor@example.com"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label htmlFor="doctor_phone" className="text-black font-semibold">Phone</Label>
                  <Input
                    id="doctor_phone"
                    type="tel"
                    value={doctorForm.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, phone: e.target.value })
                    }
                    placeholder="+1-555-0100"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDoctorModal(false);
                      setDoctorForm({
                        name: "",
                        doctor_id: "",
                        specialization: "",
                        degree: "",
                        email: "",
                        phone: "",
                        clinic_id: "",
                      });
                    }}
                    className="flex-1 border-2"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-green-600 text-white hover:bg-green-700">
                    Add Doctor
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
