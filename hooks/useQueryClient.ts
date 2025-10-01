import { QueryClient } from '@tanstack/react-query';

// Create a singleton QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error) {
          const status = (error as Error & { status?: number }).status;
          if (typeof status === 'number' && status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always'
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    }
  }
});

// Query keys factory for consistent cache management
export const queryKeys = {
  // Employee data
  employees: {
    all: ['employees'] as const,
    // Handle null/undefined sessionId gracefully
    session: (sessionId: string | null | undefined) =>
      sessionId ? ['employees', 'session', sessionId] as const
                : ['employees', 'session', 'null'] as const,
    suggestions: ['employees', 'suggestions'] as const,
  },

  // Session data
  sessions: {
    all: ['sessions'] as const,
    // Handle null/undefined sessionId gracefully
    detail: (sessionId: string | null | undefined) =>
      sessionId ? ['sessions', sessionId] as const
                : ['sessions', 'null'] as const,
    current: ['sessions', 'current'] as const,
  },

  // Data operations
  data: {
    // Handle null/undefined sessionId gracefully
    timeRange: (sessionId: string | null | undefined, startDate: string, endDate: string) =>
      sessionId ? ['data', 'time-range', sessionId, startDate, endDate] as const
                : ['data', 'time-range', 'null', startDate, endDate] as const,
    integrity: (sessionId: string | null | undefined) =>
      sessionId ? ['data', 'integrity', sessionId] as const
                : ['data', 'integrity', 'null'] as const,
  },
  
  // Organizational data
  organizational: {
    mappings: ['organizational', 'mappings'] as const,
    levels: ['organizational', 'levels'] as const,
  },
  
  // Leadership scores
  leadership: {
    all: ['leadership'] as const,
    employee: (employeeName: string) => ['leadership', 'employee', employeeName] as const,
  },
  
  // Health check
  health: ['health'] as const,
} as const;

// Helper function to invalidate related queries
export const invalidateQueries = {
  employees: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
  sessions: () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all }),
  organizational: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizational.mappings }),
  leadership: () => queryClient.invalidateQueries({ queryKey: queryKeys.leadership.all }),
  all: () => queryClient.invalidateQueries(),
};
