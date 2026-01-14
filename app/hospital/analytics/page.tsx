"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, TrendingUp, Users, XCircle, CheckCircle2, BarChart3, Settings, LogOut, Stethoscope } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface AnalyticsData {
  totalAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  pendingAppointments: number;
  noShowAppointments: number;
  appointmentsByStatus: { status: string; count: number }[];
  appointmentsByDate: { date: string; count: number }[];
  popularTimeSlots: { time: string; count: number }[];
  appointmentsByClinic: { clinicName: string; count: number }[];
}

export default function HospitalAnalytics() {
  const router = useRouter();
  const supabase = createClient();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    checkUser();
    loadAnalytics();
  }, [dateRange]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "hospital") {
      router.push("/patient/dashboard");
      return;
    }

    setUserName(profile.full_name || "Hospital");
  };

  const loadAnalytics = async () => {
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
        .select("id, name")
        .eq("hospital_id", hospital.id);

      if (!clinics || clinics.length === 0) {
        setLoading(false);
        return;
      }

      const clinicIds = clinics.map(c => c.id);

      // Calculate date range
      let startDate: string | null = null;
      if (dateRange === "week") {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        startDate = date.toISOString().split("T")[0];
      } else if (dateRange === "month") {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        startDate = date.toISOString().split("T")[0];
      }

      // Get all appointments
      let query = supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          clinic:clinics (
            name
          )
        `)
        .in("clinic_id", clinicIds);

      if (startDate) {
        query = query.gte("appointment_date", startDate);
      }

      const { data: appointments, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const today = new Date().toISOString().split("T")[0];
      const totalAppointments = appointments?.length || 0;
      const todayAppointments = appointments?.filter(a => a.appointment_date === today).length || 0;
      const upcomingAppointments = appointments?.filter(a => 
        a.appointment_date >= today && 
        (a.status === "scheduled" || a.status === "accepted" || a.status === "pending")
      ).length || 0;
      const completedAppointments = appointments?.filter(a => a.status === "completed").length || 0;
      const cancelledAppointments = appointments?.filter(a => a.status === "cancelled").length || 0;
      const pendingAppointments = appointments?.filter(a => a.status === "pending").length || 0;
      const noShowAppointments = appointments?.filter(a => a.status === "no_show").length || 0;

      // Group by status
      const statusCounts: Record<string, number> = {};
      appointments?.forEach(apt => {
        statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
      });
      const appointmentsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));

      // Group by date
      const dateCounts: Record<string, number> = {};
      appointments?.forEach(apt => {
        dateCounts[apt.appointment_date] = (dateCounts[apt.appointment_date] || 0) + 1;
      });
      const appointmentsByDate = Object.entries(dateCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Last 7 days

      // Group by time slot
      const timeCounts: Record<string, number> = {};
      appointments?.forEach(apt => {
        const time = apt.appointment_time.substring(0, 5); // HH:MM
        timeCounts[time] = (timeCounts[time] || 0) + 1;
      });
      const popularTimeSlots = Object.entries(timeCounts)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Group by clinic
      const clinicCounts: Record<string, number> = {};
      appointments?.forEach(apt => {
        const clinicName = Array.isArray(apt.clinic) 
          ? apt.clinic[0]?.name || "Unknown"
          : apt.clinic?.name || "Unknown";
        clinicCounts[clinicName] = (clinicCounts[clinicName] || 0) + 1;
      });
      const appointmentsByClinic = Object.entries(clinicCounts)
        .map(([clinicName, count]) => ({ clinicName, count }))
        .sort((a, b) => b.count - a.count);

      setAnalytics({
        totalAppointments,
        todayAppointments,
        upcomingAppointments,
        completedAppointments,
        cancelledAppointments,
        pendingAppointments,
        noShowAppointments,
        appointmentsByStatus,
        appointmentsByDate,
        popularTimeSlots,
        appointmentsByClinic
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
          <p className="text-gray-600 mt-4 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-600 rounded-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-black">
                medcAIr - Analytics
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/hospital/dashboard">
                <Button variant="outline" size="sm" className="border-2 border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <Link href="/hospital/settings">
                <Button variant="outline" size="sm" className="border-2 border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-4xl font-bold text-black mb-2">Analytics Dashboard</h2>
              <p className="text-gray-600">Insights into your hospital's appointment data</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={dateRange === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("week")}
                className={dateRange === "week" ? "bg-green-600 text-white" : ""}
              >
                Last Week
              </Button>
              <Button
                variant={dateRange === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("month")}
                className={dateRange === "month" ? "bg-green-600 text-white" : ""}
              >
                Last Month
              </Button>
              <Button
                variant={dateRange === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("all")}
                className={dateRange === "all" ? "bg-green-600 text-white" : ""}
              >
                All Time
              </Button>
            </div>
          </div>
        </div>

        {!analytics ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-black mb-2">No data available</p>
              <p className="text-gray-600">Start booking appointments to see analytics</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-green-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-90 mb-1">Total Appointments</p>
                      <p className="text-4xl font-bold">{analytics.totalAppointments}</p>
                    </div>
                    <Calendar className="h-12 w-12 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-90 mb-1">Today</p>
                      <p className="text-4xl font-bold">{analytics.todayAppointments}</p>
                    </div>
                    <Clock className="h-12 w-12 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-90 mb-1">Upcoming</p>
                      <p className="text-4xl font-bold">{analytics.upcomingAppointments}</p>
                    </div>
                    <TrendingUp className="h-12 w-12 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-90 mb-1">Completed</p>
                      <p className="text-4xl font-bold">{analytics.completedAppointments}</p>
                    </div>
                    <CheckCircle2 className="h-12 w-12 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.appointmentsByStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 capitalize">{item.status}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${(item.count / analytics.totalAppointments) * 100}%`
                              }}
                            ></div>
                          </div>
                          <span className="font-bold text-gray-900 w-12 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appointments by Clinic</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.appointmentsByClinic.slice(0, 5).map((item) => (
                      <div key={item.clinicName} className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{item.clinicName}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(item.count / analytics.totalAppointments) * 100}%`
                              }}
                            ></div>
                          </div>
                          <span className="font-bold text-gray-900 w-12 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Popular Time Slots */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Popular Time Slots</CardTitle>
                <CardDescription>Most booked appointment times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {analytics.popularTimeSlots.map((slot) => (
                    <div key={slot.time} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="font-bold text-lg text-gray-900">{slot.time}</p>
                      <p className="text-sm text-gray-600 mt-1">{slot.count} appointments</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Appointments Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-48">
                  {analytics.appointmentsByDate.map((item) => {
                    const maxCount = Math.max(...analytics.appointmentsByDate.map(d => d.count), 1);
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div key={item.date} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-green-600 rounded-t transition-all hover:bg-green-700"
                          style={{ height: `${height}%` }}
                          title={`${item.count} appointments`}
                        ></div>
                        <span className="text-xs text-gray-600 font-semibold">
                          {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-xs font-bold text-gray-900">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
