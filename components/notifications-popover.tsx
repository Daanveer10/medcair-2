"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Calendar, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function NotificationsPopover() {
    const supabase = createClient();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get hospital ID
            const { data: hospital } = await supabase
                .from("hospitals")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle();

            if (!hospital) return;

            // Get clinics
            const { data: clinics } = await supabase
                .from("clinics")
                .select("id")
                .eq("hospital_id", hospital.id);

            const clinicIds = clinics?.map(c => c.id) || [];
            if (clinicIds.length === 0) {
                setNotifications([]);
                return;
            }

            // Get pending appointments
            const { data: appointments, error } = await supabase
                .from("appointments")
                .select(`
                    id,
                    appointment_date,
                    appointment_time,
                    status,
                    patient_id,
                    doctor:doctors(name)
                `)
                .in("clinic_id", clinicIds)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (error) throw error;

            setNotifications(appointments || []);

        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchNotifications();
        } else {
            // Initial fetch for badge count
            fetchNotifications();
        }
    }, [open]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const handleAction = async (id: string, action: "accepted" | "cancelled") => {
        try {
            const { error } = await supabase
                .from("appointments")
                .update({ status: action })
                .eq("id", id);

            if (error) throw error;

            toast.success(`Appointment ${action}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Error updating appointment:", error);
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setOpen(!open)}
                className={`relative p-2.5 rounded-xl border transition-colors shadow-sm focus:outline-none ${open
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                        : 'bg-white dark:bg-gray-800 border-[#e6f3f4] dark:border-gray-700 text-gray-500 hover:text-primary'
                    }`}
            >
                <Bell className="size-5" />
                {notifications.length > 0 && (
                    <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h4>
                        <span className="text-xs text-gray-500">{notifications.length} pending</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-xs text-gray-500">Checking...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2 opacity-50" />
                                <p className="text-sm text-gray-500 font-medium">No new notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {notifications.map((apt) => (
                                    <div key={apt.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Appointment Request</p>
                                                <p className="text-xs text-gray-500">with {apt.doctor?.name || "Doctor"}</p>
                                            </div>
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-medium uppercase tracking-wide">
                                                New
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3 bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {apt.appointment_date}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {apt.appointment_time?.substring(0, 5)}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1 h-8 bg-black hover:bg-gray-800 text-white text-xs"
                                                onClick={() => handleAction(apt.id, "accepted")}
                                            >
                                                <Check className="h-3 w-3 mr-1" /> Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-8 text-xs border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                                                onClick={() => handleAction(apt.id, "cancelled")}
                                            >
                                                <X className="h-3 w-3 mr-1" /> Decline
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
