"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Bell } from "lucide-react";

export default function HospitalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const [userName, setUserName] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/auth/login");
                    return;
                }

                const { data: profile } = await supabase
                    .from("user_profiles")
                    .select("full_name, role")
                    .eq("user_id", user.id)
                    .single();

                if (profile?.role !== "hospital") {
                    router.push("/patient/dashboard");
                    return;
                }

                setUserName(profile.full_name || "Doctor");
            } catch (error) {
                console.error("Error checking user:", error);
            } finally {
                setLoading(false);
            }
        };

        checkUser();
    }, [router, supabase]);

    const navItems = [
        { icon: "dashboard", label: "Overview", href: "/hospital/dashboard" },
        { icon: "calendar_month", label: "Schedule", href: "#" },
        { icon: "group", label: "Patients", href: "#" },
        { icon: "chat", label: "Messages", badge: 3, href: "#" },
        { icon: "payments", label: "Finances", href: "/hospital/analytics" },
        { icon: "settings", label: "Settings", href: "/hospital/settings" },
    ];

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/login");
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-background-light">Loading...</div>;
    }

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark font-display text-[#0c1b1d] dark:text-white">
            {/* Sidebar Navigation */}
            <aside className="w-20 lg:w-64 bg-white dark:bg-gray-800 border-r border-[#e6f3f4] dark:border-gray-700 flex flex-col justify-between py-8 z-20 transition-all">
                <div>
                    <div className="px-6 mb-12 flex items-center gap-3">
                        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-2xl">health_metrics</span>
                        </div>
                        <span className="hidden lg:block text-xl font-extrabold tracking-tight">medcAIr</span>
                    </div>
                    <nav className="space-y-2 px-3">
                        {navItems.map((item, idx) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={idx}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive
                                            ? 'bg-primary text-white shadow-lg shadow-primary/25 font-bold'
                                            : 'text-gray-500 hover:bg-[#e6f3f4] dark:hover:bg-gray-700 hover:text-primary'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}>{item.icon}</span>
                                    <span className="hidden lg:block font-medium">{item.label}</span>
                                    {item.badge && (
                                        <span className="hidden lg:flex ml-auto size-5 bg-red-500 text-white text-xs font-bold items-center justify-center rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="px-6">
                    <div className="hidden lg:flex items-center gap-3 p-3 bg-[#e6f3f4] dark:bg-gray-700/50 rounded-xl">
                        <div className="size-10 rounded-full bg-cover bg-center border-2 border-white" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBSNpjkgHyB7Br7jetQgTz1iMCfB4oMZnt2EJ112Izcaq1yVkHs8pVnjuJas_kanGUfehMF0WYqzBSZ-fsFz_XyVZi_7qAJUDTGxAP_u3F4SAQnn2RdEZRFZbBIPAu6OgTAche-HiWpmw_DuTBwehwwtNq8pEEwB4UWYI9pZNBxT0nROliuzgJXWwNc8e5J6YsNOy931tDvVBOj0l4i2SWvD_iMNQQci7TViNAu8dz7I0E6GMGTeFhs4vYfrPw4iN7Wh55YBznqvg')" }}></div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{userName || "Doctor"}</p>
                            <p className="text-xs text-primary font-medium truncate">Cardiologist</p>
                        </div>
                        <button onClick={handleSignOut} className="ml-auto text-gray-400 hover:text-red-500">
                            <span className="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col">
                <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-5 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {navItems.find(item => item.href === pathname)?.label || "Dashboard"}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Have a nice day, Dr. {userName.split(' ')[0] || "Smith"}!</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 border border-[#e6f3f4] dark:border-gray-700 w-64 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <Search className="size-4 text-gray-400 mr-2" />
                            <input type="text" placeholder="Search..." className="bg-transparent border-none text-sm w-full focus:ring-0 placeholder:text-gray-400" />
                        </div>
                        <button className="relative p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-[#e6f3f4] dark:border-gray-700 text-gray-500 hover:text-primary transition-colors shadow-sm">
                            <Bell className="size-5" />
                            <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                <div className="flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}
