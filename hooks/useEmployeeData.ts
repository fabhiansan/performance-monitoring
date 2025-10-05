/**
 * React Query hooks for employee data management
 * Provides a unified interface for fetching, caching, and synchronizing employee data
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Employee } from "../types";
import { employeeApi, sessionApi } from "../services/api";
import { queryKeys, invalidateQueries } from "./useQueryClient";
import {
  handleQueryError,
  queryRetryConfig,
  mutationRetryConfig,
} from "./queryErrorHandling";

/**
 * Fetch all master employees (from employee_database table)
 * Used in Dashboard Overview and Employee Management
 * Supports request cancellation via AbortSignal
 */
export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: queryKeys.employees.all,
    queryFn: async ({ signal }) => {
      return await employeeApi.getAllEmployees(signal);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...queryRetryConfig,
  });
}

/**
 * Fetch all master employees with session-specific performance data
 * This is the primary hook for viewing employee data with performance scores for a specific session
 * Returns ALL employees from master database, but performance array is filtered by session
 * Used in Dashboard, Analytics, Reports, etc.
 */
export function useEmployeesWithSessionData(
  sessionId: string | null | undefined,
) {
  return useQuery<Employee[]>({
    queryKey: queryKeys.employees.session(sessionId), // Reuse session query key
    queryFn: async ({ signal }) => {
      if (!sessionId) {
        // If no session, return all employees with empty performance arrays
        return await employeeApi.getAllEmployees(signal);
      }
      // This endpoint now returns ALL employees with session-filtered performance data
      return await sessionApi.getEmployeeDataBySession(sessionId, signal);
    },
    enabled: true, // Always enabled, even without sessionId
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryRetryConfig,
  });
}

/**
 * Fetch organizational level mappings (employee name -> org level)
 * Supports request cancellation via AbortSignal
 */
export function useOrganizationalMappings() {
  return useQuery<Record<string, string>>({
    queryKey: queryKeys.organizational.mappings,
    queryFn: async ({ signal }) => {
      return await employeeApi.getEmployeeOrgLevelMapping(signal);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - org structure changes infrequently
    ...queryRetryConfig,
  });
}

/**
 * Mutation to save employee data (import/upload)
 * Automatically invalidates relevant queries on success
 */
export function useSaveEmployeeData() {
  return useMutation({
    mutationFn: async ({
      employees,
      sessionName,
    }: {
      employees: Employee[];
      sessionName?: string;
    }) => {
      return await sessionApi.saveEmployeeData(employees, sessionName);
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      invalidateQueries.sessions();
      invalidateQueries.employees();
    },
    onError: (error) => {
      handleQueryError(error, "save employee data");
    },
    ...mutationRetryConfig,
  });
}

/**
 * Mutation to add a new employee
 * Implements optimistic updates for instant UI feedback
 */
export function useAddEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      nip?: string;
      gol?: string;
      pangkat?: string;
      position?: string;
      subPosition?: string;
      organizationalLevel?: string;
    }) => {
      return await employeeApi.addEmployee({
        name: params.name,
        nip: params.nip || "-",
        gol: params.gol || "-",
        pangkat: params.pangkat || "-",
        position: params.position || "-",
        subPosition: params.subPosition || "-",
        organizationalLevel: params.organizationalLevel,
      });
    },
    onMutate: async (newEmployeeParams) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      // Snapshot previous value
      const previousEmployees = queryClient.getQueryData<Employee[]>(
        queryKeys.employees.all,
      );

      // Create temporary employee object for optimistic update
      const tempEmployee: Employee = {
        id: Date.now(), // Temporary ID that will be replaced by server response
        name: newEmployeeParams.name,
        nip: newEmployeeParams.nip || "-",
        gol: newEmployeeParams.gol || "-",
        pangkat: newEmployeeParams.pangkat || "-",
        position: newEmployeeParams.position || "-",
        sub_position: newEmployeeParams.subPosition || "-",
        organizational_level: newEmployeeParams.organizationalLevel || "",
        performance: [],
      };

      // Optimistically add the new employee
      if (previousEmployees) {
        queryClient.setQueryData<Employee[]>(queryKeys.employees.all, [
          ...previousEmployees,
          tempEmployee,
        ]);
      }

      return { previousEmployees };
    },
    onError: (error, _newEmployee, context) => {
      // Rollback on error
      if (context?.previousEmployees) {
        queryClient.setQueryData(
          queryKeys.employees.all,
          context.previousEmployees,
        );
      }
      handleQueryError(error, "add employee");
    },
    onSettled: () => {
      // Refetch to get the actual employee with server-generated ID
      invalidateQueries.employees();
      invalidateQueries.organizational();
    },
    ...mutationRetryConfig,
  });
}

/**
 * Mutation to update an employee
 * Implements optimistic updates for instant UI feedback
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: number;
      name: string;
      nip: string;
      gol: string;
      pangkat: string;
      position: string;
      subPosition: string;
      organizationalLevel?: string;
    }) => {
      return await employeeApi.updateEmployee(params.id, {
        name: params.name,
        nip: params.nip,
        gol: params.gol,
        pangkat: params.pangkat,
        position: params.position,
        subPosition: params.subPosition,
        organizationalLevel: params.organizationalLevel,
      });
    },
    onMutate: async (newEmployee) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      // Snapshot previous value
      const previousEmployees = queryClient.getQueryData<Employee[]>(
        queryKeys.employees.all,
      );

      // Optimistically update the cache
      if (previousEmployees) {
        queryClient.setQueryData<Employee[]>(
          queryKeys.employees.all,
          previousEmployees.map((emp) =>
            emp.id === newEmployee.id
              ? {
                  ...emp,
                  name: newEmployee.name,
                  nip: newEmployee.nip,
                  gol: newEmployee.gol,
                  pangkat: newEmployee.pangkat,
                  position: newEmployee.position,
                  sub_position: newEmployee.subPosition,
                  organizational_level:
                    newEmployee.organizationalLevel || emp.organizational_level,
                }
              : emp,
          ),
        );
      }

      return { previousEmployees };
    },
    onError: (error, _newEmployee, context) => {
      // Rollback on error
      if (context?.previousEmployees) {
        queryClient.setQueryData(
          queryKeys.employees.all,
          context.previousEmployees,
        );
      }
      handleQueryError(error, "update employee");
    },
    onSettled: () => {
      invalidateQueries.employees();
      invalidateQueries.organizational();
    },
    ...mutationRetryConfig,
  });
}

/**
 * Mutation to delete an employee
 * Implements optimistic updates for instant UI feedback
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: number) => {
      return await employeeApi.deleteEmployee(employeeId);
    },
    onMutate: async (employeeId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      // Snapshot the previous value
      const previousEmployees = queryClient.getQueryData<Employee[]>(
        queryKeys.employees.all,
      );

      // Optimistically update by removing the employee
      if (previousEmployees) {
        queryClient.setQueryData<Employee[]>(
          queryKeys.employees.all,
          previousEmployees.filter((emp) => emp.id !== employeeId),
        );
      }

      // Return context with the snapshotted value
      return { previousEmployees };
    },
    onError: (error, _employeeId, context) => {
      // Rollback to previous state on error
      if (context?.previousEmployees) {
        queryClient.setQueryData(
          queryKeys.employees.all,
          context.previousEmployees,
        );
      }
      handleQueryError(error, "delete employee");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      invalidateQueries.employees();
      invalidateQueries.organizational();
    },
    retry: 1,
  });
}
