// pages/doctor/components/DoctorSearch.tsx
import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { Search, MapPin, Stethoscope, Filter, Calendar, Clock, Star, Shield, Loader2, X, Map as MapIcon, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import RealtimeStatusBar from '@/components/RealtimeStatusBar';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  startAfter,
  DocumentData
} from 'firebase/firestore';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { hasPaidMembershipAccess } from '@/lib/membershipAccess';
import { isPublicDoctorProfile } from '@/lib/doctorVisibility';
import DriveThereLink from '@/components/maps/DriveThereLink';
import { hasValidCoordinates } from '@/lib/practiceMaps';

const PracticeMap = lazy(() => import('@/components/maps/PracticeMap'));

// ==================== TYPES ====================

interface Doctor {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  specialization: string;
  practiceName: string;
  searchPracticeName: string;
  practiceAddress: string;
  searchAddress: string;
  searchLocation: string;
  searchPostalCode: string;
  practiceLatitude?: number;
  practiceLongitude?: number;
  city: string;
  province: string;
  consultationFee: number;
  consultationDuration: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  profileImage?: string;
  bio?: string;
  qualifications?: string[];
  operatingHours?: any;
  isAvailable: boolean;
  membershipPlanId: 'free' | 'member' | 'partner';
  membershipFeatured: boolean;
  isPaidMember: boolean;
  createdAt?: any;
}

interface DoctorFilters {
  search: string;
  province: string;
  specialty: string;
  priceRange: string;
  zipCode: string;
}

// ==================== QUERY KEYS ====================

const QUERY_KEYS = {
  doctors: 'doctors',
  doctor: 'doctor',
  specialties: 'specialties',
  provinces: 'provinces',
};

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

const normalizeSearchText = (value: unknown): string => String(value ?? '')
  .toLocaleLowerCase()
  .replace(/\b(?:rd|road)\b/g, 'road')
  .replace(/\b(?:st|street)\b/g, 'street')
  .replace(/\b(?:ave|avenue)\b/g, 'avenue')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const searchableString = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(searchableString).filter(Boolean).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(searchableString).filter(Boolean).join(' ');
  return '';
};

const matchesSearchText = (fields: unknown[], searchTerm: string): boolean => {
  const tokens = normalizeSearchText(searchTerm).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(fields.map(searchableString).join(' '));
  return tokens.every(token => haystack.includes(token));
};

// ==================== DATA FETCHING FUNCTIONS ====================

