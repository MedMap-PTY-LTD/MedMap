import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AmbassadorService } from '@/lib/services/ambassadorService';
import { AmbassadorStatsCalculator } from '@/lib/utils/ambassadorStats';
import { useMemo } from 'react';

const QUERY_KEYS = {
  ambassador: 'ambassador',
  referrals: 'referrals',
};

export const useAmbassador = (uid: string) => {
  const queryClient = useQueryClient();

  // Query: Get ambassador data
  const { 
    data: ambassadorData, 
    isLoading: isLoadingAmbassador,
    refetch: refetchAmbassador,
  } = useQuery({
    queryKey: [QUERY_KEYS.ambassador, uid],
    queryFn: () => AmbassadorService.getAmbassadorData(uid),
    enabled: !!uid,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Query: Get referrals
  const { 
    data: referrals = [], 
    isLoading: isLoadingReferrals, 
    refetch: refetchReferrals,
  } = useQuery({
    queryKey: [QUERY_KEYS.referrals, ambassadorData?.uid],
    queryFn: () => AmbassadorService.getReferrals(ambassadorData!.uid),
    enabled: !!ambassadorData?.uid && ambassadorData?.applicationStatus === 'approved',
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Mutation: Update tier
  const updateTier = useMutation({
    mutationFn: (tier: string) => AmbassadorService.updateAmbassadorTier(uid, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ambassador] });
    },
  });

  // Calculate stats using the utility
  const stats = useMemo(() => AmbassadorStatsCalculator.calculate(referrals), [referrals]);

  const refetch = async () => {
    await Promise.all([refetchAmbassador(), refetchReferrals()]);
  };

  return {
    ambassadorData,
    referrals,
    stats,
    isLoading: isLoadingAmbassador || isLoadingReferrals,
    refetch,
    updateTier: updateTier.mutate,
    isUpdatingTier: updateTier.isPending,
  };
};