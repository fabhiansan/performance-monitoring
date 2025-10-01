import { useQuery } from '@tanstack/react-query';
import { apiClientFactory } from '../services/api';
import { queryKeys } from './useQueryClient';

export const useApiHealth = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClientFactory.checkHealth(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Check every minute
    retry: (failureCount) => {
      // Only retry health checks a few times
      return failureCount < 2;
    },
  });
};
