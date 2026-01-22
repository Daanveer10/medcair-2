"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --- Logic Preserved ---
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const dynamic = 'force-dynamic';

interface Doctor {
  id: string;
  name: string;
  department: string; // Map specialization to department for search compatibility if needed, or just use specialization
  specialties: string[]; // Doctors have 'specialization' (string), but search uses array. We can split it.
  specialization: string;
  consultation_fee: number;
  hospital: {
    name: string;
    address: string;
    city: string;
    distance?: number;
  };
}

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [favoriteDoctorIds, setFavoriteDoctorIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
    checkUser();
    loadDoctors();
    // loadFavorites(); // TODO: Update favoriting for doctors if needed. Disabling for MVP refactor to avoid errors.
  }, []);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("user_profiles").select("id").eq("user_id", user.id).single();
      if (!profile) return;
      const { data } = await supabase.from("favorite_clinics").select("clinic_id").eq("patient_id", profile.id);
      if (data) setFavoriteClinicIds(new Set(data.map(f => f.clinic_id)));
    } catch (error) {
      console.error("Error loading favorites", error);
    }
  };

  const toggleFavorite = async (clinicId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("user_profiles").select("id").eq("user_id", user.id).single();
      if (!profile) return;
      const isFavorite = favoriteClinicIds.has(clinicId);
      if (isFavorite) {
        await supabase.from("favorite_clinics").delete().eq("patient_id", profile.id).eq("clinic_id", clinicId);
        setFavoriteClinicIds(prev => { const next = new Set(prev); next.delete(clinicId); return next; });
      } else {
        await supabase.from("favorite_clinics").insert({ patient_id: profile.id, clinic_id: clinicId });
        setFavoriteClinicIds(prev => new Set(prev).add(clinicId));
      }
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data: profile } = await supabase.from("user_profiles").select("full_name, role").eq("user_id", user.id).single();
    if (profile?.role !== "patient") { router.push("/hospital/dashboard"); return; }
    setUserName(profile.full_name || "Patient");
  };

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase.from("doctors").select(`
          id, name, specialization, consultation_fee,
          hospital:hospitals (id, name, address, city, latitude, longitude)
        `);
      if (error) throw error;

      let userLat: number | null = null;
      let userLng: number | null = null;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
        } catch { }
      }

      const transformedDoctors: Doctor[] = (data || []).map((doc: any) => {
        const hospitalData = Array.isArray(doc.hospital) ? doc.hospital[0] : doc.hospital;
        let distance: number | null = null;
        if (userLat && userLng && hospitalData?.latitude && hospitalData?.longitude) {
          distance = calculateDistance(userLat, userLng, parseFloat(hospitalData.latitude), parseFloat(hospitalData.longitude));
        }
        return {
          id: doc.id,
          name: doc.name,
          department: doc.specialization, // Mapping specialization to department field for compatibility
          specialization: doc.specialization,
          specialties: [doc.specialization], // Wrap in array
          consultation_fee: doc.consultation_fee || 50,
          hospital: {
            name: hospitalData?.name || "Unknown",
            address: hospitalData?.address || "Unknown",
            city: hospitalData?.city || "Unknown",
            distance: distance ? parseFloat(distance.toFixed(1)) : undefined,
          },
        };
      }).sort((a, b) => (a.hospital.distance || 9999) - (b.hospital.distance || 9999));

      setDoctors(transformedDoctors);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  // Filtering Logic
  const filteredDoctors = doctors.filter((doc) => {
    // const matchesFavorites = !showFavoritesOnly || favoriteDoctorIds.has(doc.id);
    const searchLower = searchTerm.toLowerCase();
    const searchStr = `${doc.name} ${doc.specialization} ${doc.hospital.name}`.toLowerCase();
    const matchesSearch = !searchTerm || searchStr.includes(searchLower);
    return matchesSearch; // && matchesFavorites;
  });

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#0c1b1d] dark:text-white font-display min-h-screen">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-[#e6f3f4] dark:border-gray-700 px-6 lg:px-20 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-8 flex-1">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined">health_metrics</span>
              </div>
              <h2 className="text-xl font-bold leading-tight tracking-tight">medcAIr</h2>
            </Link>
            <label className="hidden md:flex flex-1 max-w-md">
              <div className="flex w-full items-stretch rounded-xl h-10 bg-[#e6f3f4] dark:bg-gray-800">
                <div className="text-primary flex items-center justify-center pl-4">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="w-full border-none bg-transparent focus:ring-0 placeholder:text-[#4596a1] px-4 text-sm font-normal"
                  placeholder="Search doctors, clinics, or symptoms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </label>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-8">
              <Link href="/patient/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Find Doctors</Link>
              <a href="#" className="text-sm font-medium hover:text-primary transition-colors">Medical Records</a>
              <Link href="/patient/appointments" className="text-sm font-medium hover:text-primary transition-colors">My Appointments</Link>
            </nav>
            <div className="flex items-center gap-3 border-l border-[#e6f3f4] dark:border-gray-700 pl-6">
              <button className="flex min-w-[84px] items-center justify-center rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold transition-transform hover:scale-105 active:scale-95">
                {userName.split(' ')[0]}
              </button>
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAzIXKDjh_NGcb5eucQvniIBxAtVKkRPtV-5VbGGxPFdUGuYo12GpgCtFOUxu8BPPiBu0fbLpvGwm82UsTUKpPyho-w--pUs9r3ATeEZpwaGXCqNXHZZuwxXIlM_o5Pc7og54M5tQE0UwTiHCTixUKpoWwaQGLDahcpzgpKbcDAmibkrX4vt7uOBKeVNOanNfGUrInW2zKRJndBC4dB8DYm04YYOGYW9BVdB2Ce2cdcoD5gWzOd3fN3EJ_a0yxSNFe6iExMTk3hFA")' }}></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 lg:px-20 py-6">
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap gap-2 mb-6 items-center text-sm">
          <Link href="/" className="text-primary font-medium hover:underline">Home</Link>
          <span className="text-primary/40 material-symbols-outlined !text-sm">chevron_right</span>
          <span className="font-semibold">Search Results</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar: Filters */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-[#e6f3f4] dark:border-gray-700 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Filters</h3>
                  <button onClick={() => setShowFavoritesOnly(false)} className="text-xs text-primary font-bold hover:underline">Clear all</button>
                </div>
                <div className="space-y-6">
                  {/* Availability */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-primary">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      <span className="text-sm font-bold uppercase tracking-wider">Availability</span>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="h-5 w-5 rounded border-[#cde6ea] text-primary focus:ring-primary/20" />
                        <span className="text-sm group-hover:text-primary transition-colors">Available Today</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked className="h-5 w-5 rounded border-[#cde6ea] text-primary focus:ring-primary/20" />
                        <span className="text-sm group-hover:text-primary transition-colors">This Week</span>
                      </label>
                    </div>
                  </div>
                  {/* Favorites Toggle */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-primary">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm font-bold uppercase tracking-wider">Favorites</span>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={showFavoritesOnly}
                        onChange={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className="h-5 w-5 rounded border-[#cde6ea] text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm group-hover:text-primary transition-colors">Show Favorites Only</span>
                    </label>
                  </div>
                </div>
              </div>
              <button className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Center Content: Search Results */}
          <div className="flex-1 space-y-6">
            <div className="flex items-baseline justify-between">
              <h1 className="text-2xl font-bold">{filteredDoctors.length} Doctors Found</h1>
              <div className="flex items-center gap-2 text-sm text-[#4596a1]">
                <span>Sort by:</span>
                <select className="bg-transparent border-none focus:ring-0 font-bold text-[#0c1b1d] dark:text-white cursor-pointer py-0">
                  <option>Highest Rated</option>
                  <option>Experience</option>
                  <option>Distance</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading doctors...</div>
            ) : filteredDoctors.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No doctors found matching your search.</div>
            ) : (
              filteredDoctors.map((doc) => (
                <div key={doc.id} className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-transparent hover:border-primary/30 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="relative">
                      <div className="size-24 md:size-32 rounded-xl overflow-hidden bg-gray-100 items-center justify-center flex text-gray-300">
                        <span className="material-symbols-outlined text-4xl">stethoscope</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-green-500 border-4 border-white dark:border-gray-800 size-6 rounded-full" title="Available Today"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="text-xl font-bold">{doc.name}</h3>
                          <p className="text-primary font-semibold">{doc.specialization}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-[#e6f3f4] dark:bg-primary/10 px-3 py-1 rounded-full">
                          <span className="material-symbols-outlined text-primary !text-sm">star</span>
                          <span className="text-sm font-bold text-primary">4.9</span>
                          <span className="text-xs text-[#4596a1]">(Verified)</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined !text-sm">location_on</span>
                          <span>{doc.hospital.name}, {doc.hospital.city}</span>
                        </div>
                        {doc.hospital.distance && (
                          <div className="flex items-center gap-1 text-green-600">
                            <span className="material-symbols-outlined !text-sm">near_me</span>
                            <span>{doc.hospital.distance} km</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined !text-sm">medical_services</span>
                          <span>{doc.specialties.join(", ")}</span>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                        <div className="text-lg font-bold">
                          ${doc.consultation_fee} <span className="text-sm font-normal text-gray-400">/ consultation</span>
                        </div>
                        <div className="flex gap-3">
                          {/* 
                          <button
                            onClick={() => toggleFavorite(doc.id)}
                            className={`px-4 py-2 border-2 ${favoriteDoctorIds.has(doc.id) ? 'border-red-500 text-red-500' : 'border-primary text-primary'} font-bold rounded-xl hover:bg-primary/5 transition-all`}
                          >
                            {favoriteDoctorIds.has(doc.id) ? <Heart className="fill-current h-5 w-5" /> : 'Favorite'}
                          </button>
                           */}
                          <button
                            onClick={() => setSelectedDoctorId(doc.id)}
                            className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
                          >
                            Select
                          </button>
                          <Link href={`/patient/doctor/${doc.id}`}>
                            <button className="px-6 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all">
                              Book Now
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Sidebar: Quick Booking Calendar */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-xl border border-[#e6f3f4] dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#e6f3f4] dark:border-gray-700">
                <h3 className="text-lg font-bold mb-1">Quick Book</h3>
                <p className="text-xs text-[#4596a1]">
                  {selectedDoctorId
                    ? `Selected: ${doctors.find(d => d.id === selectedDoctorId)?.name}`
                    : "Select a doctor to view slots"}
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold">October 2023</span>
                  <div className="flex gap-2">
                    <button className="p-1 hover:bg-[#e6f3f4] rounded-lg transition-colors">
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button className="p-1 hover:bg-[#e6f3f4] rounded-lg transition-colors">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
                {/* Mini Calendar mockup matches design */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-6">
                  <span className="text-[#4596a1] font-bold">M</span>
                  <span className="text-[#4596a1] font-bold">T</span>
                  <span className="text-[#4596a1] font-bold">W</span>
                  <span className="text-[#4596a1] font-bold">T</span>
                  <span className="text-[#4596a1] font-bold">F</span>
                  <span className="text-[#4596a1] font-bold">S</span>
                  <span className="text-[#4596a1] font-bold">S</span>
                  <span className="p-2 text-gray-300">28</span>
                  <span className="p-2 text-gray-300">29</span>
                  <span className="p-2 text-gray-300">30</span>
                  <span className="p-2 hover:bg-[#e6f3f4] rounded-lg cursor-pointer">1</span>
                  <span className="p-2 hover:bg-[#e6f3f4] rounded-lg cursor-pointer">2</span>
                  <span className="p-2 hover:bg-[#e6f3f4] rounded-lg cursor-pointer">3</span>
                  <span className="p-2 hover:bg-[#e6f3f4] rounded-lg cursor-pointer">4</span>
                  <span className="p-2 hover:bg-[#e6f3f4] rounded-lg cursor-pointer">5</span>
                  <span className="p-2 hover:bg-[#e6f3f4] rounded-lg cursor-pointer">6</span>
                  <span className="p-2 bg-primary text-white font-bold rounded-lg cursor-pointer">7</span>
                </div>
                {selectedDoctorId && (
                  <div className="mt-8 space-y-3">
                    <Link href={`/patient/doctor/${selectedDoctorId}`}>
                      <button className="w-full py-4 bg-primary text-white rounded-xl font-bold transition-transform hover:scale-[1.02] shadow-lg shadow-primary/25">
                        View Full Schedule
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* AI Chatbot Bubble */}
      <button className="fixed bottom-8 right-8 size-16 bg-white dark:bg-gray-800 rounded-full shadow-2xl flex items-center justify-center border-2 border-primary group transition-all hover:scale-110 active:scale-95 z-[60]">
        <div className="absolute inset-0 rounded-full bg-primary/5 group-hover:bg-primary/10 animate-pulse"></div>
        <span className="material-symbols-outlined text-primary !text-3xl relative z-10">smart_toy</span>
      </button>
    </div>
  );
}
