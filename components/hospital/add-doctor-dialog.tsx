"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function AddDoctorDialog({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        specialization: "",
        // phone: "", // Included in schema but maybe optional
        experience_years: "",
        consultation_fee: "",
        about: "",
    });

    const supabase = createClient();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Get current hospital (user)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: hospital } = await supabase
                .from('hospitals')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!hospital) {
                // Fallback: Check if user is a hospital role? 
                // Assuming the current user IS the hospital admin and has an entry in `hospitals`
                throw new Error("Hospital profile not found");
            }

            // 2. Insert Doctor
            const { error } = await supabase.from('doctors').insert({
                hospital_id: hospital.id,
                name: formData.name,
                email: formData.email,
                specialization: formData.specialization,
                experience_years: parseInt(formData.experience_years) || 0,
                consultation_fee: parseFloat(formData.consultation_fee) || 0,
                about: formData.about,
                availability_status: 'available',
            });

            if (error) throw error;

            toast.success("Doctor added successfully");
            setFormData({
                name: "",
                email: "",
                specialization: "",
                experience_years: "",
                consultation_fee: "",
                about: "",
            });
            setOpen(false);
            onSuccess?.();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to add doctor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="bg-white/10 hover:bg-white/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors">
                    <UserPlus className="size-6" />
                    <span className="text-xs font-bold">Add Doctor</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Doctor</DialogTitle>
                    <DialogDescription>
                        Create a profile for a doctor in your hospital.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Dr. John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="doctor@hospital.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="specialization">Specialization</Label>
                            <Input
                                id="specialization"
                                name="specialization"
                                placeholder="Cardiology"
                                value={formData.specialization}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="experience_years">Exp (Years)</Label>
                            <Input
                                id="experience_years"
                                name="experience_years"
                                type="number"
                                placeholder="5"
                                value={formData.experience_years}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="consultation_fee">Consultation Fee ($)</Label>
                        <Input
                            id="consultation_fee"
                            name="consultation_fee"
                            type="number"
                            placeholder="100.00"
                            value={formData.consultation_fee}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="about">About (Optional)</Label>
                        <Input
                            id="about"
                            name="about"
                            placeholder="Brief bio..."
                            value={formData.about}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Doctor
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
