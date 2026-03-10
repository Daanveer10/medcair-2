"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Clock, Plus, Trash2, Users } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Doctor {
    id: string;
    name: string;
    specialization: string;
}

interface Slot {
    id: string;
    doctor_id: string;
    clinic_id: string | null;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    booking_status?: 'available' | 'booked' | 'pending';
}

export default function HospitalSchedule() {
    const router = useRouter();
    const supabase = createClient();

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [hospitalId, setHospitalId] = useState<string | null>(null);
    const [defaultClinicId, setDefaultClinicId] = useState<string | null>(null);

    // Slot generation form
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [slotDuration, setSlotDuration] = useState("30");

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedDoctor) {
            loadSlots(selectedDoctor);
        } else {
            setSlots([]);
        }
    }, [selectedDoctor]);

    const loadInitialData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/auth/login"); return; }

            // Get hospital
            const { data: hospital } = await supabase
                .from("hospitals")
                .select("id")
                .eq("user_id", user.id)
                .single();

            if (!hospital) {
                toast.error("Hospital profile not found");
                return;
            }
            setHospitalId(hospital.id);

            // Get or create default clinic
            let { data: clinic } = await supabase
                .from("clinics")
                .select("id")
                .eq("hospital_id", hospital.id)
                .limit(1)
                .maybeSingle();

            if (!clinic) {
                const { data: newClinic } = await supabase
                    .from("clinics")
                    .insert({
                        hospital_id: hospital.id,
                        name: "General Clinic",
                        department: "General",
                        specialties: ["General"]
                    })
                    .select()
                    .single();
                clinic = newClinic;
            }
            setDefaultClinicId(clinic?.id || null);

            // Get doctors for this hospital
            const { data: doctorsData } = await supabase
                .from("doctors")
                .select("id, name, specialization")
                .eq("hospital_id", hospital.id)
                .order("name");

            setDoctors(doctorsData || []);

            // Set default dates
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            setStartDate(today.toISOString().split("T")[0]);
            setEndDate(nextWeek.toISOString().split("T")[0]);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const loadSlots = async (doctorId: string) => {
        try {
            const today = new Date().toISOString().split("T")[0];

            const { data: slotsData, error } = await supabase
                .from("appointment_slots")
                .select("*")
                .eq("doctor_id", doctorId)
                .gte("date", today)
                .order("date", { ascending: true })
                .order("start_time", { ascending: true });

            if (error) throw error;

            // Check which slots have appointments
            const slotIds = (slotsData || []).map(s => s.id);
            let bookedSlotIds = new Set<string>();
            let pendingSlotIds = new Set<string>();

            if (slotIds.length > 0) {
                const { data: appointments } = await supabase
                    .from("appointments")
                    .select("slot_id, status")
                    .in("slot_id", slotIds)
                    .in("status", ["pending", "accepted", "scheduled"]);

                for (const apt of (appointments || [])) {
                    if (apt.status === "pending") pendingSlotIds.add(apt.slot_id);
                    else bookedSlotIds.add(apt.slot_id);
                }
            }

            const transformedSlots: Slot[] = (slotsData || []).map((s: any) => ({
                ...s,
                booking_status: bookedSlotIds.has(s.id) ? 'booked' as const
                    : pendingSlotIds.has(s.id) ? 'pending' as const
                        : 'available' as const
            }));

            setSlots(transformedSlots);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load slots");
        }
    };

    const handleGenerateSlots = async () => {
        if (!selectedDoctor || !startDate || !endDate || !startTime || !endTime) {
            toast.error("Please fill in all fields");
            return;
        }

        setGenerating(true);
        try {
            const duration = parseInt(slotDuration);
            const slotsToInsert: any[] = [];

            // Generate for each day in range
            const current = new Date(startDate);
            const end = new Date(endDate);

            while (current <= end) {
                const dateStr = current.toISOString().split("T")[0];

                // Parse start/end times
                const [startH, startM] = startTime.split(":").map(Number);
                const [endH, endM] = endTime.split(":").map(Number);

                let currentMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;

                while (currentMinutes + duration <= endMinutes) {
                    const slotStartH = Math.floor(currentMinutes / 60).toString().padStart(2, "0");
                    const slotStartM = (currentMinutes % 60).toString().padStart(2, "0");
                    const slotEndMinutes = currentMinutes + duration;
                    const slotEndH = Math.floor(slotEndMinutes / 60).toString().padStart(2, "0");
                    const slotEndM = (slotEndMinutes % 60).toString().padStart(2, "0");

                    slotsToInsert.push({
                        doctor_id: selectedDoctor,
                        clinic_id: defaultClinicId,
                        date: dateStr,
                        start_time: `${slotStartH}:${slotStartM}`,
                        end_time: `${slotEndH}:${slotEndM}`,
                        is_available: true,
                    });

                    currentMinutes += duration;
                }

                current.setDate(current.getDate() + 1);
            }

            if (slotsToInsert.length === 0) {
                toast.error("No slots to generate with given parameters");
                return;
            }

            // Insert in batches of 50
            for (let i = 0; i < slotsToInsert.length; i += 50) {
                const batch = slotsToInsert.slice(i, i + 50);
                const { error } = await supabase.from("appointment_slots").insert(batch);
                if (error) throw error;
            }

            toast.success(`Generated ${slotsToInsert.length} slots!`);
            loadSlots(selectedDoctor);

        } catch (error: any) {
            console.error(error);
            toast.error("Failed to generate slots: " + (error.message || "Unknown error"));
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteSlot = async (slotId: string) => {
        try {
            const { error } = await supabase
                .from("appointment_slots")
                .delete()
                .eq("id", slotId);
            if (error) throw error;

            setSlots(prev => prev.filter(s => s.id !== slotId));
            toast.success("Slot removed");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete slot");
        }
    };

    // Group slots by date
    const groupedSlots = slots.reduce((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    const sortedDates = Object.keys(groupedSlots).sort();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#0c1b1d] dark:text-white">Schedule Management</h1>
                <p className="text-gray-500 mt-1">Create and manage appointment slots for your doctors</p>
            </div>

            {doctors.length === 0 ? (
                <Card className="bg-white dark:bg-gray-800 border border-[#e6f3f4] dark:border-gray-700">
                    <CardContent className="pt-6 text-center py-12">
                        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">No doctors found</p>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Add doctors first before creating appointment slots.</p>
                        <Button onClick={() => router.push("/hospital/doctors")} className="bg-primary text-white">
                            Go to Doctors Page
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Slot Generator */}
                    <Card className="lg:col-span-1 bg-white dark:bg-gray-800 border border-[#e6f3f4] dark:border-gray-700 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <Plus className="size-5 text-primary" />
                                Generate Slots
                            </CardTitle>
                            <CardDescription className="text-gray-500">Bulk-create appointment slots</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Doctor Select */}
                            <div>
                                <Label className="text-gray-900 dark:text-gray-200 font-semibold">Doctor *</Label>
                                <select
                                    value={selectedDoctor}
                                    onChange={(e) => setSelectedDoctor(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-primary"
                                >
                                    <option value="">Select a doctor</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} — {doc.specialization}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-gray-900 dark:text-gray-200 font-semibold text-xs">Start Date</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="border-2 border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-900 dark:text-gray-200 font-semibold text-xs">End Date</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="border-2 border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                            </div>

                            {/* Time Range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-gray-900 dark:text-gray-200 font-semibold text-xs">Start Time</Label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="border-2 border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-900 dark:text-gray-200 font-semibold text-xs">End Time</Label>
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="border-2 border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <Label className="text-gray-900 dark:text-gray-200 font-semibold text-xs">Slot Duration (minutes)</Label>
                                <select
                                    value={slotDuration}
                                    onChange={(e) => setSlotDuration(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-primary"
                                >
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="45">45 minutes</option>
                                    <option value="60">60 minutes</option>
                                </select>
                            </div>

                            <Button
                                onClick={handleGenerateSlots}
                                disabled={!selectedDoctor || generating}
                                className="w-full bg-primary text-white hover:bg-primary/90"
                            >
                                {generating ? "Generating..." : "Generate Slots"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Right: Existing Slots */}
                    <div className="lg:col-span-2 space-y-6">
                        {!selectedDoctor ? (
                            <Card className="bg-white dark:bg-gray-800 border border-[#e6f3f4] dark:border-gray-700">
                                <CardContent className="pt-6 text-center py-12">
                                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500">Select a doctor to view their schedule</p>
                                </CardContent>
                            </Card>
                        ) : slots.length === 0 ? (
                            <Card className="bg-white dark:bg-gray-800 border border-[#e6f3f4] dark:border-gray-700">
                                <CardContent className="pt-6 text-center py-12">
                                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">No slots created yet</p>
                                    <p className="text-gray-500 text-sm">Use the generator on the left to create appointment slots</p>
                                </CardContent>
                            </Card>
                        ) : (
                            sortedDates.map(date => (
                                <Card key={date} className="bg-white dark:bg-gray-800 border border-[#e6f3f4] dark:border-gray-700">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Calendar className="size-4 text-primary" />
                                            {new Date(date).toLocaleDateString("en-US", {
                                                weekday: "long",
                                                month: "long",
                                                day: "numeric",
                                                year: "numeric"
                                            })}
                                            <span className="ml-auto text-xs font-normal text-gray-400">
                                                {groupedSlots[date].length} slots
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                            {groupedSlots[date].map(slot => (
                                                <div
                                                    key={slot.id}
                                                    className={`
                                                        relative group flex items-center justify-between p-3 rounded-xl border text-sm transition-all
                                                        ${slot.booking_status === 'booked'
                                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                                            : slot.booking_status === 'pending'
                                                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                                                                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                                        }
                                                    `}
                                                >
                                                    <div>
                                                        <p className="font-bold">{slot.start_time.slice(0, 5)}</p>
                                                        <p className="text-[10px] uppercase font-bold opacity-70">
                                                            {slot.booking_status === 'booked' ? 'Booked'
                                                                : slot.booking_status === 'pending' ? 'Pending'
                                                                    : 'Open'}
                                                        </p>
                                                    </div>
                                                    {slot.booking_status === 'available' && (
                                                        <button
                                                            onClick={() => handleDeleteSlot(slot.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                                                            title="Delete slot"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
