"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, ClipboardList, User, LogOut, CheckCircle, XCircle, Clock } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Appointment {
    id: string;
    patient: {
        full_name: string;
        phone: string;
    };
    appointment_date: string;
    appointment_time: string;
    status: string;
    reason: string;
}

interface DoctorProfile {
    full_name: string;
    specialization: string;
    hospital?: {
        name: string;
    }
}

export default function DoctorDashboard() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchDashboardData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/login");
                return;
            }

            // Fetch Doctor Profile
            const { data: doctorData, error: doctorError } = await supabase
                .from("doctors")
                .select("name, specialization, hospitals(name)")
                .eq("user_id", user.id)
                .single();

            if (doctorData) {
                setDoctorProfile({
                    full_name: doctorData.name,
                    specialization: doctorData.specialization,
                    hospital: doctorData.hospitals as unknown as { name: string } || undefined
                });
            }

            // Fetch Appointments
            // Note: This relies on the updated RLS policies allowing doctors to view appointments assigned to them.
            // We need to join with user_profiles to get patient name.
            const { data: appointmentData, error: appError } = await supabase
                .from("appointments")
                .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          reason,
          patient:user_profiles!patient_id(full_name, phone)
        `)
                .order('appointment_date', { ascending: true });

            if (appointmentData) {
                // Transform data to match interface
                const formattedAppointments = appointmentData.map((app: any) => ({
                    id: app.id,
                    patient: {
                        full_name: app.patient?.full_name || 'Unknown',
                        phone: app.patient?.phone || 'N/A'
                    },
                    appointment_date: app.appointment_date,
                    appointment_time: app.appointment_time,
                    status: app.status,
                    reason: app.reason,
                }));
                setAppointments(formattedAppointments);
            }

            setLoading(false);
        };

        fetchDashboardData();
    }, [router, supabase]);

    const handleStatusUpdate = async (id: string, status: string, reason?: string) => {
        const { error } = await supabase
            .from("appointments")
            .update({ status, ...(reason && { notes: reason }) }) // Storing reject reason in notes for now
            .eq("id", id);

        if (!error) {
            setAppointments((prev) =>
                prev.map((app) => (app.id === id ? { ...app, status } : app))
            );
            setIsRejectDialogOpen(false);
            setRejectReason("");
        }
    };

    const pendingAppointments = appointments.filter(a => a.status === 'pending');
    const upcomingAppointments = appointments.filter(a => a.status === 'accepted' || a.status === 'scheduled');
    const pastAppointments = appointments.filter(a => ['completed', 'cancelled', 'declined'].includes(a.status));

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-primary">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
            {/* Navbar */}
            <nav className="w-full border-b border-[#e6f3f4] dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
                <div className="w-full max-w-7xl mx-auto flex justify-between items-center p-3 px-5">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="size-8 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                            <span className="material-symbols-outlined text-xl">health_metrics</span>
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-[#0c1b1d] dark:text-white">medcAIr</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-[#0c1b1d] dark:text-white">{doctorProfile?.full_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{doctorProfile?.specialization} • {doctorProfile?.hospital?.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { }} className="text-gray-500 hover:text-primary">
                            <Bell className="h-5 w-5" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleSignOut} className="gap-2">
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6 space-y-8">

                {/* Dashboard Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-gray-500 dark:text-gray-400">Pending Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-primary">{pendingAppointments.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-white dark:from-gray-800 dark:to-gray-900 border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-gray-500 dark:text-gray-400">Upcoming Appointments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-green-600">{upcomingAppointments.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-gray-800 dark:to-gray-900 border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-gray-500 dark:text-gray-400">Total Patients</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-purple-600">{pastAppointments.length + upcomingAppointments.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="appointments" className="w-full space-y-6">
                    <TabsList className="bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 w-full sm:w-auto grid grid-cols-2 sm:flex">
                        <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white px-6">Appointments</TabsTrigger>
                        <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white px-6">Patient History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="appointments" className="space-y-6">
                        {/* Pending Appointments Section */}
                        {pendingAppointments.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-[#0c1b1d] dark:text-white flex items-center gap-2">
                                    <Clock className="text-orange-500" /> Pending Approvals
                                </h2>
                                <div className="grid gap-4">
                                    {pendingAppointments.map((app) => (
                                        <Card key={app.id} className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-lg text-[#0c1b1d] dark:text-white">{app.patient.full_name}</h3>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(app.appointment_date).toLocaleDateString()} at {app.appointment_time}
                                                    </div>
                                                    {app.reason && <p className="text-sm text-gray-600 dark:text-gray-300 italic">" {app.reason} "</p>}
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <Button
                                                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleStatusUpdate(app.id, 'accepted')}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-2" /> Accept
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 sm:flex-none border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950"
                                                        onClick={() => {
                                                            setSelectedAppointmentId(app.id);
                                                            setIsRejectDialogOpen(true);
                                                        }}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-2" /> Decline
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming Appointments Section */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-[#0c1b1d] dark:text-white flex items-center gap-2">
                                <Calendar className="text-primary" /> Upcoming Schedule
                            </h2>
                            {upcomingAppointments.length === 0 ? (
                                <Card className="p-8 text-center text-gray-500">No upcoming appointments scheduled.</Card>
                            ) : (
                                <div className="grid gap-4">
                                    {upcomingAppointments.map((app) => (
                                        <Card key={app.id} className="shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                                        {app.patient.full_name[0]}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-[#0c1b1d] dark:text-white">{app.patient.full_name}</h3>
                                                        <p className="text-sm text-gray-500">{app.patient.phone}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-[#0c1b1d] dark:text-white">
                                                        {new Date(app.appointment_date).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-sm text-primary font-medium">
                                                        {app.appointment_time}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmed</Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle>Patient History</CardTitle>
                                <CardDescription>View past appointments and outcomes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pastAppointments.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">No history found.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {pastAppointments.map((app) => (
                                            <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{app.patient.full_name}</p>
                                                        <p className="text-xs text-gray-500">{new Date(app.appointment_date).toLocaleDateString()} • {app.status}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={app.status === 'completed' ? 'default' : 'secondary'}>
                                                    {app.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Decline Appointment</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for declining this appointment. This will be visible to the patient.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Input
                                id="reason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="e.g. Doctor unavailable, Schedule conflict..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedAppointmentId && handleStatusUpdate(selectedAppointmentId, 'declined', rejectReason)}
                            disabled={!rejectReason}
                        >
                            Decline Appointment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
