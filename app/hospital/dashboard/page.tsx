"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Filter,
  Search,
  Bell,
  Settings,
  MoreVertical,
  TrendingUp,
  Users,
  Video,
  Clock,
  MapPin,
  ChevronRight,
  User,
  LogOut,
  UserPlus,
  Banknote
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AddDoctorDialog } from "@/components/hospital/add-doctor-dialog";

export const dynamic = 'force-dynamic';

interface Appointment {
  id: string;
  patient: {
    full_name: string;
    phone_number: string;
  };
  appointment_date: string;
  appointment_time: string;
  status: string;
  type: string;
}

interface Doctor {
  id: string;
  name: string;
  department: string;
  specialties: string[];
}

export default function HospitalDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitingRoom, setWaitingRoom] = useState<any[]>([]);
  const [stats, setStats] = useState({
    patientsToday: 0,
    appointmentsPending: 0,
    totalPatients: 0,
    revenue: 0,
  });
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    loadDashboardData();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    // Check if user is hospital/doctor
    const { data: profile } = await supabase.from("user_profiles").select("full_name, role").eq("user_id", user.id).single();
    if (profile?.role !== "hospital") { router.push("/patient/dashboard"); return; }


  };

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // 1. Fetch Appointments Today (Count)
      const { count: patientsToday } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today);

      // 2. Fetch Pending Appointments (Count)
      const { count: appointmentsPending } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // 3. Fetch Total Unique Patients
      // Note: Supabase doesn't support COUNT(DISTINCT column) directly in JS client easily without a stored procedure or raw SQL.
      // We will approximate by counting all appointments for now or fetching unique patient_ids if dataset is small.
      // For scalability, this should be a stored procedure.
      const { data: allAppointments } = await supabase
        .from("appointments")
        .select("patient_id, clinic:clinics(consultation_fee)")
        .not("status", "eq", "cancelled"); // Filter out cancelled

      const uniquePatients = new Set(allAppointments?.map(a => a.patient_id)).size;
      const totalPatients = uniquePatients || 0;

      // 4. Calculate Revenue
      // Sum (consultation_fee) for all non-cancelled appointments
      const totalRevenue = allAppointments?.reduce((sum, apt: any) => {
        const fee = apt.clinic?.consultation_fee || 50; // Default $50 if not set
        return sum + fee;
      }, 0) || 0;

      setStats({
        patientsToday: patientsToday || 0,
        appointmentsPending: appointmentsPending || 0,
        totalPatients,
        revenue: totalRevenue
      });

      // 5. Fetch Upcoming Appointments (Schedule)
      const { data: appointmentsData, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          patient:patient_id (full_name, phone_number)
        `)
        .in("status", ["scheduled", "pending", "accepted"])
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(10);

      if (error) throw error;

      const transformedAppointments = (appointmentsData || []).map((app: any) => ({
        id: app.id,
        patient: {
          full_name: app.patient?.full_name || "Unknown Patient",
          phone_number: app.patient?.phone_number || "N/A"
        },
        appointment_date: app.appointment_date,
        appointment_time: app.appointment_time,
        status: app.status,
        type: "In-Person", // Default to In-Person as reason column is missing
      }));

      setAppointments(transformedAppointments);

      // 6. Fetch Waiting Room
      // For now, we'll consider any appointment scheduled for TODAY that isn't completed/cancelled as "Waiting"
      // Ideally this would use a specific status like 'checked_in'
      const { data: waitingData } = await supabase
        .from("appointments")
        .select(`
             id,
             appointment_time,
             status,
             patient:patient_id (full_name)
         `)
        .eq("appointment_date", today)
        .in("status", ["scheduled", "accepted"])
        .order("appointment_time", { ascending: true })
        .limit(5);

      const transformedWaiting = (waitingData || []).map((app: any) => ({
        name: app.patient?.full_name || "Unknown",
        time: app.appointment_time,
        status: app.status === 'accepted' ? 'Checked In' : 'Arriving'
      }));
      setWaitingRoom(transformedWaiting);

      // 7. Fetch Doctors (for list view)
      const { data: doctorsData } = await supabase
        .from("doctors")
        .select("id, name, specialization, consultation_fee, availability_status, hospital_id");
      // We really should filter by hospital_id using RLS or explicit check?
      // The RLS policy "Hospital owners can manage doctors linked to their hospital"
      // ensures we only see our doctors if we are the hospital owner.
      // But for clarity let's rely on RLS.

      setDoctorsList(doctorsData || []);



    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Optimistic update or reload
      setAppointments((prev: Appointment[]) => prev.map((a: Appointment) => a.id === id ? { ...a, status } : a));
      toast.success(`Appointment ${status}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    }
  };

  return (

    <div className="min-h-screen bg-black text-white font-display selection:bg-primary/30">
      {/* Static Background */}
      <div className="fixed inset-0 z-0 bg-black">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="relative z-10 p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hospital Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage appointments, doctors, and patients</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm font-medium">
              <Settings className="size-4" />
              Settings
            </button>
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold">St. Mary's Hospital</p>
                <p className="text-xs text-gray-400">Admin Account</p>
              </div>
              <div className="size-10 rounded-full bg-gradient-to-br from-primary to-blue-600 p-[1px]">
                <div className="size-full rounded-full bg-black flex items-center justify-center">
                  <span className="font-bold text-primary">SM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Patients", value: stats.totalPatients, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", trend: "+12%" },
            { label: "Appointments", value: stats.appointmentsPending + appointments.length, icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10", trend: "+5%" },
            { label: "New Consults", value: stats.patientsToday, icon: UserPlus, color: "text-emerald-400", bg: "bg-emerald-500/10", trend: "+18%" },
            { label: "Earnings", value: `$${stats.revenue.toLocaleString()}`, icon: Banknote, color: "text-amber-400", bg: "bg-amber-500/10", trend: "+8%" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg hover:bg-white/10 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="size-6" />
                </div>
                <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                  <TrendingUp className="size-3 mr-1" />
                  {stat.trend}
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                <p className="text-sm font-medium text-gray-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Today's Appointments</h2>
                <p className="text-xs text-gray-400 font-medium mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-gray-300 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                  <Filter className="size-3.5" />
                  Filter
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 border border-primary/20 transition-colors">
                  <Calendar className="size-3.5" />
                  View All
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading appointments...</div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No scheduled appointments today.</div>
              ) : (
                appointments.map((appt, idx) => (
                  <div key={appt.id} className="group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all">
                    <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-center min-w-[80px]">
                      <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{appt.appointment_time.slice(0, 5)}</span>
                      <span className="block text-primary font-bold">{parseInt(appt.appointment_time) >= 12 ? 'PM' : 'AM'}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="size-12 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-gray-300 font-bold text-lg">
                        {appt.patient.full_name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-primary transition-colors">{appt.patient.full_name}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined !text-xs">female</span> 24 yrs</span>
                          <span className="size-1 bg-white/10 rounded-full"></span>
                          <span className="flex items-center gap-1">New Patient</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 my-2 md:my-0">
                      {appt.type === "In-Person" ? (
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 flex items-center gap-1">
                          <span className="material-symbols-outlined !text-sm">stethoscope</span> General Checkup
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20 flex items-center gap-1">
                          <Video className="size-3" /> Video Consult
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-all ml-auto">
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'accepted')}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                        title="Accept"
                      >
                        <span className="material-symbols-outlined">check</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                      <Link href={`/patient/appointments/${appt.id}`}>
                        <button className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Details">
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Waiting Room & Quick Actions */}
          <div className="space-y-6">
            {/* Now Waiting */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Waiting Room</h3>
                <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold rounded-md">{waitingRoom.length} Active</span>
              </div>
              <div className="space-y-4">
                {waitingRoom.length > 0 ? waitingRoom.map((patient, idx) => (
                  <div key={idx} className="flex items-center gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="relative">
                      <div className="size-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-gray-400 border border-white/10">{patient.name[0]}</div>
                      <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 border-2 border-black rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{patient.name}</p>
                      <p className="text-xs text-gray-500">Waiting since {patient.time.slice(0, 5)}</p>
                    </div>
                    <button className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">Call</button>
                  </div>
                )) : (
                  <p className="text-gray-500 text-sm">No patients waiting currently.</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all duration-700"></div>
              <h3 className="font-bold text-lg mb-4 relative z-10">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <AddDoctorDialog onSuccess={loadDashboardData} />
                <button className="bg-black/20 hover:bg-black/30 backdrop-blur-sm p-3 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/5">
                  <span className="material-symbols-outlined text-2xl">person_add</span>
                  <span className="text-xs font-bold">New Patient</span>
                </button>
                <button className="bg-black/20 hover:bg-black/30 backdrop-blur-sm p-3 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/5">
                  <span className="material-symbols-outlined text-2xl">prescriptions</span>
                  <span className="text-xs font-bold">Rx</span>
                </button>
                <button className="bg-black/20 hover:bg-black/30 backdrop-blur-sm p-3 rounded-xl flex flex-col items-center gap-2 transition-colors border border-white/5">
                  <Video className="size-6" />
                  <span className="text-xs font-bold">Tele-OPD</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Your Doctors</h2>
            {doctorsList.length === 0 ? (
              <p className="text-gray-500">No doctors added yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctorsList.map((doc) => (
                  <div key={doc.id} className="p-4 border border-white/10 bg-white/5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors">
                    <div>
                      <p className="font-bold text-white">{doc.name}</p>
                      <p className="text-xs text-gray-400">{doc.specialization}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full border ${doc.availability_status === 'available' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {doc.availability_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
