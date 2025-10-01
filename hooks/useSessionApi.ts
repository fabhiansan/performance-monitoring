import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionApi, EmployeeWithSession } from '../services/api';
import { queryKeys } from './useQueryClient';

// Query hooks for session data
interface UploadSession {
  session_id: string;
  upload_timestamp: string;
  employee_count: number;
  session_name?: string;
}

export const useUploadSessions = () => {
  return useQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: async (): Promise<UploadSession[]> => {
      const result = await sessionApi.getAllUploadSessions();
      return result as UploadSession[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSessionData = (sessionId: string) => {
  return useQuery({
    queryKey: queryKeys.sessions.detail(sessionId),
    queryFn: async (): Promise<EmployeeWithSession[]> => {
      return await sessionApi.getEmployeeDataBySession(sessionId);
    },
    enabled: Boolean(sessionId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCurrentSession = () => {
  return useQuery({
    queryKey: queryKeys.sessions.current,
    queryFn: async (): Promise<{ session_id: string } | null> => {
      const result = await sessionApi.getCurrentSession();
      return result as { session_id: string } | null;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Mutation hooks for session operations
export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) => sessionApi.deleteUploadSession(sessionId),
    onSuccess: () => {
      // Invalidate all session-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.current });
      // Also invalidate employee data since sessions might affect it
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
};

export const useSetCurrentSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) => sessionApi.setCurrentSession(sessionId),
    onSuccess: (_, sessionId) => {
      // Update current session cache
      queryClient.setQueryData(queryKeys.sessions.current, { session_id: sessionId });
      // Invalidate employee data to refetch for new session
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
};