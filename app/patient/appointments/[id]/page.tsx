"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Download,
    Share2,
    Calendar,
    Clock,
    User,
    MapPin,
    CheckCircle2,
    AlertCircle,
    Stethoscope,
    Pill,
    Activity,
    ArrowLeft,
    Sparkles
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export const dynamic = 'force-dynamic';

interface AppointmentData {
    id: string;
    doctor_name: string;
    doctor_specialty: string;
    clinic_name: string;
    clinic_address: string;
    date: string;
    time: string;
    type: string;
    status: string;
    notes?: string;
    prescription?: {
        medicines: { name: string; dosage: string; duration: string; notes?: string }[];
        diagnosis: string[];
        advice: string[];
    };
    ai_summary?: {
        key_points: string[];
        next_steps: string[];
        lifestyle_tips: string[];
    };
}

export default function ConsultationSummary() {
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AppointmentData | null>(null);

    useEffect(() => {
        if (params.id) {
            loadAppointmentDetails(params.id as string);
        }
    }, [params.id]);

    const loadAppointmentDetails = async (id: string) => {
        try {
            // Fetch real data from Supabase
            // Select appointment + joined doctor + joined clinic
            // Note: Syntax assumes standard Supabase foreign key relationships
            const { data: appointment, error } = await supabase
                .from('appointments')
                .select(`
                    id,
                    appointment_date,
                    appointment_time,
                    status,
                    reason,
                    notes,
                    doctor:doctors(name, specialization),
                    clinic:clinics(name, address, city, state)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!appointment) throw new Error("Appointment not found");

            // Extract doctor and clinic info safely
            const docName = Array.isArray(appointment.doctor)
                ? appointment.doctor[0]?.name
                : appointment.doctor?.name || "Unknown Doctor";

            const docSpecialty = Array.isArray(appointment.doctor)
                ? appointment.doctor[0]?.specialization
                : appointment.doctor?.specialization || "General Specialist";

            const clinicName = Array.isArray(appointment.clinic)
                ? appointment.clinic[0]?.name
                : appointment.clinic?.name || "Unknown Clinic";

            const clinicCity = Array.isArray(appointment.clinic)
                ? appointment.clinic[0]?.city
                : appointment.clinic?.city || "";

            // Parse Notes / "AI Summary"
            // Since we don't have a prescriptions table, we use 'notes'
            // If notes contains JSON-like structure or specific delimiters, we could parse it
            // For now, we treat notes as the main advice.

            const rawNotes = appointment.notes || "No notes provided by the doctor.";

            // Mocking "AI" extraction from the raw notes for the sake of the UI
            // In a real functionality, this would call an LLM API
            const aiKeyPoints = [
                "Consultation completed successfully.",
                "Follow doctor's advice carefully.",
                "Review the notes below for more details."
            ];

            // Determine type
            const type = appointment.reason?.toLowerCase().includes("video") ? "Video" : "In-Person";

            const realData: AppointmentData = {
                id: appointment.id,
                doctor_name: docName,
                doctor_specialty: docSpecialty,
                clinic_name: clinicName,
                clinic_address: clinicCity, // Just showing City for now as full address might be missing in select
                date: appointment.appointment_date,
                time: appointment.appointment_time,
                type: type,
                status: appointment.status,
                notes: appointment.notes,
                prescription: {
                    // Start with empty medicines for now or generic if notes present
                    medicines: appointment.notes ? [
                        { name: "Refer to Doctor's Notes", dosage: "-", duration: "-", notes: "See below" }
                    ] : [],
                    diagnosis: appointment.reason ? [appointment.reason] : ["General Checkup"],
                    advice: [rawNotes]
                },
                ai_summary: {
                    key_points: aiKeyPoints,
                    next_steps: ["Adhere to the plan outlined in notes."],
                    lifestyle_tips: ["Stay hydrated", "Monitor symptoms"]
                }
            };

            setData(realData);

        } catch (error) {
            console.error("Error loading appointment:", error);
            // Don't show toast on 404 immediately/user might be navigating
            toast.error("Failed to load details");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4">
                <AlertCircle className="size-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Appointment Not Found</h1>
                <p className="text-gray-500 mb-6">The appointment details you are looking for could not be loaded.</p>
                <Link href="/patient/dashboard">
                    <Button>Go to Dashboard</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#0c1b1d] dark:text-white pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-[#e6f3f4] dark:border-gray-700 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/patient/dashboard">
                            <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <ArrowLeft className="size-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold leading-tight">Consultation Summary</h1>
                            <p className="text-xs text-gray-500 font-medium">ID: #{data.id.slice(0, 8)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="hidden sm:flex border-2 border-gray-200">
                            <Download className="size-4 mr-2" />
                            Download PDF
                        </Button>
                        <Button variant="outline" size="sm" className="hidden sm:flex border-2 border-gray-200">
                            <Share2 className="size-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Status & Basic Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-[#e6f3f4] dark:border-gray-700 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-start gap-4">
                            <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400">
                                {data.doctor_name[0]}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{data.doctor_name}</h2>
                                <p className="text-primary font-medium mb-1">{data.doctor_specialty}</p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {data.clinic_name} {data.clinic_address ? `- ${data.clinic_address}` : ''}</span>
                                    <span className="flex items-center gap-1.5"><Calendar className="size-4" /> {data.date}</span>
                                    <span className="flex items-center gap-1.5"><Clock className="size-4" /> {data.time}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-bold border border-green-100 flex items-center">
                                <CheckCircle2 className="size-4 mr-2" /> {data.status}
                            </span>
                            <p className="text-sm font-medium text-gray-500">{data.type} Consultation</p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Left Column: AI Summary */}
                    <div className="md:col-span-2 space-y-6">
                        {/* AI Insights Card */}
                        <div className="bg-gradient-to-br from-[#f0f9fa] to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl border border-primary/20 shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Sparkles className="size-32" />
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                        <Sparkles className="size-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-primary">AI Consultation Insights</h3>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold mb-3 text-gray-900 dark:text-gray-100">
                                            <Activity className="size-5 text-blue-500" /> Key Takeaways
                                        </h4>
                                        <ul className="space-y-3">
                                            {data.ai_summary?.key_points.map((point, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                                                    <span className="mt-1.5 size-1.5 bg-primary rounded-full flex-shrink-0"></span>
                                                    <span className="leading-relaxed">{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="h-px bg-primary/10 w-full"></div>

                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold mb-3 text-gray-900 dark:text-gray-100">
                                            <CheckCircle2 className="size-5 text-green-500" /> Recommended Next Steps
                                        </h4>
                                        <ul className="space-y-3">
                                            {data.ai_summary?.next_steps.map((step, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                                                    <span className="mt-1.5 size-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                                                    <span className="leading-relaxed">{step}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Digital Prescription */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e6f3f4] dark:border-gray-700 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                        <FileText className="size-6" />
                                    </div>
                                    <h3 className="text-xl font-bold">Digital Prescription</h3>
                                </div>
                                <span className="text-sm text-gray-400 font-mono">#{data.id.slice(-6).toUpperCase()}</span>
                            </div>

                            <div className="space-y-6">
                                {/* Diagnosis */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Diagnosis</p>
                                    <div className="flex flex-wrap gap-2">
                                        {data.prescription?.diagnosis.map((diag, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium">{diag}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Medicines */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Medications</p>
                                    <div className="space-y-3">
                                        {data.prescription?.medicines.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No medications prescribed yet.</p>
                                        ) : (
                                            data.prescription?.medicines.map((med, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-[#e6f3f4]/30 dark:bg-gray-700/30 rounded-xl border border-[#e6f3f4] dark:border-gray-700">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-primary shadow-sm">
                                                            <Pill className="size-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold">{med.name}</p>
                                                            <p className="text-sm text-gray-500">{med.dosage}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-sm">
                                                        <p className="font-bold text-gray-700 dark:text-gray-300">{med.duration}</p>
                                                        <p className="text-xs text-gray-500">{med.notes}</p>
                                                    </div>
                                                </div>
                                            )))}
                                    </div>
                                </div>

                                {/* Advice */}
                                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Doctor's Advice</p>
                                    <ul className="list-disc list-inside text-sm text-amber-900 dark:text-amber-100 space-y-1">
                                        {data.prescription?.advice.map((advice, idx) => (
                                            <li key={idx}>{advice}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Lifestyle & Vitals */}
                    <div className="space-y-6">
                        {/* Lifestyle Tips */}
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 shadow-sm p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Stethoscope className="size-6 text-emerald-600" />
                                <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Lifestyle Tips</h3>
                            </div>
                            <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-4 leading-relaxed">
                                Based on your diagnosis, adopting these small changes can significantly improve your health outcomes.
                            </p>
                            <ul className="space-y-3">
                                {data.ai_summary?.lifestyle_tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-3 bg-white/60 dark:bg-gray-800/60 p-3 rounded-xl border border-emerald-100/50">
                                        <CheckCircle2 className="size-4 text-emerald-500 mt-0.5" />
                                        <span className="text-sm text-emerald-900 dark:text-emerald-100 font-medium">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Follow Up Card */}
                        <div className="bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 p-6 relative overflow-hidden group">
                            <div className="absolute -right-10 -bottom-10 size-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
                            <h3 className="font-bold text-lg mb-2">Need a Follow-up?</h3>
                            <p className="text-white/80 text-sm mb-6">Your doctor recommends a follow-up visit in 30 days to monitor your progress.</p>
                            <Button variant="secondary" className="w-full font-bold text-primary hover:bg-white/90">
                                Book Follow-up
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
