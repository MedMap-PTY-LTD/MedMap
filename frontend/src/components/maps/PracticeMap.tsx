import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  LngLatBounds,
  setWorkerUrl,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './practiceMap.css';
import { hasValidCoordinates, type PracticeCoordinates } from '@/lib/practiceMaps';

setWorkerUrl(workerUrl);

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const SOUTH_AFRICA_CENTER: [number, number] = [25.0, -29.0];

export interface PracticeMapLocation extends PracticeCoordinates {
  id: string;
  name: string;
  subtitle?: string;
}

interface PracticeMapProps {
  locations?: PracticeMapLocation[];
  selectedLocationId?: string | null;
  onSelectLocation?: (id: string) => void;
  pickLocation?: PracticeCoordinates | null;
  onPickLocation?: (coordinates: PracticeCoordinates) => void;
  className?: string;
  initialZoom?: number;
}

const PracticeMap = ({
  locations = [],
  selectedLocationId,
  onSelectLocation,
  pickLocation,
  onPickLocation,
  className = 'h-[480px]',
  initialZoom = 4.5,
}: PracticeMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Array<{ id: string; marker: Marker }>>([]);
  const pickMarkerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPickLocation);
  const onSelectRef = useRef(onSelectLocation);
  const [mapLoaded, setMapLoaded] = useState(false);

  const validLocations = useMemo(
    () => locations.filter(location => hasValidCoordinates(location.latitude, location.longitude)),
    [locations],
  );

  useEffect(() => {
    onPickRef.current = onPickLocation;
  }, [onPickLocation]);

  useEffect(() => {
    onSelectRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const hasPickPoint = pickLocation && hasValidCoordinates(pickLocation.latitude, pickLocation.longitude);
    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: hasPickPoint
        ? [pickLocation.longitude, pickLocation.latitude]
        : SOUTH_AFRICA_CENTER,
      zoom: hasPickPoint ? 14 : initialZoom,
      cooperativeGestures: true,
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => setMapLoaded(true));
    map.on('click', event => {
      onPickRef.current?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    });
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      pickMarkerRef.current?.remove();
      pickMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
    // Map setup is intentionally one-time; map events read the latest callbacks through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    validLocations.forEach(location => {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = `practice-map-marker${location.id === selectedLocationId ? ' is-selected' : ''}`;
      markerElement.setAttribute('aria-label', `Show ${location.name} on the map`);
      markerElement.title = location.name;
      markerElement.addEventListener('click', () => onSelectRef.current?.(location.id));

      const marker = new Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map);
      markersRef.current.push({ id: location.id, marker });
    });

    if (validLocations.length === 1) {
      const [location] = validLocations;
      map.flyTo({ center: [location.longitude, location.latitude], zoom: 14, duration: 500 });
    } else if (validLocations.length > 1) {
      const bounds = new LngLatBounds();
      validLocations.forEach(location => bounds.extend([location.longitude, location.latitude]));
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 500 });
    }
  }, [validLocations, mapLoaded]);

  useEffect(() => {
    markersRef.current.forEach(({ id, marker }) => {
      marker.getElement().classList.toggle('is-selected', id === selectedLocationId);
    });
  }, [selectedLocationId, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !onPickLocation) return;

    pickMarkerRef.current?.remove();
    pickMarkerRef.current = null;

    if (pickLocation && hasValidCoordinates(pickLocation.latitude, pickLocation.longitude)) {
      const marker = new Marker({ color: '#0f766e', draggable: true, anchor: 'bottom' })
        .setLngLat([pickLocation.longitude, pickLocation.latitude])
        .addTo(map);
      marker.on('dragend', () => {
        const next = marker.getLngLat();
        onPickRef.current?.({ latitude: next.lat, longitude: next.lng });
      });
      pickMarkerRef.current = marker;
    }
  }, [pickLocation, mapLoaded]);

  useEffect(() => {
    if (!selectedLocationId || onPickLocation || validLocations.length < 2) return;
    const selected = validLocations.find(location => location.id === selectedLocationId);
    if (selected) {
      mapRef.current?.flyTo({ center: [selected.longitude, selected.latitude], zoom: 14, duration: 500 });
    }
  }, [selectedLocationId, validLocations, onPickLocation]);

  return (
    <div className={`practice-map relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${className}`}>
      <div ref={containerRef} className="h-full w-full" aria-label="Map of practice locations" />
      {onPickLocation && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-700 shadow">
          Click the practice location or drag the pin to adjust it
        </div>
      )}
      {!onPickLocation && validLocations.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-4 w-[min(90%,26rem)] -translate-x-1/2 rounded-xl bg-white/95 px-4 py-3 text-center text-sm text-slate-700 shadow">
          Practice pins will appear here once providers confirm their locations.
        </div>
      )}
    </div>
  );
};

export default PracticeMap;
