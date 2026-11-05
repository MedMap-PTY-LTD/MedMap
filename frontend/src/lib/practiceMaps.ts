export interface PracticeCoordinates {
  latitude: number;
  longitude: number;
}

export const hasValidCoordinates = (
  latitude: unknown,
  longitude: unknown,
): boolean => {
  return typeof latitude === 'number' && Number.isFinite(latitude) &&
    latitude >= -90 && latitude <= 90 &&
    typeof longitude === 'number' && Number.isFinite(longitude) &&
    longitude >= -180 && longitude <= 180;
};

export interface PracticeDirectionsUrls {
  googleMaps: string;
  appleMaps: string;
}

export const getDirectionsUrls = ({
  address,
  city,
  province,
  coordinates,
}: {
  address?: string;
  city?: string;
  province?: string;
  coordinates?: PracticeCoordinates | null;
}): PracticeDirectionsUrls | null => {
  const addressParts = [address, city, province].map(part => part?.trim()).filter(Boolean);
  const hasCoordinates = Boolean(coordinates && hasValidCoordinates(coordinates.latitude, coordinates.longitude));
  if (!hasCoordinates && addressParts.length === 0) return null;

  const destination = hasCoordinates && coordinates
    ? `${coordinates.latitude},${coordinates.longitude}`
    : [...addressParts, 'South Africa'].join(', ');

  const googleMapsUrl = new URL('https://www.google.com/maps/dir/');
  googleMapsUrl.searchParams.set('api', '1');
  googleMapsUrl.searchParams.set('destination', destination);
  googleMapsUrl.searchParams.set('travelmode', 'driving');

  const appleMapsUrl = new URL('https://maps.apple.com/');
  appleMapsUrl.searchParams.set('daddr', destination);
  appleMapsUrl.searchParams.set('dirflg', 'd');

  return {
    googleMaps: googleMapsUrl.toString(),
    appleMaps: appleMapsUrl.toString(),
  };
};
