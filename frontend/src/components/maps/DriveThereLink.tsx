import { ChevronDown, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getDirectionsUrls } from '@/lib/practiceMaps';

interface DriveThereLinkProps {
  address?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  variant?: 'default' | 'outline' | 'link';
  className?: string;
}

const DriveThereLink = ({
  address,
  city,
  province,
  latitude,
  longitude,
  variant = 'outline',
  className,
}: DriveThereLinkProps) => {
  const directionsUrls = getDirectionsUrls({
    address,
    city,
    province,
    coordinates: typeof latitude === 'number' && typeof longitude === 'number'
      ? { latitude, longitude }
      : null,
  });

  if (!directionsUrls) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} className={className}>
          <Navigation className="mr-2 h-4 w-4" />
          Drive there
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Open directions in</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={directionsUrls.googleMaps} target="_blank" rel="noreferrer noopener">
            Google Maps<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={directionsUrls.appleMaps} target="_blank" rel="noreferrer noopener">
            Apple Maps<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DriveThereLink;
