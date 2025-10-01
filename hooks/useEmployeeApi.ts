import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../services/api';
import { queryKeys } from './useQueryClient';
import { Employee } from '../types';
import { EmployeeSuggestion } from '../services/api/interfaces/ApiInterfaces';

// Query hooks for employee data
export const useEmployees = (sessionId?: string) => {
  return useQuery({
    queryKey: sessionId ? queryKeys.employees.session(sessionId) : queryKeys.employees.all,
    queryFn: async (): Promise<Employee[]> => {
      if (sessionId) {
        // Note: getEmployeeData doesn't exist, using getAllEmployees for now
        return await employeeApi.getAllEmployees();
      }
      return await employeeApi.getAllEmployees();
    },
    enabled: Boolean(sessionId), // Only run if sessionId is provided
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
    mutationFn: ({ employees }: { employees: Employee[]; sessionName?: string }) =>
      employeeApi.importEmployeesFromCSV(employees),
    onSuccess: (sessionId, { employees }) => {
      // Invalidate and refetch employee data
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      if (sessionId) {
        queryClient.setQueryData(queryKeys.employees.session(sessionId), employees);
      }
      // Also invalidate sessions since we might have created a new one
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, employee }: { id: number; employee: Employee }) =>
      employeeApi.updateEmployee(id, employee.name, employee.nip || '', employee.gol || '', employee.pangkat || '', employee.position || '', employee.subPosition || '', employee.organizationalLevel),
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
    mutationFn: ({ mappings, sessionId }: { mappings: Record<string, string>; sessionId: string }) =>
      employeeApi.resolveEmployees(mappings, sessionId),
    onSuccess: (_, { sessionId }) => {
      // Invalidate employee data for this session
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizational.mappings });
    },
  });
};

export const useUpdateEmployeeSummary = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, employeeName, summary }: { 
      sessionId: string; 
      employeeName: string; 
      summary: string; 
    }) =>
      employeeApi.updateEmployeeSummary(sessionId, employeeName, summary),
    onSuccess: (_, { sessionId }) => {
      // Invalidate employee data for this session
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.session(sessionId) });
    },
  });
};
