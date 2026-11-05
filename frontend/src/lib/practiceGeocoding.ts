import { hasValidCoordinates, type PracticeCoordinates } from './practiceMaps';

export interface PracticeAddressMatch extends PracticeCoordinates {
  label: string;
}

interface PhotonFeature {
  geometry?: { coordinates?: unknown };
  properties?: {
    countrycode?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

const PHOTON_API_URL = import.meta.env.VITE_PRACTICE_GEOCODER_URL || 'https://photon.komoot.io/api/';
const searchCache = new Map<string, PracticeAddressMatch[]>();
let queuedSearches = Promise.resolve();
let nextRequestAt = 0;

const getAddressLabel = (properties: PhotonFeature['properties']): string => {
  if (!properties) return '';

  const streetAddress = [properties.housenumber, properties.street].filter(Boolean).join(' ');
  const parts = [
    streetAddress || properties.name,
    properties.suburb || properties.district,
    properties.city || properties.county,
    properties.state,
    properties.postcode,
    properties.country,
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.filter((part, index) =>
    parts.findIndex(candidate => candidate.toLowerCase() === part.toLowerCase()) === index,
  ).join(', ');
};

const waitForSearchWindow = async (): Promise<void> => {
  const searchTurn = queuedSearches.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + 1000;
  });
  queuedSearches = searchTurn.catch(() => undefined);
  await searchTurn;
};

export const findPracticeAddress = async (address: string): Promise<PracticeAddressMatch[]> => {
  const normalizedAddress = address.trim().replace(/\s+/g, ' ');
  if (!normalizedAddress) return [];

  const cacheKey = normalizedAddress.toLocaleLowerCase();
  const cachedMatches = searchCache.get(cacheKey);
  if (cachedMatches) return cachedMatches;

  await waitForSearchWindow();

  const url = new URL(PHOTON_API_URL);
  url.searchParams.set('q', `${normalizedAddress}, South Africa`);
  url.searchParams.set('countrycode', 'ZA');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('limit', '5');

  const response = await fetch(url, { headers: { Accept: 'application/geo+json, application/json' } });
  if (!response.ok) throw new Error('Address lookup is unavailable right now. Please try again.');

  const data = await response.json() as { features?: PhotonFeature[] };
  const matches = (data.features || []).flatMap(feature => {
    const coordinates = feature.geometry?.coordinates;
    const longitude = Array.isArray(coordinates) ? Number(coordinates[0]) : Number.NaN;
    const latitude = Array.isArray(coordinates) ? Number(coordinates[1]) : Number.NaN;
    const countryCode = feature.properties?.countrycode?.toLowerCase();

    if (countryCode !== 'za' || !hasValidCoordinates(latitude, longitude)) return [];

    return [{
      latitude,
      longitude,
      label: getAddressLabel(feature.properties) || normalizedAddress,
    }];
  });

  searchCache.set(cacheKey, matches);
  return matches;
};
