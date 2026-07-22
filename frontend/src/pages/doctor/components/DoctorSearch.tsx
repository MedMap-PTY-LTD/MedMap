// pages/doctor/components/DoctorSearch.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, MapPin, Stethoscope, Filter, Calendar, Clock, Star, Shield, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import RealtimeStatusBar from '@/components/RealtimeStatusBar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

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
  practiceAddress: string;
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
  createdAt?: any;
}

interface DoctorFilters {
  search: string;
  province: string;
  specialty: string;
  priceRange: string;
}

// ==================== QUERY KEYS ====================

const QUERY_KEYS = {
  doctors: 'doctors',
  doctor: 'doctor',
  specialties: 'specialties',
  provinces: 'provinces',
};

// ==================== DATA FETCHING FUNCTIONS ====================

// ✅ SIMPLIFIED FETCH - No nested queries
const fetchDoctors = async ({ 
  pageParam = null, 
  province = '', 
  specialty = '',
  search = '',
}: {
  pageParam?: any;
  province?: string;
  specialty?: string;
  search?: string;
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

    const snapshot = await getDocs(q);
    
    // Get the last document for pagination
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === 20;

    // ✅ SIMPLIFIED MAPPING - Only use data from doctors collection
    const doctors: Doctor[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const doctorId = docSnap.id;
      
      // ✅ Get doctor data directly from the doctors collection
      // This avoids the nested user query
      const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Doctor';
      const specialization = data.specialization || '';
      const practiceName = data.practiceName || '';
      const city = data.city || '';
      const province = data.province || '';

      // Check if search term matches
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          fullName.toLowerCase().includes(searchLower) ||
          specialization.toLowerCase().includes(searchLower) ||
          practiceName.toLowerCase().includes(searchLower) ||
          city.toLowerCase().includes(searchLower) ||
          province.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) continue;
      }

      doctors.push({
        id: doctorId,
        uid: doctorId,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        fullName: fullName,
        email: data.email || '',
        specialization: specialization,
        practiceName: practiceName,
        practiceAddress: data.practiceAddress || '',
        city: city,
        province: province,
        consultationFee: data.consultationFee || 0,
        consultationDuration: data.consultationDuration || 30,
        verificationStatus: data.verificationStatus || 'pending',
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        yearsExperience: data.yearsExperience || 0,
        profileImage: data.profileImage || '',
        bio: data.bio || '',
        qualifications: data.qualifications || [],
        operatingHours: data.operatingHours || {},
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
        createdAt: data.createdAt,
      });
    }

    // Sort by rating or name
    doctors.sort((a, b) => {
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
      if (data.specialization) {
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
    const provinces = new Set<string>();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.province) {
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

// ==================== MAIN COMPONENT ====================

const DoctorSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter states from URL params
  const [filters, setFilters] = useState<DoctorFilters>({
    search: searchParams.get('search') || '',
    province: searchParams.get('location') || 'All Provinces',
    specialty: searchParams.get('specialty') || 'All Specialties',
    priceRange: searchParams.get('price') || 'All Prices',
  });

  const [showFilters, setShowFilters] = useState(false);

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
      filters.province,
      filters.specialty,
    ],
    queryFn: ({ pageParam }) => fetchDoctors({ 
      pageParam, 
      province: filters.province,
      specialty: filters.specialty,
      search: filters.search,
    }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });

  // ==================== DERIVED DATA ====================

  const allDoctors = useMemo(() => {
    return data?.pages.flatMap(page => page.doctors) || [];
  }, [data]);

  const filteredDoctors = useMemo(() => {
    let filtered = allDoctors;

    // Search filter (client-side)
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(doctor =>
        doctor.fullName.toLowerCase().includes(term) ||
        doctor.specialization.toLowerCase().includes(term) ||
        doctor.practiceName.toLowerCase().includes(term) ||
        doctor.city.toLowerCase().includes(term) ||
        doctor.province.toLowerCase().includes(term)
      );
    }

    // Price range filter
    if (filters.priceRange && filters.priceRange !== 'All Prices') {
      const range = PRICE_RANGES.find(r => r.label === filters.priceRange);
      if (range) {
        filtered = filtered.filter(doctor => 
          doctor.consultationFee >= range.min && doctor.consultationFee <= range.max
        );
      }
    }

    return filtered;
  }, [allDoctors, filters.search, filters.priceRange]);

  // ==================== HANDLERS ====================

  const handleFilterChange = (key: keyof DoctorFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    queryClient.resetQueries({ queryKey: [QUERY_KEYS.doctors] });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      province: 'All Provinces',
      specialty: 'All Specialties',
      priceRange: 'All Prices',
    });
    queryClient.resetQueries({ queryKey: [QUERY_KEYS.doctors] });
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Search Term */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctor, specialty, or location..."
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

              {/* Province */}
              <Select 
                value={filters.province} 
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
                value={filters.specialty} 
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
                value={filters.priceRange} 
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
                {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
              </p>
              <div className="flex gap-2">
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
          {filteredDoctors.length === 0 ? (
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
          ) : (
            filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="medical-card hover:scale-[1.02] transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Doctor Avatar */}
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      {getInitials(doctor.fullName)}
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
                          <div className="flex items-center gap-2">
                            {renderStars(doctor.rating)}
                            <span className="text-xs text-muted-foreground">
                              ({doctor.reviewCount} review{doctor.reviewCount !== 1 ? 's' : ''})
                            </span>
                          </div>
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