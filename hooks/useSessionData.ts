/**
 * React Query hooks for session data management
 * Provides a unified interface for managing upload sessions and current session state
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { sessionApi } from "../services/api";
import { queryKeys, invalidateQueries } from "./useQueryClient";
import { logger } from "../services/logger";
import {
  handleQueryError,
  queryRetryConfig,
  mutationRetryConfig,
} from "./queryErrorHandling";

/**
 * Fetch all upload sessions
 * Supports request cancellation via AbortSignal
 */
export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: async ({ signal }) => {
      return await sessionApi.getAllUploadSessions(signal);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryRetryConfig,
  });
}

/**
 * Fetch current active session
 * Supports request cancellation via AbortSignal
 */
export function useCurrentSession() {
  return useQuery({
    queryKey: queryKeys.sessions.current,
    queryFn: async ({ signal }) => {
      return await sessionApi.getCurrentSession(signal);
    },
    staleTime: 1 * 60 * 1000, // 1 minute - current session changes more frequently
    ...queryRetryConfig,
  });
}

/**
 * Mutation to set the current active session
 */
export function useSetCurrentSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await sessionApi.setCurrentSession(sessionId);
      return sessionId;
    },
    onSuccess: () => {
      invalidateQueries.sessions();
    },
    onError: (error) => {
      handleQueryError(error, "set current session");
    },
    ...mutationRetryConfig,
  });
}

/**
 * Mutation to delete a session
 */
export function useDeleteSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await sessionApi.deleteUploadSession(sessionId);
    },
    onSuccess: () => {
      invalidateQueries.sessions();
      invalidateQueries.employees();
    },
    onError: (error) => {
      handleQueryError(error, "delete session");
    },
    retry: 1, // Delete operations should retry less
  });
}

/**
 * Hook to manage session selection with automatic data loading
 * This combines multiple queries and provides a unified interface
 */
export function useSessionManager(initialSessionId?: string) {
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useSessions();
  const { data: currentSession, error: currentSessionError } =
    useCurrentSession();
  const setCurrentSession = useSetCurrentSession();

  // Determine the active session ID
  const activeSessionId =
    initialSessionId ||
    currentSession?.session_id ||
    (sessions as Array<{ session_id: string }>)[0]?.session_id;

  const handleSessionChange = async (sessionId: string) => {
    try {
      await setCurrentSession.mutateAsync(sessionId);
    } catch (error) {
      logger.error("Session change failed", { sessionId, error });
      throw error;
    }
  };

  // Aggregate errors for consumers
  const error = sessionsError || currentSessionError;

  return {
    sessions,
    activeSessionId,
    isLoading: sessionsLoading,
    isSwitching: setCurrentSession.isPending,
    changeSession: handleSessionChange,
    error,
  };
}
