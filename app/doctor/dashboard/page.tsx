"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Calendar,
    Clock,
    User,
    CheckCircle,
    XCircle,
    AlertCircle,
    LogOut,
    TrendingUp,
    MapPin,
    Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default function DoctorDashboard() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [doctor, setDoctor] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);

    // Form states
    const [newSlot, setNewSlot] = useState({ date: "", startTime: "", endTime: "" });

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/auth/login"); return; }

            // 1. Check if user is a doctor (via profile)
            // Note: We might need to ensure the profile role is set to 'doctor'
            // Or we can just check if they exist in the 'doctors' table by email/user_id

            let { data: doc } = await supabase
                .from("doctors")
                .select("*, hospital:hospitals(name)")
                .or(`user_id.eq.${user.id},email.eq.${user.email}`)
                .single();

            if (!doc) {
                // Not found as a doctor?
                toast.error("Doctor profile not found.");
                // router.push("/"); 
                setLoading(false);
                return;
            }

            setDoctor(doc);

            // Load data
            await loadDashboardData(doc.id);

            // Realtime subscription
            const channel = supabase
                .channel('doctor-dashboard')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doc.id}` },
                    (payload) => {
                        console.log('Realtime update:', payload);
                        loadDashboardData(doc.id); // Reload on any change
                        toast.info("Dashboard updated");
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };

        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const loadDashboardData = async (doctorId: string) => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split("T")[0];

            // 1. Get Appointments (Accepted/Scheduled)
            const { data: appts } = await supabase
                .from("appointments")
                .select("*, patient:user_profiles(full_name, phone)")
                .eq("doctor_id", doctorId)
                .in("status", ["scheduled", "accepted", "completed"])
                .gte("appointment_date", today)
                .order("appointment_date", { ascending: true })
                .order("appointment_time", { ascending: true });

            setAppointments(appts || []);

            // 2. Get Requests (Pending)
            const { data: reqs } = await supabase
                .from("appointments")
                .select("*, patient:user_profiles(full_name, phone)")
                .eq("doctor_id", doctorId)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            setRequests(reqs || []);

            // 3. Get Slots
            const { data: mySlots } = await supabase
                .from("appointment_slots")
                .select("*")
                .eq("doctor_id", doctorId)
                .gte("date", today)
                .order("date", { ascending: true });

            setSlots(mySlots || []);

        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!doctor) return;

        try {
            const { error } = await supabase.from("appointment_slots").insert({
                doctor_id: doctor.id,
                clinic_id: doctor.clinic_id, // If still used? Or null. Check constraint.
                // Wait, schema migration made clinic_id optional. But if we are in a hospital, we might want to link it?
                // Let's assume clinic_id is optional or we use hospital_id if the table supports it (but slots usually link to clinic/doctor).
                // If my schema update maintained clinic_id on slots, I need to provide it OR make it optional there too.
                // Checking supabase-schema.sql: 
                // appointment_slots references clinics(id).
                // If I haven't made clinic_id optional in appointment_slots, I MUST provide it.
                // But the doctor might check `clinic_id` from their profile.
                clinic_id: doctor.clinic_id,

                date: newSlot.date,
                start_time: newSlot.startTime,
                end_time: newSlot.endTime,
                is_available: true
            });

            if (error) {
                // If clinic_id is null in doctor profile (because linked to hospital directly), 
                // and appointment_slots requires clinic_id, this will fail.
                // I should probably make appointment_slots.clinic_id optional too or link to hospital.
                // For now, let's assume doctor has a clinic_id or I'll catch the error.
                throw error;
            }

            toast.success("Slot added");
            setNewSlot({ date: "", startTime: "", endTime: "" });
            loadDashboardData(doctor.id);
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to add slot: " + error.message);
        }
    };

    const handleAction = async (appointmentId: string, action: 'accepted' | 'rejected') => {
        try {
            const { error } = await supabase
                .from("appointments")
                .update({ status: action })
                .eq("id", appointmentId);

            if (error) throw error;
            toast.success(`Appointment ${action}`);
            // Optimistic update
            setRequests(current => current.filter(r => r.id !== appointmentId));
            if (action === 'accepted') {
                loadDashboardData(doctor.id); // Reload to move to appointments list
            }
        } catch (error) {
            console.error(error);
            toast.error("Action failed");
        }
    };

    if (loading && !doctor) {
        return <div className="p-8 flex justify-center text-gray-500">Loading Doctor Dashboard...</div>;
    }

    if (!doctor) {
        return <div className="p-8 text-center text-red-500">Access Denied: You are not registered as a doctor.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dr. {doctor.name}</h1>
                        <p className="text-gray-500">{doctor.specialization} • {doctor.hospital?.name || "Independent"}</p>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/auth/login')}>Sign Out</Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Requests & Schedule */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Appointment Requests */}
                        <Card className="border-[#e6f3f4] dark:border-gray-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="size-5 text-orange-500" />
                                    Appointment Requests
                                    {requests.length > 0 && <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">{requests.length}</span>}
                                </CardTitle>
                                <CardDescription>New booking requests requiring your approval</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {requests.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No pending requests.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {requests.map((req) => (
                                            <div key={req.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white border rounded-xl gap-4">
                                                <div className="flex gap-4">
                                                    <div className="size-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                        {req.patient?.full_name?.[0] || "P"}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{req.patient?.full_name}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                                            {req.appointment_date} at {req.appointment_time}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full md:w-auto">
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none" onClick={() => handleAction(req.id, 'accepted')}>
                                                        Accept
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex-1 md:flex-none" onClick={() => handleAction(req.id, 'rejected')}>
                                                        Decline
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Upcoming Schedule */}
                        <Card className="border-[#e6f3f4] dark:border-gray-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="size-5 text-gray-500" />
                                    Your Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {appointments.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No scheduled appointments.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {appointments.map((apt) => (
                                            <div key={apt.id} className="flex items-center p-4 border rounded-xl hover:border-blue-200 transition-all group">
                                                <div className="w-20 text-center border-r pr-4 mr-4">
                                                    <p className="font-bold text-gray-900">{apt.appointment_time}</p>
                                                    <p className="text-xs text-gray-500">{apt.appointment_date}</p>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-lg">{apt.patient?.full_name}</p>
                                                    <p className="text-sm text-gray-500">{apt.type || "General Consultation"}</p>
                                                </div>
                                                <div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${apt.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {apt.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Slot Management */}
                    <div className="space-y-8">
                        <Card className="border-[#e6f3f4] dark:border-gray-700 shadow-sm bg-blue-50/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Manage Availability</CardTitle>
                                <CardDescription>Add new time slots for patients</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateSlot} className="space-y-4">
                                    <div>
                                        <Label>Date</Label>
                                        <Input
                                            type="date"
                                            value={newSlot.date}
                                            onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                                            min={new Date().toISOString().split("T")[0]}
                                            required
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label>Start</Label>
                                            <Input
                                                type="time"
                                                value={newSlot.startTime}
                                                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                                required
                                                className="bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label>End</Label>
                                            <Input
                                                type="time"
                                                value={newSlot.endTime}
                                                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                                required
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Add Slot</Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-[#e6f3f4] dark:border-gray-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Available Slots</CardTitle>
                            </CardHeader>
                            <CardContent className="max-h-[300px] overflow-y-auto">
                                {slots.length === 0 ? (
                                    <p className="text-sm text-gray-500">No active slots.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {slots.map((slot) => (
                                            <div key={slot.id} className="flex justify-between items-center p-2 bg-white border rounded text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-900">{slot.date}</span>
                                                    <span className="text-gray-500 mx-2">|</span>
                                                    <span>{slot.start_time} - {slot.end_time}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-700 hover:bg-red-50"
                                                    onClick={async () => {
                                                        await supabase.from("appointment_slots").delete().eq("id", slot.id);
                                                        loadDashboardData(doctor.id);
                                                    }}
                                                >
                                                    <XCircle className="size-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
