/**
 * Geocoding utility to convert addresses to coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
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
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedCair-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }

    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
