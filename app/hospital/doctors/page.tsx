"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { handleError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Stethoscope, Trash2, Plus, Search, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Prevent static generation - requires authentication
export const dynamic = 'force-dynamic';

export default function DoctorDashboard() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [hospitalId, setHospitalId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    // Add Doctor Form State
    const [doctorForm, setDoctorForm] = useState({
        name: "",
        doctor_id: "",
        specialization: "",
        degree: "",
        email: "",
        phone: "",
        photo_url: "",
        credentials: "",
        years_of_experience: "",
        languages_spoken: "",
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadDoctors();
    }, []);

    const loadDoctors = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/login");
                return;
            }

            // 1. Get Hospital ID
            let { data: hospital } = await supabase
                .from("hospitals")
                .select("id, name")
                .eq("user_id", user.id)
                .maybeSingle();

            if (!hospital) {
                // If no hospital profile, create one automatically (implicit profile)
                const { data: profile } = await supabase
                    .from("user_profiles")
                    .select("full_name")
                    .eq("user_id", user.id)
                    .single();

                const { data: newHospital, error: createError } = await supabase
                    .from("hospitals")
                    .insert({
                        user_id: user.id,
                        name: profile?.full_name || "My Hospital",
                        address: "",
                        city: "",
                        state: "",
                        zip_code: "",
                        phone: "",
                        email: user.email || "",
                    })
                    .select("id, name")
                    .single();

                if (createError) throw createError;

                // Continue with the new hospital
                hospital = newHospital;
                toast.success("Hospital profile initialized");
            }

            setHospitalId(hospital.id);

            // 2. Get All Clinics for this Hospital
            const { data: clinics } = await supabase
                .from("clinics")
                .select("id")
                .eq("hospital_id", hospital.id);

            const clinicIds = clinics?.map(c => c.id) || [];

            if (clinicIds.length === 0) {
                setDoctors([]);
                setLoading(false);
                return;
            }

            // 3. Get Doctors in these clinics
            const { data: doctorsData, error } = await supabase
                .from("doctors")
                .select("*")
                .in("clinic_id", clinicIds)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setDoctors(doctorsData || []);

        } catch (error) {
            handleError(error, { action: "loadDoctors", resource: "doctors" });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDoctor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hospitalId) return;

        setCreating(true);
        try {
            // 1. Find or Create Default Clinic "General Clinic"
            let { data: clinic } = await supabase
                .from("clinics")
                .select("id")
                .eq("hospital_id", hospitalId)
                .eq("name", "General Clinic")
                .maybeSingle();

            if (!clinic) {
                // If not found, check if ANY clinic exists to fallback
                const { data: anyClinic } = await supabase
                    .from("clinics")
                    .select("id")
                    .eq("hospital_id", hospitalId)
                    .limit(1)
                    .maybeSingle();

                if (anyClinic) {
                    clinic = anyClinic;
                } else {
                    // Create "General Clinic"
                    const { data: newClinic, error: createError } = await supabase
                        .from("clinics")
                        .insert({
                            hospital_id: hospitalId,
                            name: "General Clinic",
                            department: "General",
                            specialties: ["General"]
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    clinic = newClinic;
                }
            }

            if (!clinic) throw new Error("Could not find or create a clinic to assign the doctor to.");

            // 2. Create the Doctor
            const { error } = await supabase.from("doctors").insert({
                clinic_id: clinic.id,
                name: doctorForm.name,
                specialization: doctorForm.specialization,
                doctor_id: doctorForm.doctor_id || null,
                degree: doctorForm.degree || null,
                email: doctorForm.email || null,
                phone: doctorForm.phone || null,
                photo_url: doctorForm.photo_url || null,
                credentials: doctorForm.credentials ? doctorForm.credentials.split(',').map(s => s.trim()) : [],
                years_of_experience: doctorForm.years_of_experience ? parseInt(doctorForm.years_of_experience) : null,
                languages_spoken: doctorForm.languages_spoken ? doctorForm.languages_spoken.split(',').map(s => s.trim()) : [],
            });

            if (error) throw error;

            toast.success("Doctor Added Successfully");
            setOpen(false);
            setDoctorForm({
                name: "",
                doctor_id: "",
                specialization: "",
                degree: "",
                email: "",
                phone: "",
                photo_url: "",
                credentials: "",
                years_of_experience: "",
                languages_spoken: "",
            });
            loadDoctors();

        } catch (error) {
            handleError(error, { action: "createDoctor", resource: "doctors" });
            toast.error("Failed to create doctor");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteDoctor = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to remove Dr. ${name}? This action cannot be undone.`)) return;

        try {
            const { error } = await supabase.from("doctors").delete().eq("id", id);
            if (error) throw error;

            toast.success(`Removed Dr. ${name}`);
            setDoctors(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            handleError(error, { action: "deleteDoctor", resource: "doctors" });
            toast.error("Failed to delete doctor");
        }
    };

    const filteredDoctors = doctors.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialization.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#0c1b1d] dark:text-white">Doctors Dashboard</h1>
                    <p className="text-gray-500 mt-1">Manage your medical staff and specialists</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4" /> Add New Doctor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <DialogHeader>
                            <DialogTitle>Add New Doctor</DialogTitle>
                            <DialogDescription>
                                Enter the details of the doctor. They will be added to your hospital's general roster.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateDoctor} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Doctor Name *</Label>
                                    <Input
                                        required
                                        placeholder="Dr. Jane Doe"
                                        value={doctorForm.name}
                                        onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Specialization *</Label>
                                    <Input
                                        required
                                        placeholder="Cardiologist"
                                        value={doctorForm.specialization}
                                        onChange={e => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>License / Doctor ID</Label>
                                    <Input
                                        placeholder="MD-12345"
                                        value={doctorForm.doctor_id}
                                        onChange={e => setDoctorForm({ ...doctorForm, doctor_id: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Degree</Label>
                                    <Input
                                        placeholder="MBBS, MD"
                                        value={doctorForm.degree}
                                        onChange={e => setDoctorForm({ ...doctorForm, degree: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        placeholder="doctor@hospital.com"
                                        value={doctorForm.email}
                                        onChange={e => setDoctorForm({ ...doctorForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        placeholder="+1 555 000 0000"
                                        value={doctorForm.phone}
                                        onChange={e => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Credentials (comma separated)</Label>
                                <Input
                                    placeholder="FACC, FSCAI"
                                    value={doctorForm.credentials}
                                    onChange={e => setDoctorForm({ ...doctorForm, credentials: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Experience (Years)</Label>
                                    <Input
                                        type="number"
                                        placeholder="10"
                                        value={doctorForm.years_of_experience}
                                        onChange={e => setDoctorForm({ ...doctorForm, years_of_experience: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Languages (comma separated)</Label>
                                    <Input
                                        placeholder="English, Spanish"
                                        value={doctorForm.languages_spoken}
                                        onChange={e => setDoctorForm({ ...doctorForm, languages_spoken: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating} className="bg-primary text-white">
                                    {creating ? "Adding..." : "Add Doctor"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search by name or specialization..."
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading doctors...</div>
            ) : filteredDoctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-4">
                        <Stethoscope className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No doctors found</h3>
                    <p className="text-gray-500 mb-6 text-sm">Get started by adding your first doctor.</p>
                    <Button onClick={() => setOpen(true)} variant="outline" className="border-primary text-primary hover:bg-primary/5">
                        Add Doctor
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDoctors.map((doc) => (
                        <Card key={doc.id} className="group bg-white dark:bg-gray-800 border border-[#e6f3f4] dark:border-gray-700 hover:shadow-lg transition-all duration-300">
                            <CardHeader className="flex flex-col items-center pb-4 pt-6 text-center relative">
                                <button
                                    onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Doctor"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary text-2xl font-bold">
                                    {doc.photo_url ? (
                                        <img src={doc.photo_url} alt={doc.name} className="size-full rounded-full object-cover" />
                                    ) : (
                                        doc.name[0]
                                    )}
                                </div>
                                <CardTitle className="text-lg font-bold text-[#0c1b1d] dark:text-white">{doc.name}</CardTitle>
                                <CardDescription className="text-primary font-medium">{doc.specialization}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center space-y-4 pb-6 px-6">
                                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                    <span>{doc.degree || "MD"}</span>
                                    <span className="size-1 bg-gray-300 rounded-full"></span>
                                    <span>{doc.years_of_experience ? `${doc.years_of_experience} yrs exp` : "N/A"}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                    <div className="bg-green-50 text-green-700 py-1.5 rounded-md border border-green-100">
                                        Active
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 py-1.5 rounded-md border border-blue-100">
                                        {doc.doctor_id || "No ID"}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100 shadow-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        View Schedule
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
