"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Calendar, MapPin, Clock, Stethoscope, LogOut } from "lucide-react";
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

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    checkUser();
    loadClinics();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">MedCair AI</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/patient/appointments">
                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  My Appointments
                </Button>
              </Link>
              <span className="text-sm text-gray-600">Welcome, {userName}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Find a Clinic</h2>
          <p className="text-gray-600">Search for clinics by disease, availability, or location</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
            <CardDescription>Filter clinics based on your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Clinic or department name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disease">Disease/Condition</Label>
                <Input
                  id="disease"
                  placeholder="e.g., Cardiology, Diabetes..."
                  value={diseaseFilter}
                  onChange={(e) => setDiseaseFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter city name..."
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading clinics...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClinics.map((clinic) => (
              <Card key={clinic.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-xl">{clinic.name}</CardTitle>
                  <CardDescription>{clinic.department}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{clinic.hospital.name}</p>
                        <p className="text-xs text-gray-500">{clinic.hospital.address}, {clinic.hospital.city}</p>
                      </div>
                    </div>
                    
                    {clinic.specialties.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Specialties:</p>
                        <div className="flex flex-wrap gap-1">
                          {clinic.specialties.slice(0, 3).map((specialty, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Link href={`/patient/clinic/${clinic.id}`}>
                      <Button className="w-full mt-4">
                        <Calendar className="h-4 w-4 mr-2" />
                        View Slots & Book
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredClinics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No clinics found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}
