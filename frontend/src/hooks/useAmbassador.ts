// hooks/useAmbassador.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AmbassadorService } from '@/lib/services/ambassadorService';
import { AmbassadorStatsCalculator } from '@/lib/utils/ambassadorStats';
import { AmbassadorData, ReferralDoctor, AmbassadorStats } from '@/lib/types/ambassador';

// Query keys for cache management
const AMBASSADOR_QUERY_KEYS = {
  all: ['ambassador'] as const,
  data: (uid: string) => ['ambassador', 'data', uid] as const,
  referrals: (uid: string) => ['ambassador', 'referrals', uid] as const,
  stats: (uid: string) => ['ambassador', 'stats', uid] as const,
};

export const useAmbassador = (uid: string) => {
  const queryClient = useQueryClient();

  // Query: Ambassador data
  const dataQuery = useQuery({
    queryKey: AMBASSADOR_QUERY_KEYS.data(uid),
    queryFn: () => AmbassadorService.getAmbassadorData(uid),
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Query: Referrals
  const referralsQuery = useQuery({
    queryKey: AMBASSADOR_QUERY_KEYS.referrals(uid),
    queryFn: () => AmbassadorService.getReferrals(uid),
    enabled: !!uid,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Query: Stats (calculated from referrals)
  const statsQuery = useQuery({
    queryKey: AMBASSADOR_QUERY_KEYS.stats(uid),
    queryFn: async () => {
      const referrals = await AmbassadorService.getReferrals(uid);
      return AmbassadorStatsCalculator.calculate(referrals);
    },
    enabled: !!uid,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Combined loading and error states
  const isLoading = dataQuery.isLoading || referralsQuery.isLoading || statsQuery.isLoading;
  const isRefetching = dataQuery.isRefetching || referralsQuery.isRefetching || statsQuery.isRefetching;
  const error = dataQuery.error || referralsQuery.error || statsQuery.error;

  // Refetch all data
  const refetch = async () => {
    await Promise.all([
      dataQuery.refetch(),
      referralsQuery.refetch(),
      statsQuery.refetch(),
    ]);
  };

  // Invalidate cache (for after mutations)
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: AMBASSADOR_QUERY_KEYS.all });
  };

  return {
    ambassadorData: dataQuery.data || null,
    referrals: referralsQuery.data || [],
    stats: statsQuery.data || null,
    isLoading,
    isRefetching,
    error,
    refetch,
    invalidate,
    // Individual query states for granular control
    queries: {
      data: dataQuery,
      referrals: referralsQuery,
      stats: statsQuery,
    },
  };
};

// ==================== MUTATIONS ====================

/**
 * Mutation: Update ambassador stats
 */
export const useUpdateAmbassadorStats = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ambassadorId: string) =>
      AmbassadorService.updateAmbassadorStats(ambassadorId),
    onSuccess: (_, ambassadorId) => {
      queryClient.invalidateQueries({ 
        queryKey: AMBASSADOR_QUERY_KEYS.all 
      });
      queryClient.invalidateQueries({ 
        queryKey: AMBASSADOR_QUERY_KEYS.stats(ambassadorId) 
      });
    },
  });
};

/**
 * Mutation: Verify a referral (when doctor is approved)
 */
export const useVerifyReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ doctorId, commissionAmount }: { doctorId: string; commissionAmount?: number }) =>
      AmbassadorService.verifyReferral(doctorId, commissionAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: AMBASSADOR_QUERY_KEYS.all 
      });
    },
  });
};

/**
 * Mutation: Reject a referral (when doctor is rejected)
 */
export const useRejectReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ doctorId, reason }: { doctorId: string; reason: string }) =>
      AmbassadorService.rejectReferral(doctorId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: AMBASSADOR_QUERY_KEYS.all 
      });
    },
  });
};

/**
 * Mutation: Update ambassador tier
 */
export const useUpdateAmbassadorTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, tier }: { uid: string; tier: string }) =>
      AmbassadorService.updateAmbassadorTier(uid, tier),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ 
        queryKey: AMBASSADOR_QUERY_KEYS.data(uid) 
      });
    },
  });
};