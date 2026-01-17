"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { handleError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Calendar, Clock, User, Stethoscope, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Prevent static generation - requires authentication
export const dynamic = 'force-dynamic';

export default function HospitalSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [hospital, setHospital] = useState<any>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClinicForm, setShowClinicForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [selectedClinicForDoctor, setSelectedClinicForDoctor] = useState("");

  const [clinicForm, setClinicForm] = useState({
    name: "",
    department: "",
    specialties: "",
  });

  const [slotForm, setSlotForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
    doctor_name: "",
    specialization: "",
  });

  const [doctorForm, setDoctorForm] = useState({
    name: "",
    doctor_id: "",
    specialization: "",
    degree: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: hospitalData } = await supabase
      .from("hospitals")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (hospitalData) {
      setHospital(hospitalData);
      
      const { data: clinicsData } = await supabase
        .from("clinics")
        .select("*")
        .eq("hospital_id", hospitalData.id);
      
      setClinics(clinicsData || []);
    } else {
      // Create hospital if doesn't exist
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const { data: newHospital } = await supabase
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
        .select()
        .single();

      if (newHospital) {
        setHospital(newHospital);
      }
    }

    setLoading(false);
  };

  const handleCreateClinic = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hospital) return;

    try {
      // Validate clinic data
      const { ClinicSchema } = await import("@/lib/validations");
      const { validateData } = await import("@/lib/utils");

      const specialties = clinicForm.specialties
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      const validation = validateData(ClinicSchema, {
        name: clinicForm.name,
        department: clinicForm.department,
        specialties,
        hospitalId: hospital.id,
      });

      if (!validation.success) {
        toast.error("Validation Failed", {
          description: validation.error?.message || "Invalid clinic data. Please check your inputs.",
        });
        return;
      }

      const { error } = await supabase.from("clinics").insert({
        hospital_id: validation.data.hospitalId,
        name: validation.data.name,
        department: validation.data.department,
        specialties: validation.data.specialties || [],
      });

      if (error) throw error;

      toast.success("Clinic Created", {
        description: "The clinic has been created successfully.",
      });
      setClinicForm({ name: "", department: "", specialties: "" });
      setShowClinicForm(false);
      loadData();
    } catch (error) {
      const errorResponse = handleError(error, { action: "createClinic", resource: "clinics" });
      toast.error("Creation Failed", {
        description: errorResponse.error?.message || "Failed to create clinic.",
      });
    }
  };

  const handleCreateSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClinic) return;

    try {
      const { DoctorSchema, AppointmentSlotSchema } = await import("@/lib/validations");
      const { validateData } = await import("@/lib/utils");

      // Validate doctor data
      const doctorValidation = validateData(DoctorSchema, {
        name: slotForm.doctor_name,
        specialization: slotForm.specialization,
        clinicId: selectedClinic,
      });

      if (!doctorValidation.success) {
        toast.error("Validation Failed", {
          description: doctorValidation.error?.message || "Invalid doctor information.",
        });
        return;
      }

      // First, get or create doctor
      const { data: existingDoctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("clinic_id", selectedClinic)
        .eq("name", doctorValidation.data.name)
        .single();

      let doctorId;
      if (existingDoctor) {
        doctorId = existingDoctor.id;
      } else {
        const { data: newDoctor, error: doctorError } = await supabase
          .from("doctors")
          .insert({
            clinic_id: doctorValidation.data.clinicId,
            name: doctorValidation.data.name,
            specialization: doctorValidation.data.specialization,
          })
          .select()
          .single();

        if (doctorError) throw doctorError;
        if (!newDoctor) throw new Error("Failed to create doctor");
        doctorId = newDoctor.id;
      }

      // Validate slot data
      const slotValidation = validateData(AppointmentSlotSchema, {
        clinicId: selectedClinic,
        doctorId: doctorId,
        date: slotForm.date,
        startTime: slotForm.start_time,
        endTime: slotForm.end_time,
      });

      if (!slotValidation.success) {
        toast.error("Validation Failed", {
          description: slotValidation.error?.message || "Invalid slot information.",
        });
        return;
      }

      // Create slot
      const { error } = await supabase.from("appointment_slots").insert({
        clinic_id: slotValidation.data.clinicId,
        doctor_id: slotValidation.data.doctorId,
        date: slotValidation.data.date,
        start_time: slotValidation.data.startTime,
        end_time: slotValidation.data.endTime,
        is_available: true,
      });

      if (error) throw error;

      toast.success("Time Slot Created", {
        description: "The appointment slot has been created successfully.",
      });
      setSlotForm({
        date: "",
        start_time: "",
        end_time: "",
        doctor_name: "",
        specialization: "",
      });
      setShowSlotForm(false);
    } catch (error) {
      const errorResponse = handleError(error, { action: "createSlot", resource: "appointment_slots" });
      toast.error("Creation Failed", {
        description: errorResponse.error?.message || "Failed to create time slot.",
      });
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClinicForDoctor) {
      toast.error("Validation Failed", {
        description: "Please select a clinic first.",
      });
      return;
    }

    try {
      const { DoctorSchema } = await import("@/lib/validations");
      const { validateData } = await import("@/lib/utils");

      const validation = validateData(DoctorSchema, {
        name: doctorForm.name,
        specialization: doctorForm.specialization,
        clinicId: selectedClinicForDoctor,
      });

      if (!validation.success) {
        toast.error("Validation Failed", {
          description: validation.error?.message || "Invalid doctor information.",
        });
        return;
      }

      // Check if doctor with same ID already exists
      if (doctorForm.doctor_id) {
        const { data: existingDoctor } = await supabase
          .from("doctors")
          .select("id")
          .eq("doctor_id", doctorForm.doctor_id)
          .single();

        if (existingDoctor) {
          toast.error("Doctor ID Exists", {
            description: "A doctor with this license ID already exists.",
          });
          return;
        }
      }

      // Create doctor
      const { error } = await supabase.from("doctors").insert({
        clinic_id: validation.data.clinicId,
        name: validation.data.name,
        specialization: validation.data.specialization,
        doctor_id: doctorForm.doctor_id || null,
        degree: doctorForm.degree || null,
        email: doctorForm.email || null,
        phone: doctorForm.phone || null,
      });

      if (error) throw error;

      toast.success("Doctor Created", {
        description: "The doctor has been added successfully.",
      });
      setDoctorForm({
        name: "",
        doctor_id: "",
        specialization: "",
        degree: "",
        email: "",
        phone: "",
      });
      setShowDoctorForm(false);
      setSelectedClinicForDoctor("");
      loadData();
    } catch (error) {
      const errorResponse = handleError(error, { action: "createDoctor", resource: "doctors" });
      toast.error("Creation Failed", {
        description: errorResponse.error?.message || "Failed to create doctor.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
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
              <h1 className="text-2xl font-bold text-black">Hospital Settings</h1>
            </div>
            <Link href="/hospital/dashboard">
              <Button variant="outline" className="border-2 border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="space-y-6">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-black">Hospital Information</CardTitle>
              <CardDescription className="text-gray-600">Update your hospital details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-black font-semibold">Hospital Name</Label>
                  <Input value={hospital?.name || ""} disabled className="border-2 border-gray-300 text-black" />
                </div>
                <div>
                  <Label className="text-black font-semibold">Email</Label>
                  <Input value={hospital?.email || ""} disabled className="border-2 border-gray-300 text-black" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-bold text-black">Clinics</CardTitle>
                  <CardDescription className="text-gray-600">Manage your clinics and departments</CardDescription>
                </div>
                <Button 
                  onClick={() => setShowClinicForm(!showClinicForm)}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Clinic
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showClinicForm && (
                <form onSubmit={handleCreateClinic} className="mb-6 p-6 border-2 border-gray-200 rounded-lg space-y-4 bg-gray-50">
                  <div>
                    <Label className="text-black font-semibold">Clinic Name</Label>
                    <Input
                      value={clinicForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClinicForm({ ...clinicForm, name: e.target.value })
                      }
                      required
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Department</Label>
                    <Input
                      value={clinicForm.department}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClinicForm({ ...clinicForm, department: e.target.value })
                      }
                      required
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Specialties (comma-separated)</Label>
                    <Input
                      value={clinicForm.specialties}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClinicForm({ ...clinicForm, specialties: e.target.value })
                      }
                      placeholder="Cardiology, Heart Disease, Hypertension"
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-green-600 text-white hover:bg-green-700">Create Clinic</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowClinicForm(false)}
                      className="border-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {clinics.map((clinic: any) => (
                  <div
                    key={clinic.id}
                    className="p-4 border-2 border-gray-200 rounded-lg flex justify-between items-center bg-white hover:shadow-md transition-shadow"
                  >
                    <div>
                      <p className="font-bold text-black">{clinic.name}</p>
                      <p className="text-sm text-gray-600">{clinic.department}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedClinicForDoctor(clinic.id);
                          setShowDoctorForm(true);
                        }}
                        className="border-2 border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Add Doctor
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedClinic(clinic.id);
                          setShowSlotForm(true);
                        }}
                        className="border-2 border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Add Time Slot
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add Doctor Form */}
          {showDoctorForm && (
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-black">Add Doctor</CardTitle>
                <CardDescription className="text-gray-600">Add a new doctor to your clinic</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateDoctor} className="space-y-4">
                  <div>
                    <Label className="text-black font-semibold">Select Clinic</Label>
                    <select
                      value={selectedClinicForDoctor}
                      onChange={(e) => setSelectedClinicForDoctor(e.target.value)}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-green-600 focus:outline-none text-black"
                    >
                      <option value="">Select a clinic</option>
                      {clinics.map((clinic: any) => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name} - {clinic.department}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Doctor Name</Label>
                    <Input
                      value={doctorForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDoctorForm({ ...doctorForm, name: e.target.value })
                      }
                      required
                      placeholder="Dr. John Doe"
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-semibold">License ID / Doctor ID</Label>
                    <Input
                      value={doctorForm.doctor_id}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDoctorForm({ ...doctorForm, doctor_id: e.target.value })
                      }
                      placeholder="MD12345"
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Specialization / Occupation</Label>
                    <Input
                      value={doctorForm.specialization}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDoctorForm({ ...doctorForm, specialization: e.target.value })
                      }
                      required
                      placeholder="Cardiologist"
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Degree</Label>
                    <Input
                      value={doctorForm.degree}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDoctorForm({ ...doctorForm, degree: e.target.value })
                      }
                      placeholder="MD, MBBS, etc."
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Email</Label>
                    <Input
                      type="email"
                      value={doctorForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDoctorForm({ ...doctorForm, email: e.target.value })
                      }
                      placeholder="doctor@example.com"
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Phone</Label>
                    <Input
                      type="tel"
                      value={doctorForm.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDoctorForm({ ...doctorForm, phone: e.target.value })
                      }
                      placeholder="+1-555-0100"
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-green-600 text-white hover:bg-green-700">Add Doctor</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDoctorForm(false);
                        setSelectedClinicForDoctor("");
                        setDoctorForm({
                          name: "",
                          doctor_id: "",
                          specialization: "",
                          degree: "",
                          email: "",
                          phone: "",
                        });
                      }}
                      className="border-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {showSlotForm && (
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-black">Create Time Slot</CardTitle>
                <CardDescription className="text-gray-600">Add available appointment slots</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSlot} className="space-y-4">
                  <div>
                    <Label className="text-black font-semibold">Date</Label>
                    <Input
                      type="date"
                      value={slotForm.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSlotForm({ ...slotForm, date: e.target.value })
                      }
                      required
                      min={new Date().toISOString().split("T")[0]}
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-black font-semibold">Start Time</Label>
                      <Input
                        type="time"
                        value={slotForm.start_time}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSlotForm({ ...slotForm, start_time: e.target.value })
                        }
                        required
                        className="border-2 border-gray-300 focus:border-green-600 text-black"
                      />
                    </div>
                    <div>
                      <Label className="text-black font-semibold">End Time</Label>
                      <Input
                        type="time"
                        value={slotForm.end_time}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSlotForm({ ...slotForm, end_time: e.target.value })
                        }
                        required
                        className="border-2 border-gray-300 focus:border-green-600 text-black"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Doctor Name</Label>
                    <Input
                      value={slotForm.doctor_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSlotForm({ ...slotForm, doctor_name: e.target.value })
                      }
                      required
                      placeholder="Select existing doctor or enter name"
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-semibold">Specialization</Label>
                    <Input
                      value={slotForm.specialization}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSlotForm({ ...slotForm, specialization: e.target.value })
                      }
                      required
                      className="border-2 border-gray-300 focus:border-green-600 text-black"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-green-600 text-white hover:bg-green-700">Create Slot</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowSlotForm(false);
                        setSelectedClinic("");
                      }}
                      className="border-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
