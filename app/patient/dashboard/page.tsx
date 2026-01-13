"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Calendar, MapPin, Clock, Stethoscope, LogOut, Heart, TrendingUp, Bell, Filter, Star, ChevronRight } from "lucide-react";
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
  color: string;
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

  const quickStats: QuickStat[] = [
    {
      label: "Upcoming",
      value: upcomingAppointments.toString(),
      icon: <Calendar className="h-5 w-5" />,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Clinics",
      value: clinics.length.toString(),
      icon: <Stethoscope className="h-5 w-5" />,
      color: "text-purple-600 bg-purple-100",
    },
    {
      label: "Available",
      value: filteredClinics.length.toString(),
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-green-600 bg-green-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Enhanced Navbar */}
      <nav className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Stethoscope className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MedCair AI
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/patient/appointments">
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  My Appointments
                  {upcomingAppointments > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {upcomingAppointments}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="hidden sm:block text-sm text-gray-600">Welcome, <span className="font-semibold">{userName}</span></div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
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
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, {userName}!</h2>
          <p className="text-gray-600">Find and book your next healthcare appointment</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {quickStats.map((stat, idx) => (
            <Card key={idx} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Search Section */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Find a Clinic</CardTitle>
                <CardDescription>Search by name, specialty, disease, or location</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search clinics, departments, or specialties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showFilters ? "block" : "hidden sm:grid"}`}>
                <div className="space-y-2">
                  <Label htmlFor="disease" className="text-sm font-medium">Disease/Condition</Label>
                  <Input
                    id="disease"
                    placeholder="e.g., Cardiology, Diabetes, Hypertension..."
                    value={diseaseFilter}
                    onChange={(e) => setDiseaseFilter(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">City</Label>
                  <Input
                    id="city"
                    placeholder="Enter city name..."
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Loading clinics...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Found <span className="font-semibold text-gray-900">{filteredClinics.length}</span> {filteredClinics.length === 1 ? "clinic" : "clinics"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClinics.map((clinic) => (
                <Card key={clinic.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md cursor-pointer overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1 group-hover:text-blue-600 transition-colors">
                          {clinic.name}
                        </CardTitle>
                        <CardDescription className="text-sm">{clinic.department}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Heart className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{clinic.hospital.name}</p>
                          <p className="text-xs text-gray-500">{clinic.hospital.address}, {clinic.hospital.city}</p>
                          {clinic.hospital.distance && (
                            <p className="text-xs text-blue-600 mt-1">📍 {clinic.hospital.distance} km away</p>
                          )}
                        </div>
                      </div>
                      
                      {clinic.specialties.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Specialties:</p>
                          <div className="flex flex-wrap gap-2">
                            {clinic.specialties.slice(0, 4).map((specialty, idx) => (
                              <span key={idx} className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                                {specialty}
                              </span>
                            ))}
                            {clinic.specialties.length > 4 && (
                              <span className="text-xs text-gray-500">+{clinic.specialties.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <Link href={`/patient/clinic/${clinic.id}`}>
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 group-hover:shadow-lg transition-all">
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
          <Card className="text-center py-12">
            <CardContent>
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No clinics found</p>
              <p className="text-gray-500 mb-4">Try adjusting your search filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setDiseaseFilter("");
                  setCityFilter("");
                }}
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