// ✅ SIMPLIFIED FETCH - No nested queries
const fetchDoctors = async ({ 
  pageParam = null, 
  province = '', 
  specialty = '',
  search = '',
  zipCode = '',
}: {
  pageParam?: any;
  province?: string;
  specialty?: string;
  search?: string;
  zipCode?: string;
}): Promise<{ doctors: Doctor[]; nextCursor: any; hasMore: boolean }> => {
  try {
    // ✅ REMOVED orderBy to avoid index requirement
    let constraints: any[] = [
      where('verificationStatus', '==', 'verified'),
    ];

    // Add specialty filter
    if (specialty && specialty !== 'All Specialties' && specialty !== '') {
      constraints.push(where('specialization', '==', specialty));
    }

    // Add province filter
    if (province && province !== 'All Provinces' && province !== '') {
      constraints.push(where('province', '==', province));
    }

    // Build the query with pagination
    let q = query(
      collection(db, 'doctors'),
      ...constraints,
      limit(20)
    );

    // If loading more, start after the last document
    if (pageParam) {
      q = query(
        collection(db, 'doctors'),
        ...constraints,
        startAfter(pageParam),
        limit(20)
      );
    }

    const [snapshot, featuredSnapshot] = await Promise.all([
      getDocs(q),
      pageParam
        ? Promise.resolve(null)
        : getDocs(query(collection(db, 'doctors'), where('membershipFeatured', '==', true))),
    ]);
    
    // Get the last document for pagination
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === 20;

    // ✅ SIMPLIFIED MAPPING - Only use data from doctors collection
    const doctors: Doctor[] = [];
    const documents = new Map<string, any>();
    const now = Date.now();
    featuredSnapshot?.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (!isPublicDoctorProfile(data)) return;
      const hasCurrentPartnerMembership = data.membershipPlanId === 'partner' &&
        hasPaidMembershipAccess(data.membershipStatus, data.membershipPeriodEnd, data.membershipGracePeriodEnd, now);
      if (hasCurrentPartnerMembership && data.verificationStatus === 'verified' &&
          (!specialty || specialty === 'All Specialties' || data.specialization === specialty) &&
          (!province || province === 'All Provinces' || data.province === province)) {
        documents.set(docSnap.id, docSnap);
      }
    });
    snapshot.docs.forEach(docSnap => {
      if (isPublicDoctorProfile(docSnap.data())) documents.set(docSnap.id, docSnap);
    });
    for (const [doctorId, docSnap] of documents) {
      const data = docSnap.data();
      
      // ✅ Get doctor data directly from the doctors collection
      // This avoids the nested user query
      const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Doctor';
      const specialization = data.specialization || '';
      const practiceName = data.practiceName || '';
      const city = data.city || '';
      const province = data.province || '';
      const membershipIsCurrent = hasPaidMembershipAccess(data.membershipStatus, data.membershipPeriodEnd, data.membershipGracePeriodEnd) &&
        ['member', 'partner'].includes(data.membershipPlanId);
      const membershipPlanId = membershipIsCurrent ? data.membershipPlanId : 'free';
      const isPaidMember = membershipPlanId !== 'free';
      const searchAddress = [
        data.practiceAddress,
        data.practice_address,
        data.address,
        data.addressLine1,
        data.address_line_1,
        data.streetAddress,
        data.street_address,
      ].map(searchableString).filter(Boolean).join(', ');
      const searchPostalCode = searchableString(
        data.postalCode || data.postal_code || data.postalCodeNumber || data.postcode || data.zipCode || data.zip_code,
      );
      const searchLocation = [
        searchAddress,
        searchPostalCode,
        data.suburb,
        data.town,
        data.district,
        data.area,
        data.locality,
        data.neighbourhood,
        data.neighborhood,
        data.location,
        city,
        province,
      ].map(searchableString).filter(Boolean).join(' ');
      const practiceAddress = isPaidMember ? searchAddress : '';

      // Check if search term matches
      if (search) {
        if (!matchesSearchText([
          fullName,
          specialization,
          practiceName,
          searchLocation,
        ], search)) continue;
      }

      if (zipCode && !matchesSearchText([searchLocation], zipCode)) {
        continue;
      }

      doctors.push({
        id: doctorId,
        uid: doctorId,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        fullName: fullName,
        email: data.email || '',
        specialization: specialization,
        practiceName: isPaidMember ? practiceName : '',
        searchPracticeName: practiceName,
        practiceAddress,
        searchAddress,
        searchLocation,
        searchPostalCode,
        practiceLatitude: isPaidMember && hasValidCoordinates(data.practiceLatitude, data.practiceLongitude)
          ? data.practiceLatitude
          : undefined,
        practiceLongitude: isPaidMember && hasValidCoordinates(data.practiceLatitude, data.practiceLongitude)
          ? data.practiceLongitude
          : undefined,
        city: city,
        province: province,
        consultationFee: data.consultationFee || 0,
        consultationDuration: data.consultationDuration || 30,
        verificationStatus: data.verificationStatus || 'pending',
        rating: isPaidMember ? data.rating || 0 : 0,
        reviewCount: isPaidMember ? data.reviewCount || 0 : 0,
        yearsExperience: isPaidMember ? data.yearsExperience || 0 : 0,
        profileImage: isPaidMember ? data.profileImage || data.profilePicture || '' : '',
        bio: isPaidMember ? data.bio || '' : '',
        qualifications: data.qualifications || [],
        operatingHours: data.operatingHours || {},
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
        membershipPlanId,
        membershipFeatured: membershipPlanId === 'partner' && data.membershipFeatured === true,
        isPaidMember,
        createdAt: data.createdAt,
      });
    }

    // Sort by rating or name
    doctors.sort((a, b) => {
      if (a.membershipFeatured !== b.membershipFeatured) return a.membershipFeatured ? -1 : 1;
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    return {
      doctors,
      nextCursor: lastVisible,
      hasMore,
    };
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
};

// ✅ SIMPLIFIED SPECIALTIES - Only query doctors collection
const fetchSpecialties = async (): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'doctors'),
      where('verificationStatus', '==', 'verified')
    );
    const snapshot = await getDocs(q);
    const specialties = new Set<string>();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isPublicDoctorProfile(data) && data.specialization) {
        specialties.add(data.specialization);
      }
    });
    return ['All Specialties', ...Array.from(specialties).sort()];
  } catch (error) {
    console.error('Error fetching specialties:', error);
    return ['All Specialties'];
  }
};

