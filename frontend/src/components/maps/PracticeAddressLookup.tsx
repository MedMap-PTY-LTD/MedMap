import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findPracticeAddress, type PracticeAddressMatch } from '@/lib/practiceGeocoding';
import type { PracticeCoordinates } from '@/lib/practiceMaps';

interface PracticeAddressLookupProps {
  address: string;
  onPickLocation: (coordinates: PracticeCoordinates) => void;
  disabled?: boolean;
}

const PracticeAddressLookup = ({ address, onPickLocation, disabled = false }: PracticeAddressLookupProps) => {
  const [matches, setMatches] = useState<PracticeAddressMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    setMatches([]);
    setIsSearching(false);
    setMessage('');
  }, [address]);

  const handleSearch = async () => {
    if (!address.trim()) {
      setMatches([]);
      setMessage('Enter the practice street address first.');
      return;
    }

    setIsSearching(true);
    setMatches([]);
    setMessage('');
    const searchId = ++requestId.current;

    try {
      const results = await findPracticeAddress(address);
      if (searchId !== requestId.current) return;
      setMatches(results);
      if (results.length === 0) {
        setMessage('No address match found. Add the suburb, city, or province and try again.');
      }
    } catch (error) {
      if (searchId !== requestId.current) return;
      setMessage(error instanceof Error ? error.message : 'Address lookup failed. Please try again.');
    } finally {
      if (searchId === requestId.current) setIsSearching(false);
    }
  };

  const chooseMatch = (match: PracticeAddressMatch) => {
    onPickLocation({ latitude: match.latitude, longitude: match.longitude });
    setMatches([]);
    setMessage(`Pin placed at: ${match.label}. Drag it or click the map to adjust.`);
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSearch}
        disabled={disabled || isSearching}
      >
        {isSearching
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <Search className="mr-2 h-4 w-4" />}
        {isSearching ? 'Finding address…' : 'Find address on map'}
      </Button>

      {message && <p className="text-xs text-slate-600" aria-live="polite">{message}</p>}

      {matches.length > 0 && (
        <div className="space-y-1 rounded-lg border border-slate-200 p-2" aria-label="Address matches">
          <p className="px-2 pb-1 text-xs font-medium text-slate-600">Choose the matching address:</p>
          {matches.map((match, index) => (
            <button
              key={`${match.latitude}:${match.longitude}:${index}`}
              type="button"
              onClick={() => chooseMatch(match)}
              className="flex w-full items-start gap-2 rounded-md p-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <span>{match.label}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Address lookup by <a className="underline" href="https://github.com/komoot/photon" target="_blank" rel="noreferrer">Photon</a>; data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.
      </p>
    </div>
  );
};

export default PracticeAddressLookup;
