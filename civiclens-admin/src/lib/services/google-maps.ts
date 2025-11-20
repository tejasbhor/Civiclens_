/**
 * Google Maps Integration Service
 * Provides reverse geocoding and location services
 */

interface GoogleMapsConfig {
  apiKey: string;
  language?: string;
  region?: string;
}

interface GeocodeResult {
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface ReverseGeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

class GoogleMapsService {
  private config: GoogleMapsConfig;
  private isLoaded = false;

  constructor(config: GoogleMapsConfig) {
    this.config = config;
  }

  /**
   * Load Google Maps JavaScript API
   */
  async loadGoogleMaps(): Promise<void> {
    if (this.isLoaded || typeof window === 'undefined') {
      return;
    }

    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.google && window.google.maps) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.config.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Get current location using browser geolocation
   */
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  /**
   * Reverse geocode coordinates to get formatted address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Use Google Maps Geocoding API via HTTP request
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.config.apiKey}&language=${this.config.language || 'en'}&region=${this.config.region || 'IN'}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ReverseGeocodeResponse = await response.json();

      if (data.status !== 'OK' || !data.results.length) {
        // Provide more helpful error messages for common issues
        let errorMessage = `Geocoding failed: ${data.status}`;
        
        if (data.status === 'REQUEST_DENIED') {
          errorMessage = 'Google Maps API key is missing or invalid. Using fallback location.';
          console.warn('Google Maps API configuration issue - using fallback:', {
            hasApiKey: !!this.config.apiKey,
            keyLength: this.config.apiKey?.length || 0,
            status: data.status
          });
          
          // Return a fallback address instead of throwing error
          return {
            address: `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            city: 'Unknown City',
            state: 'Unknown State',
            country: 'Unknown Country',
            postalCode: 'Unknown'
          };
        } else if (data.status === 'ZERO_RESULTS') {
          errorMessage = 'No address found for this location.';
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          errorMessage = 'Google Maps API quota exceeded. Please try again later.';
        } else if (data.status === 'INVALID_REQUEST') {
          errorMessage = 'Invalid geocoding request. Please check the coordinates.';
        }
        
        // Log the error for debugging
        console.warn('Reverse geocoding status:', data.status, {
          apiKeySet: !!this.config.apiKey && this.config.apiKey.length > 0,
          apiKeyPrefix: this.config.apiKey?.substring(0, 10) + '...' || 'not set'
        });
        
        throw new Error(errorMessage);
      }

      // Get the most detailed address (usually the first result)
      const result = data.results[0];
      
      // Extract comprehensive address components for detailed Indian addresses
      const addressComponents = result.address_components;
      
      // Get all relevant components
      const premise = addressComponents.find(c => c.types.includes('premise'))?.long_name;
      const streetNumber = addressComponents.find(c => c.types.includes('street_number'))?.long_name;
      const route = addressComponents.find(c => c.types.includes('route'))?.long_name;
      const establishment = addressComponents.find(c => c.types.includes('establishment'))?.long_name;
      const pointOfInterest = addressComponents.find(c => c.types.includes('point_of_interest'))?.long_name;
      const subpremise = addressComponents.find(c => c.types.includes('subpremise'))?.long_name;
      
      // Sublocality levels (neighborhoods, areas)
      const sublocalityLevel1 = addressComponents.find(c => c.types.includes('sublocality_level_1'))?.long_name;
      const sublocalityLevel2 = addressComponents.find(c => c.types.includes('sublocality_level_2'))?.long_name;
      const sublocalityLevel3 = addressComponents.find(c => c.types.includes('sublocality_level_3'))?.long_name;
      const sublocality = addressComponents.find(c => c.types.includes('sublocality'))?.long_name;
      
      // Administrative areas
      const locality = addressComponents.find(c => c.types.includes('locality'))?.long_name;
      const administrativeAreaLevel2 = addressComponents.find(c => c.types.includes('administrative_area_level_2'))?.long_name;
      const administrativeAreaLevel1 = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.long_name;
      const country = addressComponents.find(c => c.types.includes('country'))?.long_name;
      const postalCode = addressComponents.find(c => c.types.includes('postal_code'))?.long_name;

      // Build comprehensive address like your example
      const addressParts: string[] = [];

      // Start with establishment/point of interest if available
      if (establishment && !pointOfInterest) {
        addressParts.push(establishment);
      } else if (pointOfInterest) {
        addressParts.push(pointOfInterest);
      }

      // Add premise/building details
      if (premise && !establishment && !pointOfInterest) {
        addressParts.push(premise);
      }

      // Add street information
      if (streetNumber && route) {
        addressParts.push(`${streetNumber} ${route}`);
      } else if (route) {
        addressParts.push(route);
      }

      // Add subpremise (floor, unit, etc.)
      if (subpremise) {
        addressParts.push(subpremise);
      }

      // Add neighborhood/area information (most specific first)
      if (sublocalityLevel3 && sublocalityLevel3 !== sublocalityLevel2) {
        addressParts.push(sublocalityLevel3);
      }
      if (sublocalityLevel2 && sublocalityLevel2 !== sublocalityLevel1) {
        addressParts.push(sublocalityLevel2);
      }
      if (sublocalityLevel1) {
        addressParts.push(sublocalityLevel1);
      } else if (sublocality) {
        addressParts.push(sublocality);
      }

      // Add city/locality
      if (locality) {
        addressParts.push(locality);
      }

      // Add district/administrative area
      if (administrativeAreaLevel2 && administrativeAreaLevel2 !== locality) {
        addressParts.push(administrativeAreaLevel2);
      }

      // Add state
      if (administrativeAreaLevel1) {
        addressParts.push(administrativeAreaLevel1);
      }

      // Add postal code
      if (postalCode) {
        addressParts.push(postalCode);
      }

      // Add country
      if (country) {
        addressParts.push(country);
      }

      // If we have meaningful components, use them; otherwise use formatted address
      const detailedAddress = addressParts.length > 2 ? addressParts.join(', ') : result.formatted_address;
      
      // Clean up the address for better readability
      return this.cleanAddress(detailedAddress);

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback to coordinate-based description
      return `Near ${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E`;
    }
  }

  /**
   * Clean and format address for better readability
   */
  private cleanAddress(address: string): string {
    return address
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/^,\s*/, '') // Remove leading comma
      .replace(/,\s*$/, '') // Remove trailing comma
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Get location with detailed address
   */
  async getLocationWithAddress(): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  }> {
    const location = await this.getCurrentLocation();
    const address = await this.reverseGeocode(location.latitude, location.longitude);
    
    return {
      ...location,
      address,
    };
  }

