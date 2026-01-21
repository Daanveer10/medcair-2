/**
 * Geocoding utility to convert addresses to coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
}

export interface ReverseGeocodeResult {
  display_name: string;
  lat?: number;
  lon?: number;
  address: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    residential?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string; // e.g. "Township of X"
    county?: string;
    district?: string; // e.g. "District X"
    state?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Geocode an address to get latitude and longitude
 * Uses OpenStreetMap Nominatim API
 */
export async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<GeocodeResult | null> {
  try {
    // Construct full address
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

    // Use Nominatim API (free, no API key required)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedCair-App/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      display_name: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const result = await reverseGeocodeStructured(latitude, longitude);
  return result?.display_name || null;
}

/**
 * Reverse geocode coordinates to get structured address data
 */
export async function reverseGeocodeStructured(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  try {
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
      console.error('Invalid coordinates for reverse geocoding:', { latitude, longitude });
      return null;
    }

    const latStr = Number(latitude).toFixed(8);
    const lonStr = Number(longitude).toFixed(8);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latStr}&lon=${lonStr}&addressdetails=1`;

    console.log('Fetching reverse geocode:', url); // Debug log

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedCair-App/1.0',
      },
    });

    if (!response.ok) {
      // Try to read error body
      const errorText = await response.text();
      console.error('Reverse geocoding request failed:', response.status, errorText);
      throw new Error(`Reverse geocoding request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.error) {
      console.error('Reverse geocoding API error:', data.error);
      return null;
    }

    return {
      display_name: data.display_name,
      address: data.address || {},
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Search for an address
 */
export async function searchAddress(query: string): Promise<ReverseGeocodeResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedCair-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error('Search request failed');
    }

    const data = await response.json();
    return data.map((item: any) => ({
      display_name: item.display_name,
      address: item.address || {},
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}
