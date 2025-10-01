/// <reference types="vite/client" />
import { Employee } from '../../types';
import { 
  apiClientFactory, 
  UploadSession, 
  EmployeeWithSession, 
  EmployeeSuggestion 
} from './interfaces';

/**
 * Legacy compatibility layer for the old ApiService singleton pattern.
 * This maintains backward compatibility while delegating to the new client architecture.
 * 
 * TODO: Gradually migrate components to use specific clients directly:
 * - import { employeeApi, sessionApi, dataApi, leadershipApi } from 'services/api/interfaces'
 * - Replace `api.getAllEmployees()` with `employeeApi.getAllEmployees()`
 * - Remove this compatibility layer once all components are migrated
 */
class LegacyApiService {
  // Response format control (delegates to factory)
  setResponseFormat(useStandardized: boolean): void {
    apiClientFactory.setResponseFormat(useStandardized);
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    return apiClientFactory.checkHealth();
  }

  // Employee operations (delegate to EmployeeApiClient)
  async getAllEmployees(): Promise<Employee[]> {
    return apiClientFactory.getEmployeeClient().getAllEmployees();
  }

  async getEmployeeById(id: number): Promise<Employee> {
    return apiClientFactory.getEmployeeClient().getEmployeeById(id);
  }

  async addEmployee(
    name: string, 
    nip: string, 
    gol: string, 
    pangkat: string, 
    position: string, 
    subPosition: string, 
    organizationalLevel?: string
  ): Promise<number> {
    return apiClientFactory.getEmployeeClient().addEmployee(
      name, nip, gol, pangkat, position, subPosition, organizationalLevel
    );
  }

  async updateEmployee(
    id: number, 
    name: string, 
    nip: string, 
    gol: string, 
    pangkat: string, 
    position: string, 
    subPosition: string, 
    organizationalLevel?: string
  ): Promise<void> {
    return apiClientFactory.getEmployeeClient().updateEmployee(
      id, name, nip, gol, pangkat, position, subPosition, organizationalLevel
    );
  }

  async deleteEmployee(id: number): Promise<void> {
    return apiClientFactory.getEmployeeClient().deleteEmployee(id);
  }

  async bulkDeleteEmployees(ids: number[]): Promise<void> {
    return apiClientFactory.getEmployeeClient().bulkDeleteEmployees(ids);
  }

  async importEmployeesFromCSV(employees: Employee[]): Promise<string> {
    return apiClientFactory.getEmployeeClient().importEmployeesFromCSV(employees);
  }

  async getEmployeesCount(): Promise<number> {
    return apiClientFactory.getEmployeeClient().getEmployeesCount();
  }

  async getEmployeeOrgLevelMapping(): Promise<Record<string, string>> {
    return apiClientFactory.getEmployeeClient().getEmployeeOrgLevelMapping();
  }

  async getEmployeeSuggestions(name: string): Promise<EmployeeSuggestion[]> {
    return apiClientFactory.getEmployeeClient().getEmployeeSuggestions(name);
  }

  // Session operations (delegate to SessionApiClient)
  async saveEmployeeData(employees: Employee[], sessionName?: string): Promise<string> {
    return apiClientFactory.getSessionClient().saveEmployeeData(employees, sessionName);
  }

  async getAllUploadSessions(): Promise<UploadSession[]> {
    return apiClientFactory.getSessionClient().getAllUploadSessions();
  }

  async getEmployeeDataBySession(sessionId: string, signal?: AbortSignal): Promise<EmployeeWithSession[]> {
    return apiClientFactory.getSessionClient().getEmployeeDataBySession(sessionId, signal);
  }

  async deleteUploadSession(sessionId: string): Promise<void> {
    return apiClientFactory.getSessionClient().deleteUploadSession(sessionId);
  }

  // Data operations (delegate to DataApiClient)
  async getEmployeeDataByTimeRange(startTime?: string, endTime?: string): Promise<EmployeeWithSession[]> {
    return apiClientFactory.getDataClient().getEmployeeDataByTimeRange(startTime, endTime);
  }

  async getLatestEmployeeData(): Promise<EmployeeWithSession[]> {
    return apiClientFactory.getDataClient().getLatestEmployeeData();
  }

  // Leadership operations (delegate to LeadershipApiClient)
  async getManualLeadershipScores(): Promise<Record<string, number>> {
    return apiClientFactory.getLeadershipClient().getManualLeadershipScores();
  }

  async setManualLeadershipScore(employeeName: string, score: number): Promise<void> {
    return apiClientFactory.getLeadershipClient().setManualLeadershipScore(employeeName, score);
  }

  async bulkUpdateManualLeadershipScores(scores: Record<string, number>): Promise<void> {
    return apiClientFactory.getLeadershipClient().bulkUpdateManualLeadershipScores(scores);
  }
}

// Export singleton instance for backward compatibility
export const api = new LegacyApiService();
export type { UploadSession, EmployeeWithSession };
