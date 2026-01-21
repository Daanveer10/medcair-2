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
  LogOut
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
  const [userName, setUserName] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitingRoom, setWaitingRoom] = useState<any[]>([]);
  const [stats, setStats] = useState({
    patientsToday: 0,
    appointmentsPending: 0,
    totalPatients: 0,
    revenue: 0,
  });
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

    setUserName(profile.full_name || "Doctor");
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
          type,
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
        type: app.reason?.toLowerCase().includes("video") ? "Video Call" : "In-Person", // Simple heuristic for type
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
    <div className="flex h-screen bg-background-light dark:bg-background-dark font-display text-[#0c1b1d] dark:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-white dark:bg-gray-800 border-r border-[#e6f3f4] dark:border-gray-700 flex flex-col justify-between py-8 z-20 transition-all">
        <div>
          <div className="px-6 mb-12 flex items-center gap-3">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-2xl">health_metrics</span>
            </div>
            <span className="hidden lg:block text-xl font-extrabold tracking-tight">medcAIr</span>
          </div>
          <nav className="space-y-2 px-3">
            {[
              { icon: "dashboard", label: "Overview", active: true, href: "/hospital/dashboard" },
              { icon: "calendar_month", label: "Schedule", active: false, href: "#" },
              { icon: "group", label: "Patients", active: false, href: "#" },
              { icon: "chat", label: "Messages", active: false, badge: 3, href: "#" },
              { icon: "payments", label: "Finances", active: false, href: "/hospital/analytics" },
              { icon: "settings", label: "Settings", active: false, href: "/hospital/settings" },
            ].map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${item.active ? 'bg-primary text-white shadow-lg shadow-primary/25 font-bold' : 'text-gray-500 hover:bg-[#e6f3f4] dark:hover:bg-gray-700 hover:text-primary'}`}
              >
                <span className={`material-symbols-outlined ${item.active ? 'fill-1' : ''}`}>{item.icon}</span>
                <span className="hidden lg:block font-medium">{item.label}</span>
                {item.badge && (
                  <span className="hidden lg:flex ml-auto size-5 bg-red-500 text-white text-xs font-bold items-center justify-center rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="px-6">
          <div className="hidden lg:flex items-center gap-3 p-3 bg-[#e6f3f4] dark:bg-gray-700/50 rounded-xl">
            <div className="size-10 rounded-full bg-cover bg-center border-2 border-white" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBSNpjkgHyB7Br7jetQgTz1iMCfB4oMZnt2EJ112Izcaq1yVkHs8pVnjuJas_kanGUfehMF0WYqzBSZ-fsFz_XyVZi_7qAJUDTGxAP_u3F4SAQnn2RdEZRFZbBIPAu6OgTAche-HiWpmw_DuTBwehwwtNq8pEEwB4UWYI9pZNBxT0nROliuzgJXWwNc8e5J6YsNOy931tDvVBOj0l4i2SWvD_iMNQQci7TViNAu8dz7I0E6GMGTeFhs4vYfrPw4iN7Wh55YBznqvg')" }}></div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{userName || "Dr. Smith"}</p>
              <p className="text-xs text-primary font-medium truncate">Cardiologist</p>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))} className="ml-auto text-gray-400 hover:text-red-500">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
            <p className="text-sm text-gray-500 font-medium">Have a nice day, Dr. {userName.split(' ')[0] || "Smith"}!</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 border border-[#e6f3f4] dark:border-gray-700 w-64 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Search className="size-4 text-gray-400 mr-2" />
              <input type="text" placeholder="Search appointments..." className="bg-transparent border-none text-sm w-full focus:ring-0 placeholder:text-gray-400" />
            </div>
            <button className="relative p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-[#e6f3f4] dark:border-gray-700 text-gray-500 hover:text-primary transition-colors shadow-sm">
              <Bell className="size-5" />
              <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Total Patients", value: stats.totalPatients, icon: "group", color: "text-blue-500", bg: "bg-blue-500/10", trend: "+12%" },
              { label: "Appointments", value: stats.appointmentsPending + appointments.length, icon: "calendar_month", color: "text-purple-500", bg: "bg-purple-500/10", trend: "+5%" },
              { label: "New Consults", value: stats.patientsToday, icon: "person_add", color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "+18%" },
              { label: "Earnings", value: `$${stats.revenue.toLocaleString()}`, icon: "payments", color: "text-amber-500", bg: "bg-amber-500/10", trend: "+8%" },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-[#e6f3f4] dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <TrendingUp className="size-3 mr-1" />
                    {stat.trend}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold mb-1">{stat.value}</h3>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Today's Schedule */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-[#e6f3f4] dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Today's Appointments</h2>
                  <p className="text-xs text-gray-500 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Filter className="size-3.5" />
                    Filter
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20">
                    <Calendar className="size-3.5" />
                    View All
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading appointments...</div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No scheduled appointments today.</div>
                ) : (
                  appointments.map((appt, idx) => (
                    <div key={appt.id} className="group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl border border-transparent hover:border-gray-100 hover:bg-background-light dark:hover:bg-gray-700/30 transition-all">
                      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-600 px-4 py-3 rounded-xl text-center min-w-[80px] shadow-sm">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{appt.appointment_time.slice(0, 5)}</span>
                        <span className="block text-primary font-bold">{parseInt(appt.appointment_time) >= 12 ? 'PM' : 'AM'}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                          {appt.patient.full_name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#0c1b1d] dark:text-white group-hover:text-primary transition-colors">{appt.patient.full_name}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined !text-xs">female</span> 24 yrs</span>
                            <span className="size-1 bg-gray-300 rounded-full"></span>
                            <span className="flex items-center gap-1">New Patient</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 my-2 md:my-0">
                        {appt.type === "In-Person" ? (
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 flex items-center gap-1">
                            <span className="material-symbols-outlined !text-sm">stethoscope</span> General Checkup
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100 flex items-center gap-1">
                            <Video className="size-3" /> Video Consult
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-all ml-auto">
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'accepted')}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Accept"
                        >
                          <span className="material-symbols-outlined">check</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e6f3f4] dark:border-gray-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold">Waiting Room</h3>
                  <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-md">{waitingRoom.length} Active</span>
                </div>
                <div className="space-y-4">
                  {waitingRoom.length > 0 ? waitingRoom.map((patient, idx) => (
                    <div key={idx} className="flex items-center gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="relative">
                        <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">{patient.name[0]}</div>
                        <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{patient.name}</p>
                        <p className="text-xs text-gray-500">Waiting since {patient.time.slice(0, 5)}</p>
                      </div>
                      <button className="text-xs font-bold text-primary hover:underline">Call</button>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-sm">No patients waiting currently.</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-primary rounded-2xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h3 className="font-bold text-lg mb-4 relative z-10">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3 relative z-10">
                  <button className="bg-white/10 hover:bg-white/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors">
                    <Calendar className="size-6" />
                    <span className="text-xs font-bold">Add Slot</span>
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-2xl">person_add</span>
                    <span className="text-xs font-bold">New Patient</span>
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-2xl">prescriptions</span>
                    <span className="text-xs font-bold">Rx</span>
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors">
                    <Video className="size-6" />
                    <span className="text-xs font-bold">Tele-OPD</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