// ✅ SIMPLIFIED PROVINCES - Only query doctors collection
const fetchProvinces = async (): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'doctors'),
      where('verificationStatus', '==', 'verified')
    );
    const snapshot = await getDocs(q);
    const provinces = new Set<string>(SOUTH_AFRICAN_PROVINCES);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isPublicDoctorProfile(data) && data.province) {
        provinces.add(data.province);
      }
    });
    return ['All Provinces', ...Array.from(provinces).sort()];
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return ['All Provinces'];
  }
};

// ==================== PRICE RANGES ====================

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: 999999 },
  { label: 'R100 - R300', min: 100, max: 300 },
  { label: 'R300 - R500', min: 300, max: 500 },
  { label: 'R500 - R800', min: 500, max: 800 },
  { label: 'R800 - R1200', min: 800, max: 1200 },
  { label: 'R1200+', min: 1200, max: 999999 }
];

const normalizeFilterOption = (value: string, options: string[], fallback: string): string => {
  const normalizedValue = value.trim().toLocaleLowerCase();
  if (!normalizedValue || normalizedValue === fallback.toLocaleLowerCase()) return fallback;
  return options.find(option => option.toLocaleLowerCase() === normalizedValue) || value.trim();
};

// ==================== MAIN COMPONENT ====================

const DoctorSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Filter states from URL params
  const [filters, setFilters] = useState<DoctorFilters>({
    search: searchParams.get('search') || '',
    province: searchParams.get('location') || 'All Provinces',
    specialty: searchParams.get('specialty') || 'All Specialties',
    priceRange: searchParams.get('price') || 'All Prices',
    zipCode: searchParams.get('zip') || '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    (searchParams.get('search') || '').trim().toLocaleLowerCase(),
  );
  const [debouncedZipCode, setDebouncedZipCode] = useState(() =>
    (searchParams.get('zip') || '').trim().toLocaleLowerCase(),
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim().toLocaleLowerCase());
      setDebouncedZipCode(filters.zipCode.trim().toLocaleLowerCase());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters.search, filters.zipCode]);

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedMapLocationId, setSelectedMapLocationId] = useState<string | null>(null);

  // ==================== QUERIES ====================

  // Fetch specialties
  const { 
    data: specialties = ['All Specialties'], 
    isLoading: isLoadingSpecialties 
  } = useQuery({
    queryKey: [QUERY_KEYS.specialties],
    queryFn: fetchSpecialties,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch provinces
  const { 
    data: provinces = ['All Provinces'], 
    isLoading: isLoadingProvinces 
  } = useQuery({
    queryKey: [QUERY_KEYS.provinces],
    queryFn: fetchProvinces,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const selectedProvince = normalizeFilterOption(filters.province, provinces, 'All Provinces');
  const selectedSpecialty = normalizeFilterOption(filters.specialty, specialties, 'All Specialties');
  const selectedPriceRange = normalizeFilterOption(
    filters.priceRange,
    PRICE_RANGES.map(range => range.label),
    'All Prices',
  );
  const normalizedZipCode = debouncedZipCode;
  const shouldSearchAllPages = debouncedSearch.length >= 2 || normalizedZipCode.length >= 2;

  // Infinite query for doctors
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingDoctors,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      QUERY_KEYS.doctors,
      selectedProvince,
      selectedSpecialty,
      debouncedSearch,
      normalizedZipCode,
    ],
    queryFn: ({ pageParam }) => fetchDoctors({ 
      pageParam, 
      province: selectedProvince,
      specialty: selectedSpecialty,
      search: debouncedSearch,
      zipCode: normalizedZipCode,
    }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000,
    retry: 2,
  });

  // ==================== DERIVED DATA ====================

  const allDoctors = useMemo(() => {
    const doctors = data?.pages.flatMap(page => page.doctors) || [];
    return Array.from(new Map(doctors.map(doctor => [doctor.id, doctor])).values())
      .sort((a, b) => {
        if (a.membershipFeatured !== b.membershipFeatured) return a.membershipFeatured ? -1 : 1;
        if (a.rating !== b.rating) return b.rating - a.rating;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [data]);

  const filteredDoctors = useMemo(() => {
    let filtered = allDoctors;

    // Search filter (client-side)
    if (debouncedSearch) {
      const term = debouncedSearch;
      filtered = filtered.filter(doctor => matchesSearchText([
        doctor.fullName,
        doctor.specialization,
        doctor.searchPracticeName,
        doctor.searchAddress,
        doctor.searchLocation,
        doctor.searchPostalCode,
      ], term));
    }

    if (normalizedZipCode) {
      filtered = filtered.filter(doctor =>
        matchesSearchText([doctor.searchLocation], normalizedZipCode),
      );
    }

    // Price range filter
    if (selectedPriceRange !== 'All Prices') {
      const range = PRICE_RANGES.find(r => r.label === selectedPriceRange);
      if (range) {
        filtered = filtered.filter(doctor => 
          doctor.consultationFee >= range.min && doctor.consultationFee <= range.max
        );
      }
    }

    return filtered;
  }, [allDoctors, debouncedSearch, normalizedZipCode, selectedPriceRange]);

  const mappedDoctors = useMemo(
    () => filteredDoctors.filter(doctor =>
      doctor.isPaidMember &&
      hasValidCoordinates(doctor.practiceLatitude, doctor.practiceLongitude),
    ),
    [filteredDoctors],
  );
  const mapLocations = useMemo(
    () => mappedDoctors.map(doctor => ({
      id: doctor.id,
      name: `Dr. ${doctor.fullName}`,
      subtitle: [doctor.city, doctor.province].filter(Boolean).join(', '),
      latitude: doctor.practiceLatitude!,
      longitude: doctor.practiceLongitude!,
    })),
    [mappedDoctors],
  );
  const selectedMapDoctor = mappedDoctors.find(doctor => doctor.id === selectedMapLocationId) || null;

  useEffect(() => {
    if (!shouldSearchAllPages || !hasNextPage || isLoadingDoctors || isFetchingNextPage) return;
    void fetchNextPage();
  }, [shouldSearchAllPages, data?.pages.length, hasNextPage, isLoadingDoctors, isFetchingNextPage, fetchNextPage]);

  // ==================== HANDLERS ====================

  const handleFilterChange = (key: keyof DoctorFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      province: 'All Provinces',
      specialty: 'All Specialties',
      priceRange: 'All Prices',
      zipCode: '',
    });
  };

  const handleBookAppointment = (doctorId: string) => {
    navigate(`/book/${doctorId}`);
  };

  const handleViewProfile = (doctorId: string) => {
    navigate(`/doctor/${doctorId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    if (!name) return 'D';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {halfStar && (
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
        ))}
      </div>
    );
  };

  // ==================== LOADING STATE ====================

  if (isLoadingDoctors && allDoctors.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading doctors...</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <div className="text-red-600 text-lg mb-2">⚠️ Failed to load doctors</div>
              <p className="text-sm text-gray-600 mb-4">{(error as Error)?.message || 'Unknown error'}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => refetch()} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-medical-gradient mb-2">Find Healthcare Providers</h1>
          <p className="text-muted-foreground mb-4">Search and book appointments with verified medical professionals across South Africa</p>
          <RealtimeStatusBar className="justify-center" />
        </div>

        {/* Search & Filters */}
        <Card className="medical-hero-card mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Search Term */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctor, specialty, practice, or address..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 h-12"
                />
                {filters.search && (
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Practice postal code */}
              <Input
                aria-label="Practice postal code"
                placeholder="Postal code (optional)"
                value={filters.zipCode}
                onChange={(e) => handleFilterChange('zipCode', e.target.value)}
                className="h-12"
              />

              {/* Province */}
              <Select 
                value={selectedProvince}
                onValueChange={(v) => handleFilterChange('province', v)}
                disabled={isLoadingProvinces}
              >
                <SelectTrigger className="h-12">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Specialty */}
              <Select 
                value={selectedSpecialty}
                onValueChange={(v) => handleFilterChange('specialty', v)}
                disabled={isLoadingSpecialties}
              >
                <SelectTrigger className="h-12">
                  <Stethoscope className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Medical specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Price Range */}
              <Select 
                value={selectedPriceRange}
                onValueChange={(v) => handleFilterChange('priceRange', v)}
              >
                <SelectTrigger className="h-12">
                  <span className="text-muted-foreground mr-2">R</span>
                  <SelectValue placeholder="Price range" />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map((range) => (
                    <SelectItem key={range.label} value={range.label}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <p className="text-sm text-muted-foreground">
                {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} shown
              </p>
              <div className="flex gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label="Search result view">
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('list')}
                    aria-pressed={viewMode === 'list'}
                    className="h-9"
                  >
                    <List className="mr-2 h-4 w-4" />List
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === 'map' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('map')}
                    aria-pressed={viewMode === 'map'}
                    className="h-9"
                  >
                    <MapIcon className="mr-2 h-4 w-4" />Map
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="btn-medical-secondary"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isLoadingDoctors}
                >
                  {isLoadingDoctors ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Refresh</span>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid gap-6">
          {filteredDoctors.length === 0 && shouldSearchAllPages && hasNextPage ? (
            <Card className="medical-card">
              <CardContent className="flex items-center justify-center gap-3 p-12 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Searching all matching providers…</span>
              </CardContent>
            </Card>
          ) : filteredDoctors.length === 0 ? (
            <Card className="medical-card">
              <CardContent className="p-12 text-center">
                <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-bold mb-2">No doctors found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search criteria</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === 'map' ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Suspense fallback={<div className="h-[440px] animate-pulse rounded-2xl bg-slate-100 sm:h-[560px]" />}>
                <PracticeMap
                  locations={mapLocations}
                  selectedLocationId={selectedMapLocationId}
                  onSelectLocation={setSelectedMapLocationId}
                  className="h-[440px] sm:h-[560px]"
                />
              </Suspense>
              <Card className="overflow-hidden border-slate-200">
                <CardContent className="p-0">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="font-semibold text-slate-900">Practice locations</p>
                    <p className="text-xs text-slate-500">{mappedDoctors.length} pinned of {filteredDoctors.length} shown</p>
                  </div>
                  {mappedDoctors.length === 0 ? (
                    <div className="p-5 text-sm text-slate-600">
                      No verified practice pins are available for these results yet. Providers can set a pin from their dashboard.
                    </div>
                  ) : (
                    <div className="max-h-[350px] divide-y divide-slate-100 overflow-y-auto xl:max-h-[420px]">
                      {mappedDoctors.map(doctor => (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() => setSelectedMapLocationId(doctor.id)}
                          className={`block w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${selectedMapLocationId === doctor.id ? 'bg-blue-50' : ''}`}
                          aria-pressed={selectedMapLocationId === doctor.id}
                        >
                          <span className="block font-medium text-slate-900">Dr. {doctor.fullName}</span>
                          <span className="mt-0.5 block text-sm text-slate-600">{doctor.specialization}</span>
                          <span className="mt-1 block text-xs text-slate-500">{[doctor.city, doctor.province].filter(Boolean).join(', ')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedMapDoctor && (
                    <div className="space-y-3 border-t border-slate-100 p-4">
                      <p className="line-clamp-2 text-xs text-slate-600">{selectedMapDoctor.practiceAddress}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Link to={`/doctor/${selectedMapDoctor.id}`}>View profile</Link>
                        </Button>
                        <DriveThereLink
                          address={selectedMapDoctor.practiceAddress}
                          city={selectedMapDoctor.city}
                          province={selectedMapDoctor.province}
                          latitude={selectedMapDoctor.practiceLatitude}
                          longitude={selectedMapDoctor.practiceLongitude}
                          className="h-9 px-3"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="medical-card hover:scale-[1.02] transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Doctor Avatar */}
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      {doctor.profileImage ? (
                        <img src={doctor.profileImage} alt={`Dr. ${doctor.fullName}`} className="h-full w-full rounded-2xl object-cover" />
                      ) : getInitials(doctor.fullName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-foreground">
                              Dr. {doctor.fullName}
                            </h3>
                            {doctor.verificationStatus === 'verified' && (
                              <Shield className="h-5 w-5 text-green-600" />
                            )}
                            {doctor.membershipPlanId !== 'free' && (
                              <Badge className={doctor.membershipPlanId === 'partner' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}>
                                {doctor.membershipPlanId === 'partner' ? 'Partner' : 'Member'}
                              </Badge>
                            )}
                            {doctor.membershipFeatured && <Badge className="bg-purple-100 text-purple-900">Featured</Badge>}
                          </div>
                          <p className="text-blue-600 font-semibold">{doctor.specialization}</p>
                          <p className="text-sm text-muted-foreground">{doctor.practiceName}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(doctor.consultationFee)}
                          </div>
                          <p className="text-xs text-muted-foreground">per consultation</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          {(doctor.city || doctor.province) && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{[doctor.city, doctor.province].filter(Boolean).join(', ')}</span>
                            </div>
                          )}
                          {doctor.yearsExperience > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{doctor.yearsExperience} years experience</span>
                            </div>
                          )}
                          {doctor.consultationDuration && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{doctor.consultationDuration} min consultation</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {doctor.isPaidMember ? (
                            <div className="flex items-center gap-2">
                              {renderStars(doctor.rating)}
                              <span className="text-xs text-muted-foreground">
                                ({doctor.reviewCount} review{doctor.reviewCount !== 1 ? 's' : ''})
                              </span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">Reviews and ratings for Member and Partner providers</span>}
                          {doctor.isAvailable && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Available Today
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {doctor.bio && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {doctor.bio}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleBookAppointment(doctor.id)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Book Appointment
                        </Button>
                        <Button 
                          variant="outline" 
                          className="btn-medical-secondary"
                          onClick={() => handleViewProfile(doctor.id)}
                        >
                          View Profile
                        </Button>
                        {doctor.isPaidMember && (doctor.practiceAddress || hasValidCoordinates(doctor.practiceLatitude, doctor.practiceLongitude)) && (
                          <DriveThereLink
                            address={doctor.practiceAddress}
                            city={doctor.city}
                            province={doctor.province}
                            latitude={doctor.practiceLatitude}
                            longitude={doctor.practiceLongitude}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More */}
        {hasNextPage && filteredDoctors.length > 0 && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage || isLoadingDoctors}
              className="min-w-[200px]"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading more...
                </>
              ) : (
                'Load More Doctors'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorSearch;