  /**
   * Search for places/addresses
   */
  async searchPlaces(query: string): Promise<Array<{
    description: string;
    place_id: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  }>> {
    try {
      await this.loadGoogleMaps();
      
      return new Promise((resolve, reject) => {
        const service = new window.google.maps.places.AutocompleteService();
        
        service.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: this.config.region || 'IN' },
            types: ['address', 'establishment', 'geocode'],
          },
          (predictions: any[] | null, status: string) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions.map((p: any) => ({
                description: p.description,
                place_id: p.place_id,
                structured_formatting: p.structured_formatting,
              })));
            } else {
              resolve([]);
            }
          }
        );
      });
    } catch (error) {
      console.error('Places search error:', error);
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId: string): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  } | null> {
    try {
      await this.loadGoogleMaps();
      
      return new Promise((resolve, reject) => {
        const service = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
        
        service.getDetails(
          {
            placeId,
            fields: ['geometry', 'formatted_address'],
          },
          (place: any | null, status: string) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              const location = place.geometry?.location;
              if (location) {
                resolve({
                  latitude: location.lat(),
                  longitude: location.lng(),
                  address: place.formatted_address || '',
                });
              } else {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Place details error:', error);
      return null;
    }
  }
}

// Create singleton instance
const googleMapsService = new GoogleMapsService({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  language: 'en',
  region: 'IN', // India
});

export default googleMapsService;

// Type declarations for Google Maps
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: {
                input: string;
                componentRestrictions?: { country: string };
                types?: string[];
              },
              callback: (predictions: any[] | null, status: string) => void
            ) => void;
          };
          PlacesService: new (element: HTMLElement) => {
            getDetails: (
              request: {
                placeId: string;
                fields: string[];
              },
              callback: (place: any | null, status: string) => void
            ) => void;
          };
          PlacesServiceStatus: {
            OK: string;
          };
        };
      };
    };
  }
}