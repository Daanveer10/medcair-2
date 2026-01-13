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
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    checkUser();
    loadClinics();
    loadUpcomingAppointments();
  }, []);

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
      console.error("Error loading appointments:", error);
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
            state
          )
        `);
      
      if (error) throw error;
      
      // Transform data - handle hospital relation (Supabase returns as array)
      const transformedClinics = (data || []).map((clinic: any) => {
        const hospitalData = Array.isArray(clinic.hospital) 
          ? clinic.hospital[0] 
          : clinic.hospital;
        
        return {
          id: clinic.id,
          name: clinic.name,
          department: clinic.department,
          specialties: clinic.specialties || [],
          hospital: {
            name: hospitalData?.name || "Unknown",
            address: hospitalData?.address || "Unknown",
            city: hospitalData?.city || "Unknown",
            distance: hospitalData?.distance,
          },
        };
      });
      
      setClinics(transformedClinics);
    } catch (error) {
      console.error("Error loading clinics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const filteredClinics = clinics.filter((clinic) => {
    const matchesSearch = !searchTerm || 
      clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDisease = !diseaseFilter ||
      clinic.specialties.some(s => s.toLowerCase().includes(diseaseFilter.toLowerCase()));
    
    const matchesCity = !cityFilter ||
      clinic.hospital.city.toLowerCase().includes(cityFilter.toLowerCase());
    
    return matchesSearch && matchesDisease && matchesCity;
  });

  // Get recommended clinics (top 6 with most specialties or random)
  const recommendedClinics = clinics
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);

  const quickStats: QuickStat[] = [
    {
      label: "Upcoming",
      value: upcomingAppointments.toString(),
      icon: <Calendar className="h-6 w-6" />,
      bgGradient: "from-pink-500 via-rose-500 to-red-500",
      textColor: "text-white",
    },
    {
      label: "Available Clinics",
      value: clinics.length.toString(),
      icon: <Stethoscope className="h-6 w-6" />,
      bgGradient: "from-blue-500 via-cyan-500 to-teal-500",
      textColor: "text-white",
    },
    {
      label: "Search Results",
      value: filteredClinics.length.toString(),
      icon: <TrendingUp className="h-6 w-6" />,
      bgGradient: "from-purple-500 via-violet-500 to-fuchsia-500",
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-cyan-50">
      {/* Vibrant Navbar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-pink-200/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-pink-500 to-violet-600 rounded-xl shadow-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
                MedCair AI
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/patient/appointments">
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 hover:bg-pink-100">
                  <Calendar className="h-4 w-4 text-pink-600" />
                  <span className="font-medium">My Appointments</span>
                  {upcomingAppointments > 0 && (
                    <span className="ml-1 px-2.5 py-0.5 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-full text-xs font-bold shadow-md">
                      {upcomingAppointments}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="hidden sm:block text-sm font-medium text-gray-700">
                Welcome, <span className="text-pink-600 font-bold">{userName}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-pink-200 hover:bg-pink-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Gradient */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-pink-500" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
              Welcome back, {userName}!
            </h2>
          </div>
          <p className="text-lg text-gray-700 font-medium">Discover and book your next healthcare appointment</p>
        </div>

        {/* Vibrant Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {quickStats.map((stat, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.bgGradient} p-6 shadow-xl transform hover:scale-105 transition-all duration-300`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 bg-white/20 rounded-xl backdrop-blur-sm ${stat.textColor}`}>
                    {stat.icon}
                  </div>
                </div>
                <p className={`text-sm font-semibold ${stat.textColor} opacity-90 mb-1`}>{stat.label}</p>
                <p className={`text-4xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            </div>
          ))}
        </div>

        {/* Recommended Clinics Section */}
        {recommendedClinics.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-6 w-6 text-yellow-500" />
              <h3 className="text-2xl font-bold text-gray-900">Recommended for You</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {recommendedClinics.map((clinic, idx) => (
                <Card
                  key={clinic.id}
                  className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br ${getDepartmentColor(clinic.department)}`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-10 -mt-10"></div>
                  <CardHeader className="relative z-10 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1 text-white font-bold group-hover:scale-105 transition-transform">
                          {clinic.name}
                        </CardTitle>
                        <CardDescription className="text-white/90 text-sm font-medium">
                          {clinic.department}
                        </CardDescription>
                      </div>
                      <div className="px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full">
                        <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-white/90 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{clinic.hospital.name}</p>
                          <p className="text-xs text-white/80">{clinic.hospital.city}</p>
                        </div>
                      </div>
                      
                      {clinic.specialties.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-white/90 mb-2">Specialties:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {clinic.specialties.slice(0, 2).map((specialty, idx) => (
                              <span key={idx} className="text-xs bg-white/30 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-medium">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Link href={`/patient/clinic/${clinic.id}`}>
                        <Button className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold shadow-lg hover:shadow-xl transition-all">
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
        <Card className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-cyan-500/10 border-b border-pink-200/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Find a Clinic</CardTitle>
                <CardDescription className="text-gray-600 font-medium">Search by name, specialty, disease, or location</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden border border-pink-200"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-pink-500" />
                <Input
                  placeholder="Search clinics, departments, or specialties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 text-lg border-2 border-pink-200 focus:border-pink-500 focus:ring-pink-500 text-black placeholder:text-gray-400"
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
                    className="h-11 border-2 border-violet-200 focus:border-violet-500 text-black placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-bold text-gray-700">City</Label>
                  <Input
                    id="city"
                    placeholder="Enter city name..."
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="h-11 border-2 border-cyan-200 focus:border-cyan-500 text-black placeholder:text-gray-400"
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
                Found <span className="text-pink-600 font-bold text-2xl">{filteredClinics.length}</span> {filteredClinics.length === 1 ? "clinic" : "clinics"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClinics.map((clinic, idx) => (
                <Card
                  key={clinic.id}
                  className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white transform hover:-translate-y-2"
                >
                  <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${getDepartmentColor(clinic.department)}`}></div>
                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1 group-hover:text-pink-600 transition-colors font-bold">
                          {clinic.name}
                        </CardTitle>
                        <CardDescription className="text-sm font-medium">{clinic.department}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-pink-100">
                        <Heart className="h-4 w-4 text-gray-400 hover:text-pink-500 transition-colors" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{clinic.hospital.name}</p>
                          <p className="text-xs text-gray-600">{clinic.hospital.address}, {clinic.hospital.city}</p>
                          {clinic.hospital.distance && (
                            <p className="text-xs text-pink-600 font-semibold mt-1">📍 {clinic.hospital.distance} km away</p>
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
                                className={`text-xs bg-gradient-to-r ${getDepartmentColor(clinic.department)} text-white px-3 py-1.5 rounded-full font-semibold shadow-md`}
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
                        <Button className={`w-full bg-gradient-to-r ${getDepartmentColor(clinic.department)} text-white hover:opacity-90 font-bold shadow-lg hover:shadow-xl transition-all group-hover:scale-105`}>
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
          <Card className="text-center py-12 border-0 shadow-xl bg-gradient-to-br from-pink-50 to-violet-50">
            <CardContent>
              <Search className="h-16 w-16 text-pink-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-900 mb-2">No clinics found</p>
              <p className="text-gray-600 mb-4">Try adjusting your search filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setDiseaseFilter("");
                  setCityFilter("");
                }}
                className="border-pink-300 hover:bg-pink-50"
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
