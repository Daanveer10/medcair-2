"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Calendar, MapPin, Clock, Stethoscope, LogOut, Heart, TrendingUp, Bell, Filter, Star, ChevronRight, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { NotificationCenter } from "@/components/notification-center";
import { ClinicCardSkeleton } from "@/components/skeleton-loader";
import { toast } from "sonner";

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Prevent static generation - requires authentication
export const dynamic = 'force-dynamic';

interface Clinic {
  id: string;
  name: string;
  department: string;
  specialties: string[];
  hospital: {
    name: string;
    address: string;
    city: string;
    distance?: number;
  };
}

interface QuickStat {
  label: string;
  value: string;
  icon: React.ReactNode;
  bgGradient: string;
  textColor: string;
}

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteClinicIds, setFavoriteClinicIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    checkUser();
    loadClinics();
    loadUpcomingAppointments();
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from("favorite_clinics")
        .select("clinic_id")
        .eq("patient_id", profile.id);

      if (data) {
        setFavoriteClinicIds(new Set(data.map(f => f.clinic_id)));
      }
    } catch (error) {
      const { handleError } = await import("@/lib/utils");
      handleError(error, { action: "loadFavorites", resource: "favorite_clinics" });
    }
  };

  const toggleFavorite = async (clinicId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const isFavorite = favoriteClinicIds.has(clinicId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorite_clinics")
          .delete()
          .eq("patient_id", profile.id)
          .eq("clinic_id", clinicId);

        if (error) throw error;
        setFavoriteClinicIds(prev => {
          const next = new Set(prev);
          next.delete(clinicId);
          return next;
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("favorite_clinics")
          .insert({
            patient_id: profile.id,
            clinic_id: clinicId
          });

        if (error) throw error;
        setFavoriteClinicIds(prev => new Set(prev).add(clinicId));
      }
    } catch (error) {
      const { handleError } = await import("@/lib/utils");
      const errorResponse = handleError(error, { action: "toggleFavorite", resource: "favorite_clinics" });
      toast.error("Failed to Update", {
        description: errorResponse.error?.message || "Failed to update favorites. Please try again.",
      });
    }
  };

  const checkUser = async () => {
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
    
    if (profile?.role !== "patient") {
      router.push("/hospital/dashboard");
      return;
    }
    
    setUserName(profile.full_name || "Patient");
  };

  const loadUpcomingAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from("appointments")
        .select("id, appointment_date")
        .eq("patient_id", profile.id)
        .eq("status", "scheduled")
        .gte("appointment_date", new Date().toISOString().split("T")[0]);

      setUpcomingAppointments(data?.length || 0);
    } catch (error) {
      const { handleError } = await import("@/lib/utils");
      handleError(error, { action: "loadUpcomingAppointments", resource: "appointments" });
    }
  };

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select(`
          id,
          name,
          department,
          specialties,
          hospital:hospitals (
            id,
            name,
            address,
            city,
            latitude,
            longitude
          )
        `);
      
      if (error) throw error;

      // Calculate distance if user allows geolocation
      let userLat: number | null = null;
      let userLng: number | null = null;
      
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
        } catch (error) {
          console.log("Geolocation not available or denied");
        }
      }
      
      // Transform data - handle hospital relation (Supabase returns as array)
      // Only include clinics with valid hospital location data
      const transformedClinics: Clinic[] = (data || [])
        .filter((clinic: any) => {
          // Filter out clinics without valid location data first
          const hospitalData = Array.isArray(clinic.hospital) 
            ? clinic.hospital[0] 
            : clinic.hospital;
          return hospitalData?.latitude && hospitalData?.longitude;
        })
        .map((clinic: any) => {
          const hospitalData = Array.isArray(clinic.hospital) 
            ? clinic.hospital[0] 
            : clinic.hospital;
          
          let distance: number | null = null;
          if (userLat && userLng && hospitalData.latitude && hospitalData.longitude) {
            distance = calculateDistance(
              userLat,
              userLng,
              parseFloat(hospitalData.latitude),
              parseFloat(hospitalData.longitude)
            );
          }
          
          return {
            id: clinic.id,
            name: clinic.name,
            department: clinic.department,
            specialties: clinic.specialties || [],
            hospital: {
              name: hospitalData?.name || "Unknown",
              address: hospitalData?.address || "Unknown",
              city: hospitalData?.city || "Unknown",
              distance: distance ? parseFloat(distance.toFixed(1)) : undefined,
            },
          };
        })
        .sort((a, b) => {
          // Sort by distance if available, otherwise by name
          if (a.hospital.distance !== undefined && b.hospital.distance !== undefined) {
            return a.hospital.distance - b.hospital.distance;
          }
          if (a.hospital.distance !== undefined) return -1;
          if (b.hospital.distance !== undefined) return 1;
          return a.name.localeCompare(b.name);
        });
      
      setClinics(transformedClinics);
    } catch (error) {
      const { handleError } = await import("@/lib/utils");
      handleError(error, { action: "loadClinics", resource: "clinics" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const filteredClinics = clinics.filter((clinic) => {
    const matchesFavorites = !showFavoritesOnly || favoriteClinicIds.has(clinic.id);
    const matchesSearch = !searchTerm || 
      clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDisease = !diseaseFilter ||
      clinic.specialties.some(s => s.toLowerCase().includes(diseaseFilter.toLowerCase()));
    
    const matchesCity = !cityFilter ||
      clinic.hospital.city.toLowerCase().includes(cityFilter.toLowerCase());

    const matchesDistance = !distanceFilter || 
      !clinic.hospital.distance || 
      clinic.hospital.distance <= distanceFilter;
    
    return matchesFavorites && matchesSearch && matchesDisease && matchesCity && matchesDistance;
  });

  // Get recommended clinics (top 6 closest or with most specialties)
  const recommendedClinics = clinics
    .slice(0, 6); // Already sorted by distance

  const quickStats: QuickStat[] = [
    {
      label: "Upcoming",
      value: upcomingAppointments.toString(),
      icon: <Calendar className="h-6 w-6" />,
      bgGradient: "bg-green-600",
      textColor: "text-white",
    },
    {
      label: "Available Clinics",
      value: clinics.length.toString(),
      icon: <Stethoscope className="h-6 w-6" />,
      bgGradient: "bg-green-600",
      textColor: "text-white",
    },
    {
      label: "Search Results",
      value: filteredClinics.length.toString(),
      icon: <TrendingUp className="h-6 w-6" />,
      bgGradient: "bg-green-600",
      textColor: "text-white",
    },
  ];

  const departmentColors: Record<string, string> = {
    'Cardiology': 'from-red-500 to-pink-500',
    'Neurology': 'from-blue-500 to-cyan-500',
    'Orthopedics': 'from-green-500 to-emerald-500',
    'Pediatrics': 'from-yellow-500 to-orange-500',
    'Dermatology': 'from-purple-500 to-violet-500',
    'Oncology': 'from-indigo-500 to-blue-500',
    'Endocrinology': 'from-teal-500 to-cyan-500',
    'Gastroenterology': 'from-amber-500 to-yellow-500',
    'Pulmonology': 'from-sky-500 to-blue-500',
    'Rheumatology': 'from-rose-500 to-pink-500',
  };

  const getDepartmentColor = (department: string) => {
    return departmentColors[department] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-600 rounded-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-black">
                medcAIr
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <Link href="/patient/appointments">
                <Button variant="outline" size="sm" className="flex items-center gap-2 border-2 border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium">
                  <Calendar className="h-4 w-4 text-gray-900" />
                  <span className="font-medium text-gray-900">My Appointments</span>
                  {upcomingAppointments > 0 && (
                    <span className="ml-1 px-2.5 py-0.5 bg-green-600 text-white rounded-full text-xs font-bold">
                      {upcomingAppointments}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="hidden sm:block text-sm font-medium text-gray-700">
                Welcome, <span className="text-black font-bold">{userName}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-gray-300 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-green-600" />
            <h2 className="text-4xl md:text-5xl font-bold text-black">
              Welcome back, {userName}!
            </h2>
          </div>
          <p className="text-lg text-gray-600">Discover and book your next healthcare appointment</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {quickStats.map((stat, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-lg ${stat.bgGradient} p-6 shadow-md transform hover:scale-105 transition-all duration-300`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 bg-white/20 rounded-lg ${stat.textColor}`}>
                    {stat.icon}
                  </div>
                </div>
                <p className={`text-sm font-semibold ${stat.textColor} opacity-90 mb-1`}>{stat.label}</p>
                <p className={`text-4xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recommended Clinics Section */}
        {recommendedClinics.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-6 w-6 text-green-600" />
              <h3 className="text-2xl font-bold text-black">Recommended for You</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {recommendedClinics.map((clinic, idx) => (
                <Card
                  key={clinic.id}
                  className="group relative overflow-hidden border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1 text-black font-bold group-hover:scale-105 transition-transform">
                          {clinic.name}
                        </CardTitle>
                        <CardDescription className="text-gray-600 text-sm font-medium">
                          {clinic.department}
                        </CardDescription>
                      </div>
                      <div className="px-3 py-1 bg-gray-100 rounded-full">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-black">{clinic.hospital.name}</p>
                          <p className="text-xs text-gray-600">{clinic.hospital.city}</p>
                        </div>
                      </div>
                      
                      {clinic.specialties.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-2">Specialties:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {clinic.specialties.slice(0, 2).map((specialty, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Link href={`/patient/clinic/${clinic.id}`}>
                        <Button className="w-full bg-green-600 text-white hover:bg-green-700 font-bold shadow-sm hover:shadow-md transition-all">
                          Book Now
                          <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Search Section */}
        <Card className="mb-6 border border-gray-200 shadow-sm bg-white">
          <CardHeader className="bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-black">Find a Clinic</CardTitle>
                <CardDescription className="text-gray-600">Search by name, specialty, disease, or location</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden border border-gray-300"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search clinics, departments, or specialties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 text-lg border-2 border-gray-300 focus:border-green-600 focus:ring-green-600 text-black placeholder:text-gray-400"
                />
              </div>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showFilters ? "block" : "hidden sm:grid"}`}>
                <div className="space-y-2">
                  <Label htmlFor="disease" className="text-sm font-bold text-gray-700">Disease/Condition</Label>
                  <Input
                    id="disease"
                    placeholder="e.g., Cardiology, Diabetes, Hypertension..."
                    value={diseaseFilter}
                    onChange={(e) => setDiseaseFilter(e.target.value)}
                    className="h-11 border-2 border-gray-300 focus:border-green-600 text-black placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-bold text-gray-700">City</Label>
                  <Input
                    id="city"
                    placeholder="Enter city name..."
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="h-11 border-2 border-gray-300 focus:border-green-600 text-black placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distance" className="text-sm font-bold text-gray-700">Max Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    placeholder="e.g., 10"
                    value={distanceFilter || ""}
                    onChange={(e) => setDistanceFilter(e.target.value ? parseFloat(e.target.value) : null)}
                    className="h-11 border-2 border-gray-300 focus:border-green-600 text-black placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-4 font-medium">Loading clinics...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-700 font-semibold text-lg">
                Found <span className="text-green-600 font-bold text-2xl">{filteredClinics.length}</span> {filteredClinics.length === 1 ? "clinic" : "clinics"}
              </p>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={showFavoritesOnly ? "bg-green-600 text-white" : ""}
              >
                <Heart className={`h-4 w-4 mr-2 ${showFavoritesOnly ? "fill-white" : ""}`} />
                Favorites Only
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClinics.map((clinic, idx) => (
                <Card
                  key={clinic.id}
                  className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 shadow-sm bg-white transform hover:-translate-y-1"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1 group-hover:text-green-600 transition-colors font-bold text-black">
                          {clinic.name}
                        </CardTitle>
                        <CardDescription className="text-sm font-medium text-gray-600">{clinic.department}</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(clinic.id);
                        }}
                        className="h-8 w-8 p-0 hover:bg-red-50"
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            favoriteClinicIds.has(clinic.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-400 hover:text-red-500"
                          }`}
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{clinic.hospital.name}</p>
                          <p className="text-xs text-gray-600">{clinic.hospital.address}, {clinic.hospital.city}</p>
                          {clinic.hospital.distance && (
                            <p className="text-xs text-green-600 font-semibold mt-1">📍 {clinic.hospital.distance} km away</p>
                          )}
                        </div>
                      </div>
                      
                      {clinic.specialties.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-2">Specialties:</p>
                          <div className="flex flex-wrap gap-2">
                            {clinic.specialties.slice(0, 4).map((specialty, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-semibold"
                              >
                                {specialty}
                              </span>
                            ))}
                            {clinic.specialties.length > 4 && (
                              <span className="text-xs text-gray-500 font-medium">+{clinic.specialties.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <Link href={`/patient/clinic/${clinic.id}`}>
                        <Button className="w-full bg-green-600 text-white hover:bg-green-700 font-bold shadow-sm hover:shadow-md transition-all group-hover:scale-105">
                          View Available Slots
                          <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!loading && filteredClinics.length === 0 && (
          <Card className="text-center py-12 border border-gray-200 shadow-sm bg-white">
            <CardContent>
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-black mb-2">No clinics found</p>
              <p className="text-gray-600 mb-4">Try adjusting your search filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setDiseaseFilter("");
                  setCityFilter("");
                }}
                className="border-gray-300 hover:bg-gray-50"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
