export interface Hospital {
  name: string;
  address: string;
  distance: string;
  phone?: string;
  lat: number;
  lng: number;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          reject(new Error('Location permission denied. Please enable location access.'));
          break;
        case error.POSITION_UNAVAILABLE:
          reject(new Error('Location information is unavailable.'));
          break;
        case error.TIMEOUT:
          reject(new Error('Location request timed out.'));
          break;
        default:
          reject(new Error('An unknown error occurred.'));
      }
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function findNearbyHospitals(): Promise<Hospital[]> {
  const position = await getCurrentPosition();
  const { latitude, longitude } = position.coords;

  // Use Overpass API (OpenStreetMap) to find nearby hospitals
  const radius = 10000; // 10km radius
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${latitude},${longitude});
      way["amenity"="hospital"](around:${radius},${latitude},${longitude});
      node["amenity"="clinic"](around:${radius},${latitude},${longitude});
      way["amenity"="clinic"](around:${radius},${latitude},${longitude});
    );
    out body center;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch nearby hospitals');
  }

  const data = await response.json();
  
  const hospitals: Hospital[] = data.elements
    .filter((el: any) => el.tags?.name)
    .map((el: any) => {
      const lat = el.lat || el.center?.lat;
      const lng = el.lon || el.center?.lon;
      const distance = calculateDistance(latitude, longitude, lat, lng);
      
      return {
        name: el.tags.name,
        address: [
          el.tags['addr:street'],
          el.tags['addr:city'],
          el.tags['addr:postcode']
        ].filter(Boolean).join(', ') || 'Address not available',
        distance: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
        phone: el.tags.phone || el.tags['contact:phone'],
        lat,
        lng,
        _distanceNum: distance
      };
    })
    .sort((a: any, b: any) => a._distanceNum - b._distanceNum)
    .slice(0, 10)
    .map(({ _distanceNum, ...hospital }: any) => hospital);

  return hospitals;
}
