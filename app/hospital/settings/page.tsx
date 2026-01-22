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
  const [showClinicForm, setShowClinicForm] = useState(false); // Deprecated
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [selectedClinicForDoctor, setSelectedClinicForDoctor] = useState("");

  const [clinicForm, setClinicForm] = useState({
    name: "",
    department: "",
    specialties: "",
    photo_url: "",
    consultation_fee: "",
    services: "",
    insurance_providers: "",
    payment_methods: "",
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
    photo_url: "",
    credentials: "",
    years_of_experience: "",
    languages_spoken: "",
  });

  const [hospitalForm, setHospitalForm] = useState({
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    description: "",
  });
  const [updatingHospital, setUpdatingHospital] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

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
      setHospitalForm({
        address: hospitalData.address || "",
        city: hospitalData.city || "",
        state: hospitalData.state || "",
        zip_code: hospitalData.zip_code || "",
        phone: hospitalData.phone || "",
        description: hospitalData.description || "",
      });
      // Set initial location from DB if available
      if (hospitalData.latitude && hospitalData.longitude) {
        setCurrentLocation({ lat: hospitalData.latitude, lng: hospitalData.longitude });
      }

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

  // Debug state
  const [locationDetails, setLocationDetails] = useState<{ lat: number, lng: number, accuracy: number } | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const { searchAddress } = await import("@/lib/geocoding");
      const results = await searchAddress(searchQuery);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search Failed", { description: "Could not search for address." });
    } finally {
      setSearching(false);
    }
  };

  /* Helper to normalize address */
  const normalizeAddress = (address: any, displayName: string) => {
    let street = "";
    if (address.road) {
      street = `${address.house_number ? address.house_number + ' ' : ''}${address.road}`;
    } else if (address.pedestrian) {
      street = address.pedestrian;
    } else if (address.residential) {
      street = address.residential;
    } else if (address.hamlet) {
      street = address.hamlet;
    } else if (address.suburb) {
      street = address.suburb;
    } else if (address.neighbourhood) {
      street = address.neighbourhood;
    } else {
      street = displayName.split(",")[0];
    }

    const city = address.city || address.town || address.village || address.municipality || address.locality || address.county || "";
    const state = address.state || address.region || "";
    const zip = address.postcode || "";
    return { street, city, state, zip };
  };

  const handleSelectAddress = (result: any) => {
    const { address, lat, lon, display_name } = result;

    // Set map location (and debug info if needed)
    setCurrentLocation({ lat, lng: lon });
    setLocationDetails({ lat, lng: lon, accuracy: 0 }); // 0 accuracy serves as "manual/exact" flag

    const { street, city, state, zip } = normalizeAddress(address, display_name);

    setHospitalForm(prev => ({
      ...prev,
      address: street,
      city: city,
      state: state,
      zip_code: zip,
    }));

    setShowResults(false);
    setSearchQuery(""); // Optional: clear or keep query

    toast.success("Location Selected", {
      description: "Address fields updated from search result.",
    });
  };

  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    setLocationDetails(null); // Reset previous details

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords; // Accuracy is in meters
        console.log("Geolocation got coords:", { latitude, longitude, accuracy });

        // Set debug details
        setLocationDetails({ lat: latitude, lng: longitude, accuracy });

        if (accuracy > 1000) {
          toast.warning("Low GPS Accuracy", {
            description: `Location is approximate (accurate to ${Math.round(accuracy)} meters). Please verify the address.`,
          });
        }

        setCurrentLocation({ lat: latitude, lng: longitude });

        try {
          const { reverseGeocodeStructured } = await import("@/lib/geocoding");
          const result = await reverseGeocodeStructured(latitude, longitude);

          if (result && result.address) {
            console.log("Structured Address:", result.address);

            const { street, city, state, zip } = normalizeAddress(result.address, result.display_name);

            setHospitalForm(prev => ({
              ...prev,
              address: street || prev.address,
              city: city || prev.city,
              state: state || prev.state,
              zip_code: zip || prev.zip_code,
            }));

            toast.success("Location found!", {
              description: accuracy < 100 ? "Precise location found." : "Location found (approximate).",
            });
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          toast.error("Could not fetch address details", {
            description: "Coordinates saved, but address autofill failed.",
          });
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Location access denied", {
          description: "Please enable location access to use this feature.",
        });
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleUpdateHospital = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hospital) return;

    setUpdatingHospital(true);
    try {
      let lat = currentLocation?.lat;
      let lng = currentLocation?.lng;

      // Only geocode if we don't have precise current location or if user changed address
      // But for simplicity, if we have currentLocation (from GPS), we utilize it primarily
      // If we don't have GPS location set in this session or DB, we try to geocode the address string

      if (!lat || !lng) {
        // Geocode the address
        const { geocodeAddress } = await import("@/lib/geocoding");
        const geocodeResult = await geocodeAddress(
          hospitalForm.address,
          hospitalForm.city,
          hospitalForm.state,
          hospitalForm.zip_code
        );

        if (geocodeResult) {
          lat = geocodeResult.latitude;
          lng = geocodeResult.longitude;
        } else {
          // If geocoding fails, we can either block or just save without location
          // Let's warn but save
          toast.warning("Location not found for this address", {
            description: "Saving without map coordinates.",
          });
        }
      }

      // Update hospital with address and coordinates
      const { error } = await supabase
        .from("hospitals")
        .update({
          address: hospitalForm.address,
          city: hospitalForm.city,
          state: hospitalForm.state,
          zip_code: hospitalForm.zip_code,
          phone: hospitalForm.phone,
          description: hospitalForm.description || null,
          latitude: lat || null,
          longitude: lng || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", hospital.id);

      if (error) throw error;

      toast.success("Hospital Updated", {
        description: "Your hospital information and location have been updated successfully.",
      });

      // Reload hospital data
      loadData();
    } catch (error) {
      const errorResponse = handleError(error, { action: "updateHospital", resource: "hospitals" });
      toast.error("Update Failed", {
        description: errorResponse.error?.message || "Failed to update hospital information.",
      });
    } finally {
      setUpdatingHospital(false);
    }
  };

  // handleCreateClinic removed


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
        photo_url: "",
        credentials: "",
        years_of_experience: "",
        languages_spoken: "",
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
    <div className="p-8 space-y-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e6f3f4] dark:border-gray-700 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-[#e6f3f4] dark:border-gray-700 pb-4">
            <CardTitle className="text-xl font-bold text-[#0c1b1d] dark:text-white">Hospital Information</CardTitle>
            <CardDescription className="text-gray-500">Update your hospital details and location</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateHospital} className="space-y-4">
              <div>
                <Label className="text-black font-semibold">Hospital Name</Label>
                <Input value={hospital?.name || ""} disabled className="border-2 border-gray-300 text-black" />
              </div>
              <div>
                <Label className="text-black font-semibold">Email</Label>
                <Input value={hospital?.email || ""} disabled className="border-2 border-gray-300 text-black" />
              </div>
              {/* Location Search Section */}
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Label className="text-black font-semibold mb-2 block">Search Location (Manual Selection)</Label>
                <div className="flex gap-2 relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. City Hospital, Main Street, Mumbai"
                    className="border-2 border-gray-300 focus:border-green-600 text-black flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress())}
                  />
                  <Button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={searching}
                    className="bg-gray-800 text-white hover:bg-gray-700"
                  >
                    {searching ? "Searching..." : "Search"}
                  </Button>

                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-12 left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-md z-10 max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <span className="text-xs font-medium text-gray-500">Select the closest match:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400"
                          onClick={() => setShowResults(false)}
                        >
                          ×
                        </Button>
                      </div>
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left p-3 hover:bg-green-50 border-b border-gray-50 last:border-0 transition-colors"
                          onClick={() => handleSelectAddress(result)}
                        >
                          <p className="font-medium text-sm text-gray-900 truncate">{result.display_name.split(",")[0]}</p>
                          <p className="text-xs text-gray-500 truncate">{result.display_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Search for your hospital or a nearby landmark if GPS is inaccurate.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-black font-semibold">Address *</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    disabled={gettingLocation}
                    className="text-green-600 p-0 h-auto font-semibold"
                  >
                    {gettingLocation ? "Locating..." : "📍 Use Current Location"}
                  </Button>
                </div>

                {/* Debug Info for Location Issues */}
                {locationDetails && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    <p><strong>Debug Info:</strong></p>
                    <p>Lat: {locationDetails.lat.toFixed(6)}, Lng: {locationDetails.lng.toFixed(6)}</p>
                    <p>Accuracy: ±{Math.round(locationDetails.accuracy)} meters</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${locationDetails.lat},${locationDetails.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 mt-1 inline-block"
                    >
                      View detected location on Google Maps
                    </a>
                  </div>
                )}

                <Input
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                  required
                  placeholder="123 Medical Center Drive"
                  className="border-2 border-gray-300 focus:border-green-600 text-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-black font-semibold">City *</Label>
                  <Input
                    value={hospitalForm.city}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, city: e.target.value })}
                    required
                    placeholder="New York"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label className="text-black font-semibold">State *</Label>
                  <Input
                    value={hospitalForm.state}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, state: e.target.value })}
                    required
                    placeholder="NY"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
              </div>
              <div>
                <Label className="text-black font-semibold">Zip Code *</Label>
                <Input
                  value={hospitalForm.zip_code}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, zip_code: e.target.value })}
                  required
                  placeholder="10001"
                  className="border-2 border-gray-300 focus:border-green-600 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-semibold">Phone *</Label>
                <Input
                  value={hospitalForm.phone}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                  required
                  placeholder="+1-555-0100"
                  className="border-2 border-gray-300 focus:border-green-600 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-semibold">Description (Optional)</Label>
                <textarea
                  value={hospitalForm.description}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, description: e.target.value })}
                  placeholder="Brief description of your hospital..."
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-green-600 focus:outline-none text-black"
                />
              </div>
              {hospital?.latitude && hospital?.longitude && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Location verified:</strong> {hospital.latitude.toFixed(6)}, {hospital.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Your hospital will appear in nearby clinic searches for patients.
                  </p>
                </div>
              )}
              {(!hospital?.latitude || !hospital?.longitude) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Location not set:</strong> Please update your address and click "Update & Geocode" to enable nearby clinic search.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updatingHospital}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {updatingHospital ? "Updating..." : "Update & Geocode Location"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold text-black">Clinics</CardTitle>
                <CardDescription className="text-gray-600">Manage your clinics and departments</CardDescription>
              </div>

            </div>
          </CardHeader>
          <CardContent>


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
                <div>
                  <Label className="text-black font-semibold">Photo URL (Optional)</Label>
                  <Input
                    type="url"
                    value={doctorForm.photo_url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, photo_url: e.target.value })
                    }
                    placeholder="https://example.com/doctor-photo.jpg"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label className="text-black font-semibold">Credentials (comma-separated, Optional)</Label>
                  <Input
                    value={doctorForm.credentials}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, credentials: e.target.value })
                    }
                    placeholder="MBBS, MD, FACP"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label className="text-black font-semibold">Years of Experience (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={doctorForm.years_of_experience}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, years_of_experience: e.target.value })
                    }
                    placeholder="10"
                    className="border-2 border-gray-300 focus:border-green-600 text-black"
                  />
                </div>
                <div>
                  <Label className="text-black font-semibold">Languages Spoken (comma-separated, Optional)</Label>
                  <Input
                    value={doctorForm.languages_spoken}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDoctorForm({ ...doctorForm, languages_spoken: e.target.value })
                    }
                    placeholder="English, Hindi, Spanish"
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
                        photo_url: "",
                        credentials: "",
                        years_of_experience: "",
                        languages_spoken: "",
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

  );
}
