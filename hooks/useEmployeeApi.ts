import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeeApi, sessionApi } from "../services/api";
import { queryKeys } from "./useQueryClient";
import { Employee, toEmployeeUpdateParams } from "../types";
import { EmployeeSuggestion } from "../services/api/interfaces/ApiInterfaces";

// Query hooks for employee data
export const useEmployees = (sessionId?: string) => {
  return useQuery({
    queryKey: sessionId
      ? queryKeys.employees.session(sessionId)
      : queryKeys.employees.all,
    queryFn: async (): Promise<Employee[]> => {
      if (sessionId) {
        // Fetch employees with session-specific performance data from sessionApi
        return await sessionApi.getEmployeeDataBySession(sessionId);
      }
      // Fetch all master employees without session filtering
      return await employeeApi.getAllEmployees();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useEmployeeSuggestions = (name: string) => {
  return useQuery({
    queryKey: queryKeys.employees.suggestions,
    queryFn: async (): Promise<EmployeeSuggestion[]> => {
      return await employeeApi.getEmployeeSuggestions(name);
    },
    enabled: Boolean(name && name.trim().length > 0),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useOrganizationalMappings = () => {
  return useQuery({
    queryKey: queryKeys.organizational.mappings,
    queryFn: async (): Promise<Record<string, string>> => {
      return await employeeApi.getEmployeeOrgLevelMapping();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Mutation hooks for employee operations
export const useSaveEmployeeData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employees,
      sessionName,
    }: {
      employees: Employee[];
      sessionName?: string;
    }) => {
      // Use sessionApi to save employee data with performance scores
      return await sessionApi.saveEmployeeData(employees, sessionName);
    },
    onSuccess: async (sessionId) => {
      // Invalidate all employee and session queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.current });
      
      // Invalidate and refetch the specific session data
      if (sessionId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.employees.session(sessionId) });
        // Prefetch the new session data to ensure it's loaded
        await queryClient.prefetchQuery({
          queryKey: queryKeys.employees.session(sessionId),
          queryFn: async () => {
            return await sessionApi.getEmployeeDataBySession(sessionId);
          },
        });
      }
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, employee }: { id: number; employee: Employee }) =>
      employeeApi.updateEmployee(id, toEmployeeUpdateParams(employee)),
    onSuccess: () => {
      // Invalidate employee queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => employeeApi.deleteEmployee(id),
    onSuccess: () => {
      // Invalidate employee queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
};

export const useResolveEmployees = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mappings,
      sessionId,
    }: {
      mappings: Record<string, string>;
      sessionId: string;
    }) => employeeApi.resolveEmployees(mappings, sessionId),
    onSuccess: (_, { sessionId }) => {
      // Invalidate employee data for this session
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.session(sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizational.mappings,
      });
    },
  });
};

export const useUpdateEmployeeSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      employeeName,
      summary,
    }: {
      sessionId: string;
      employeeName: string;
      summary: string;
    }) => employeeApi.updateEmployeeSummary(sessionId, employeeName, summary),
    onSuccess: (_, { sessionId }) => {
      // Invalidate employee data for this session
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.session(sessionId),
      });
    },
  });
};
