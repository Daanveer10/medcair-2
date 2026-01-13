"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Calendar, Clock } from "lucide-react";
import Link from "next/link";

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
  const [selectedClinic, setSelectedClinic] = useState("");

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
      const specialties = clinicForm.specialties
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      const { error } = await supabase.from("clinics").insert({
        hospital_id: hospital.id,
        name: clinicForm.name,
        department: clinicForm.department,
        specialties,
      });

      if (error) throw error;

      alert("Clinic created successfully!");
      setClinicForm({ name: "", department: "", specialties: "" });
      setShowClinicForm(false);
      loadData();
    } catch (error) {
      console.error("Error creating clinic:", error);
      alert("Failed to create clinic.");
    }
  };

  const handleCreateSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClinic) return;

    try {
      // First, get or create doctor
      const { data: existingDoctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("clinic_id", selectedClinic)
        .eq("name", slotForm.doctor_name)
        .single();

      let doctorId;
      if (existingDoctor) {
        doctorId = existingDoctor.id;
      } else {
        const { data: newDoctor } = await supabase
          .from("doctors")
          .insert({
            clinic_id: selectedClinic,
            name: slotForm.doctor_name,
            specialization: slotForm.specialization,
          })
          .select()
          .single();

        if (!newDoctor) throw new Error("Failed to create doctor");
        doctorId = newDoctor.id;
      }

      // Create slot
      const { error } = await supabase.from("appointment_slots").insert({
        clinic_id: selectedClinic,
        doctor_id: doctorId,
        date: slotForm.date,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        is_available: true,
      });

      if (error) throw error;

      alert("Time slot created successfully!");
      setSlotForm({
        date: "",
        start_time: "",
        end_time: "",
        doctor_name: "",
        specialization: "",
      });
      setShowSlotForm(false);
    } catch (error) {
      console.error("Error creating slot:", error);
      alert("Failed to create time slot.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/hospital/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <h2 className="text-3xl font-bold mb-8">Hospital Settings</h2>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Information</CardTitle>
              <CardDescription>Update your hospital details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Hospital Name</Label>
                  <Input value={hospital?.name || ""} disabled />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={hospital?.email || ""} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Clinics</CardTitle>
                  <CardDescription>Manage your clinics and departments</CardDescription>
                </div>
                <Button onClick={() => setShowClinicForm(!showClinicForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Clinic
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showClinicForm && (
                <form onSubmit={handleCreateClinic} className="mb-6 p-4 border rounded-lg space-y-4">
                  <div>
                    <Label>Clinic Name</Label>
                    <Input
                      value={clinicForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClinicForm({ ...clinicForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={clinicForm.department}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClinicForm({ ...clinicForm, department: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Specialties (comma-separated)</Label>
                    <Input
                      value={clinicForm.specialties}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClinicForm({ ...clinicForm, specialties: e.target.value })
                      }
                      placeholder="Cardiology, Heart Disease, Hypertension"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Create Clinic</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowClinicForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {clinics.map((clinic: any) => (
                  <div
                    key={clinic.id}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{clinic.name}</p>
                      <p className="text-sm text-gray-600">{clinic.department}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedClinic(clinic.id);
                        setShowSlotForm(true);
                      }}
                    >
                      Add Time Slot
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {showSlotForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create Time Slot</CardTitle>
                <CardDescription>Add available appointment slots</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSlot} className="space-y-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={slotForm.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSlotForm({ ...slotForm, date: e.target.value })
                      }
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={slotForm.start_time}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSlotForm({ ...slotForm, start_time: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={slotForm.end_time}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSlotForm({ ...slotForm, end_time: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Doctor Name</Label>
                    <Input
                      value={slotForm.doctor_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSlotForm({ ...slotForm, doctor_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Specialization</Label>
                    <Input
                      value={slotForm.specialization}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSlotForm({ ...slotForm, specialization: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Create Slot</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowSlotForm(false);
                        setSelectedClinic("");
                      }}
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
