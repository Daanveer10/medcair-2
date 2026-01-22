"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { handleError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Prevent static generation - requires authentication
export const dynamic = 'force-dynamic';

export default function HospitalSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      .maybeSingle();

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

  // Track if location was manually set by user (Map Search or GPS) vs just loaded from DB
  const [locationManuallySet, setLocationManuallySet] = useState(false);

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
    setLocationManuallySet(true);

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
        setLocationManuallySet(true);

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

      // Logic:
      // 1. If user manually set location (GPS/Search) -> Use that (locationManuallySet is true)
      // 2. If address changed since load -> Try Geocode
      // 3. If address unchanged -> Keep existing (don't overwrite with null if we have one)

      const addressChanged = hospital && (
        hospital.address !== hospitalForm.address ||
        hospital.city !== hospitalForm.city ||
        hospital.state !== hospitalForm.state ||
        hospital.zip_code !== hospitalForm.zip_code
      );

      const hasExistingLocation = hospital?.latitude !== undefined && hospital?.latitude !== null;

      if (!locationManuallySet) {
        // if user didn't touch the map, only geocode if address changed OR we have no location yet
        // If we just loaded from DB and hit save without changes, we want to KEEP the DB value, not set it to undefined

        if (addressChanged || !hasExistingLocation) {
          console.log("Address changed or no location, attempting geocode...");
          lat = undefined;
          lng = undefined;

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
            // If geocoding fails, warn user
            if (addressChanged) {
              toast.warning("Location not found for this new address", {
                description: "Saving address, but map location could not be updated.",
              });
            }
          }
        } else {
          // Address NOT changed and we have location -> Keep existing
          console.log("Address unchanged and no manual location set. Keeping existing coordinates.");
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
            <CardDescription className="text-gray-500 dark:text-gray-400">Update your hospital details and location</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateHospital} className="space-y-4">
              <div>
                <Label className="text-gray-900 dark:text-gray-200 font-semibold">Hospital Name</Label>
                <Input value={hospital?.name || ""} disabled className="border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <Label className="text-gray-900 dark:text-gray-200 font-semibold">Email</Label>
                <Input value={hospital?.email || ""} disabled className="border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100" />
              </div>
              {/* Location Search Section */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <Label className="text-gray-900 dark:text-gray-200 font-semibold mb-2 block">Search Location (Manual Selection)</Label>
                <div className="flex gap-2 relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. City Hospital, Main Street, Mumbai"
                    className="border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-green-600 dark:focus:border-green-500 text-gray-900 dark:text-gray-100 flex-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress())}
                  />
                  <Button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={searching}
                    className="bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    {searching ? "Searching..." : "Search"}
                  </Button>

                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-md z-10 max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Select the closest match:</span>
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
                          className="w-full text-left p-3 hover:bg-green-50 dark:hover:bg-green-900/20 border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors"
                          onClick={() => handleSelectAddress(result)}
                        >
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{result.display_name.split(",")[0]}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.display_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Search for your hospital or a nearby landmark if GPS is inaccurate.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-gray-900 dark:text-gray-200 font-semibold">Address *</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    disabled={gettingLocation}
                    className="text-green-600 dark:text-green-400 p-0 h-auto font-semibold"
                  >
                    {gettingLocation ? "Locating..." : "📍 Use Current Location"}
                  </Button>
                </div>

                {/* Debug Info for Location Issues */}
                {locationDetails && (
                  <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-200">
                    <p><strong>Debug Info:</strong></p>
                    <p>Lat: {locationDetails.lat.toFixed(6)}, Lng: {locationDetails.lng.toFixed(6)}</p>
                    <p>Accuracy: ±{Math.round(locationDetails.accuracy)} meters</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${locationDetails.lat},${locationDetails.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-300 underline hover:text-blue-800 dark:hover:text-blue-100 mt-1 inline-block"
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
                  className="border-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 focus:border-green-600 dark:focus:border-green-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900 dark:text-gray-200 font-semibold">City *</Label>
                  <Input
                    value={hospitalForm.city}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, city: e.target.value })}
                    required
                    placeholder="New York"
                    className="border-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 focus:border-green-600 dark:focus:border-green-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900 dark:text-gray-200 font-semibold">State *</Label>
                  <Input
                    value={hospitalForm.state}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, state: e.target.value })}
                    required
                    placeholder="NY"
                    className="border-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 focus:border-green-600 dark:focus:border-green-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-900 dark:text-gray-200 font-semibold">Zip Code *</Label>
                <Input
                  value={hospitalForm.zip_code}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, zip_code: e.target.value })}
                  required
                  placeholder="10001"
                  className="border-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 focus:border-green-600 dark:focus:border-green-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-900 dark:text-gray-200 font-semibold">Phone *</Label>
                <Input
                  value={hospitalForm.phone}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                  required
                  placeholder="+1-555-0100"
                  className="border-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 focus:border-green-600 dark:focus:border-green-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-900 dark:text-gray-200 font-semibold">Description (Optional)</Label>
                <textarea
                  value={hospitalForm.description}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, description: e.target.value })}
                  placeholder="Brief description of your hospital..."
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 bg-transparent rounded-md focus:border-green-600 dark:focus:border-green-500 focus:outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              {hospital?.latitude && hospital?.longitude && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    <strong>Location verified:</strong> {hospital.latitude.toFixed(6)}, {hospital.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Your hospital will appear in nearby clinic searches for patients.
                  </p>
                </div>
              )}
              {(!hospital?.latitude || !hospital?.longitude) && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
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
      </div>
    </div>
  );
}
