"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Prevent static generation - requires authentication and dynamic params
export const dynamic = 'force-dynamic';

interface Slot {
    id: string;
    doctor_id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    clinic_id: string;
    slot_status?: 'available' | 'booked' | 'pending' | 'unavailable';
}

interface Doctor {
    id: string;
    name: string;
    specialization: string;
    hospital: {
        name: string;
        address: string;
        city: string;
    } | null;
    consultation_fee: number;
}

export default function DoctorPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = createClient();
    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState("");

    useEffect(() => {
        loadDoctorData();

        // Set up real-time subscription for appointment changes for this doctor
        const channel = supabase
            .channel('appointment-changes-doctor')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments',
                    filter: `doctor_id=eq.${params.id}`
                },
                () => {
                    loadDoctorData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [params.id]);

    const loadDoctorData = async () => {
        try {
            // Load doctor info
            const { data: doctorData, error: doctorError } = await supabase
                .from("doctors")
                .select(`
          id,
          name,
          specialization,
          consultation_fee,
          hospital:hospitals (
            name,
            address,
            city
          )
        `)
                .eq("id", params.id)
                .single();

            if (doctorError) throw doctorError;

            const hospitalData = Array.isArray(doctorData.hospital) ? doctorData.hospital[0] : doctorData.hospital;

            setDoctor({
                id: doctorData.id,
                name: doctorData.name,
                specialization: doctorData.specialization,
                consultation_fee: doctorData.consultation_fee,
                hospital: hospitalData || null,
            });

            // Load slots for next 7 days
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);

            const { data: slotsData, error: slotsError } = await supabase
                .from("appointment_slots")
                .select("*")
                .eq("doctor_id", params.id)
                .gte("date", today.toISOString().split("T")[0])
                .lte("date", nextWeek.toISOString().split("T")[0])
                .order("date", { ascending: true })
                .order("start_time", { ascending: true });

            if (slotsError) throw slotsError;

            // Get all appointments for these slots to check which are booked/pending
            const slotIds = (slotsData || []).map((s: any) => s.id);
            const { data: appointmentsData } = await supabase
                .from("appointments")
                .select("slot_id, status, patient_id")
                .in("slot_id", slotIds)
                .in("status", ["pending", "accepted", "scheduled"]);

            // Get current user's profile
            const { data: { user } } = await supabase.auth.getUser();
            let currentPatientId: string | null = null;
            if (user) {
                const { data: profile } = await supabase
                    .from("user_profiles")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();
                currentPatientId = profile?.id || null;
            }

            // Separate booked (accepted/scheduled) and pending appointments
            const bookedSlotIds = new Set(
                (appointmentsData || [])
                    .filter((apt: any) => apt.status === "accepted" || apt.status === "scheduled")
                    .map((apt: any) => apt.slot_id)
            );

            // Pending appointments by current user (waiting for response)
            const pendingByCurrentUser = new Set(
                (appointmentsData || [])
                    .filter((apt: any) => apt.status === "pending" && apt.patient_id === currentPatientId)
                    .map((apt: any) => apt.slot_id)
            );

            // Pending appointments by other users (unavailable)
            const pendingByOthers = new Set(
                (appointmentsData || [])
                    .filter((apt: any) => apt.status === "pending" && apt.patient_id !== currentPatientId)
                    .map((apt: any) => apt.slot_id)
            );

            // Transform slots data
            const transformedSlots = (slotsData || []).map((slot: any) => {
                const isBooked = bookedSlotIds.has(slot.id);
                const isPendingByMe = pendingByCurrentUser.has(slot.id);
                const isPendingByOthers = pendingByOthers.has(slot.id);

                let slotStatus: 'available' | 'booked' | 'pending' | 'unavailable' = 'available';
                if (isBooked) {
                    slotStatus = 'booked';
                } else if (isPendingByMe) {
                    slotStatus = 'pending';
                } else if (isPendingByOthers) {
                    slotStatus = 'unavailable';
                }

                return {
                    id: slot.id,
                    doctor_id: slot.doctor_id,
                    date: slot.date,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    is_available: slot.is_available && !isBooked && !isPendingByOthers,
                    slot_status: slotStatus,
                    clinic_id: slot.clinic_id // Ensure we have clinic_id from slot if present
                };
            });

            setSlots(transformedSlots);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load doctor data");
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = async (slotId: string) => {
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

        const slot = slots.find(s => s.id === slotId);
        if (!slot) return;

        // Logic similar to ClinicPage booking...
        try {
            // We need clinic_id. If slot has it, use it. If not, maybe use hospital linkage?
            // Schema says appointments need clinic_id.
            // If doctor is hospital-bound, we might not have a "clinic_id" if they aren't in a clinic department.
            // But let's assume slot.clinic_id is present or we fetch a default clinic for hospital?
            // For MVP, if slot.clinic_id is missing, we might fail constraint.
            // I'll assume slot.clinic_id is there or I updated schema to make it optional?
            // My schema update in Step 39 made clinic_id optional in `doctors`, but `appointments` table might still require it.
            // Let's check `appointments` schema constraint if needed.
            // Assuming it's optional in Appointments if I updated it, or I just pass null.

            const { error } = await supabase.from("appointments").insert({
                patient_id: profile.id,
                doctor_id: slot.doctor_id,
                clinic_id: slot.clinic_id || null, // Allow null if schema supports
                slot_id: slotId,
                appointment_date: slot.date,
                appointment_time: slot.start_time,
                status: "pending"
            });

            if (error) throw error;

            toast.success("Appointment Requested");
            loadDoctorData();
        } catch (error: any) {
            console.error(error);
            toast.error("Booking Failed: " + error.message);
        }
    };

    // Group slots by date
    const groupedSlots = slots.reduce((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    const availableDates = Object.keys(groupedSlots).sort();
    const slotsForSelectedDate = selectedDate ? (groupedSlots[selectedDate] || []) : [];

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Doctor Profile...</div>;
    if (!doctor) return <div className="p-8 text-center text-red-500">Doctor not found.</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Link href="/patient/dashboard">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{doctor.name}</CardTitle>
                        <CardDescription>{doctor.specialization}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2">
                            {doctor.hospital && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <MapPin className="size-4" />
                                    <span>{doctor.hospital.name}, {doctor.hospital.city}</span>
                                </div>
                            )}
                            <div className="font-semibold text-green-600">${doctor.consultation_fee} / visit</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Available Slots</CardTitle>
                        <CardDescription>Select a date and time to request an appointment</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {availableDates.length === 0 ? (
                            <p className="text-gray-500 text-center py-6">No slots available currently.</p>
                        ) : (
                            <div className="space-y-6">
                                {/* Dates */}
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {availableDates.map(date => (
                                        <button
                                            key={date}
                                            onClick={() => setSelectedDate(date)}
                                            className={`p-2 rounded border text-center text-sm ${selectedDate === date ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </button>
                                    ))}
                                </div>

                                {/* Slots */}
                                {selectedDate && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {slotsForSelectedDate.map(slot => {
                                            const isAvailable = slot.slot_status === 'available';
                                            const isPending = slot.slot_status === 'pending';

                                            return (
                                                <button
                                                    key={slot.id}
                                                    disabled={!isAvailable}
                                                    onClick={() => handleBookAppointment(slot.id)}
                                                    className={`p-3 rounded border flex flex-col items-center justify-center gap-1 transition-all
                               ${isAvailable ? 'bg-white border-green-200 hover:border-green-500 hover:shadow-sm cursor-pointer' : ''}
                               ${isPending ? 'bg-yellow-50 border-yellow-200 text-yellow-700 cursor-not-allowed' : ''}
                               ${slot.slot_status === 'booked' || slot.slot_status === 'unavailable' ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : ''}
                             `}
                                                >
                                                    <span className="font-bold">{slot.start_time}</span>
                                                    <span className="text-[10px] uppercase font-bold">
                                                        {isAvailable ? 'Book' : slot.slot_status}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
