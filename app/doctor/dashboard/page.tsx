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
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/auth/login");
                    return;
                }

                // Verify Role
                const { data: profile } = await supabase
                    .from("user_profiles")
                    .select("role")
                    .eq("user_id", user.id)
                    .single();

                if (profile?.role !== "doctor") {
                    router.push("/"); // Redirect unauthorized users
                    return;
                }

                // Fetch Doctor Profile
                const { data: doctorData, error: doctorError } = await supabase
                    .from("doctors")
                    .select("name, specialization, hospitals(name)")
                    .eq("user_id", user.id)
                    .single();

                if (doctorError) {
                    console.error("Error fetching doctor profile:", doctorError);
                }

                if (doctorData) {
                    setDoctorProfile({
                        full_name: doctorData.name,
                        specialization: doctorData.specialization,
                        hospital: doctorData.hospitals as unknown as { name: string } || undefined
                    });
                }

                // Fetch Appointments
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

                if (appError) {
                    console.error("Error fetching appointments:", appError);
                }

                if (appointmentData) {
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
            } catch (error) {
                console.error("Unexpected error loading dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    import ShaderBackground from "@/components/ui/shader-background";

    // ... (existing imports, keep them but ensuring ShaderBackground is added)

    export default function DoctorDashboard() {
        // ... (keep state and effects)

        if (loading) {
            return <div className="min-h-screen flex items-center justify-center text-white bg-slate-950">Loading...</div>;
        }

        return (
            <div className="min-h-screen font-display text-white relative selection:bg-primary/30">
                <ShaderBackground />

                {/* Navbar */}
                <nav className="sticky top-0 z-50 w-full bg-black/20 backdrop-blur-md border-b border-white/10">
                    <div className="w-full max-w-7xl mx-auto flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="size-8 bg-primary/80 backdrop-blur rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                                <span className="material-symbols-outlined text-xl">health_metrics</span>
                            </div>
                            <span className="text-xl font-extrabold tracking-tight text-white">medcAIr</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-white">{doctorProfile?.full_name}</p>
                                <p className="text-xs text-blue-200/80">{doctorProfile?.specialization} • {doctorProfile?.hospital?.name}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { }} className="text-gray-300 hover:text-white hover:bg-white/10">
                                <Bell className="h-5 w-5" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleSignOut} className="gap-2 shadow-lg shadow-red-500/20">
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto p-6 space-y-8 relative z-10">

                    {/* Dashboard Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white shadow-xl hover:bg-white/10 transition-colors">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-blue-200">Pending Requests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-white">{pendingAppointments.length}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white shadow-xl hover:bg-white/10 transition-colors">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-green-200">Upcoming Appointments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-emerald-400">{upcomingAppointments.length}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white shadow-xl hover:bg-white/10 transition-colors">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-purple-200">Total Patients</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-purple-400">{pastAppointments.length + upcomingAppointments.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Tabs */}
                    <Tabs defaultValue="appointments" className="w-full space-y-6">
                        <TabsList className="bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 w-full sm:w-auto grid grid-cols-2 sm:flex">
                            <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-gray-400 hover:text-white transition-all px-6">Appointments</TabsTrigger>
                            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-gray-400 hover:text-white transition-all px-6">Patient History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="appointments" className="space-y-6">
                            {/* Pending Appointments Section */}
                            {pendingAppointments.length > 0 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Clock className="text-orange-400" /> Pending Approvals
                                    </h2>
                                    <div className="grid gap-4">
                                        {pendingAppointments.map((app) => (
                                            <Card key={app.id} className="bg-white/5 backdrop-blur-md border-l-4 border-l-orange-500 border-y-white/5 border-r-white/5 shadow-lg hover:shadow-orange-500/10 transition-all text-white">
                                                <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div className="space-y-1">
                                                        <h3 className="font-bold text-lg text-white">{app.patient.full_name}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                                            <Calendar className="h-4 w-4 text-orange-400" />
                                                            {new Date(app.appointment_date).toLocaleDateString()} at {app.appointment_time}
                                                        </div>
                                                        {app.reason && <p className="text-sm text-gray-400 italic">" {app.reason} "</p>}
                                                    </div>
                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                        <Button
                                                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20"
                                                            onClick={() => handleStatusUpdate(app.id, 'accepted')}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-2" /> Accept
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1 sm:flex-none border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 bg-transparent"
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
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Calendar className="text-primary" /> Upcoming Schedule
                                </h2>
                                {upcomingAppointments.length === 0 ? (
                                    <Card className="p-8 text-center text-gray-400 bg-white/5 border-white/10 backdrop-blur-md">No upcoming appointments scheduled.</Card>
                                ) : (
                                    <div className="grid gap-4">
                                        {upcomingAppointments.map((app) => (
                                            <Card key={app.id} className="bg-white/5 backdrop-blur-md border border-white/10 shadow-lg hover:border-primary/50 transition-all text-white">
                                                <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border border-primary/30">
                                                            {app.patient.full_name[0]}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-white">{app.patient.full_name}</h3>
                                                            <p className="text-sm text-gray-400">{app.patient.phone}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold text-white">
                                                            {new Date(app.appointment_date).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-sm text-primary font-medium">
                                                            {app.appointment_time}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Confirmed</Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="history">
                            <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white">
                                <CardHeader>
                                    <CardTitle>Patient History</CardTitle>
                                    <CardDescription className="text-gray-400">View past appointments and outcomes.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {pastAppointments.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">No history found.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {pastAppointments.map((app) => (
                                                <div key={app.id} className="flex items-center justify-between p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-gray-300">
                                                            <User className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{app.patient.full_name}</p>
                                                            <p className="text-xs text-gray-400">{new Date(app.appointment_date).toLocaleDateString()} • {app.status}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={app.status === 'completed' ? 'default' : 'secondary'} className={app.status === 'declined' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : ''}>
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
                    <DialogContent className="bg-slate-900 border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle>Decline Appointment</DialogTitle>
                            <DialogDescription className="text-gray-400">
                                Please provide a reason for declining this appointment. This will be visible to the patient.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="reason" className="text-white">Reason</Label>
                                <Input
                                    id="reason"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="e.g. Doctor unavailable, Schedule conflict..."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-primary"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} className="bg-transparent border-white/10 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
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
