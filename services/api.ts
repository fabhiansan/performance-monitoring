/// <reference types="vite/client" />
import { Employee } from '../types';


interface UploadSession {
  session_id: string;
  session_name: string;
  upload_timestamp: string;
  employee_count: number;
  competency_count: number;
}

interface EmployeeWithSession extends Employee {
  uploadSession?: string;
  uploadTimestamp?: string;
  sessionName?: string;
}


class ApiService {
  private baseUrl: string;

  constructor() {
    // Prefer environment variable if provided; fallback to localhost
    // This ensures packaged desktop app still communicates with the bundled backend
    this.baseUrl = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3002/api';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }


  async getAllEmployees(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/employees`);
    if (!response.ok) {
      throw new Error('Failed to get employees');
    }
    return response.json();
  }

  async getEmployeeById(id: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/employees/${id}`);
    if (!response.ok) {
      throw new Error('Failed to get employee');
    }
    return response.json();
  }

  // Add employee with full fields
  async addEmployee(name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string, organizationalLevel?: string): Promise<number> {

    const response = await fetch(`${this.baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, nip, gol, pangkat, position, subPosition, organizationalLevel }),
    });

    if (!response.ok) {
      throw new Error('Failed to add employee');
    }

    const result = await response.json();
    return result.id;
  }

  async importEmployeesFromCSV(employees: any[]): Promise<number> {
    const response = await fetch(`${this.baseUrl}/employees/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employees }),
    });

    if (!response.ok) {
      throw new Error('Failed to import employees');
    }

    const result = await response.json();
    return result.count;
  }

  async updateEmployee(id: number, name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string, organizationalLevel?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, nip, gol, pangkat, position, subPosition, organizationalLevel }),
    });

    if (!response.ok) {
      throw new Error('Failed to update employee');
    }
  }

  async deleteEmployee(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/employees/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete employee');
    }
  }

  async getEmployeesCount(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/employees-count`);
    if (!response.ok) {
      throw new Error('Failed to get employees count');
    }
    const result = await response.json();
    return result.count;
  }

  async getEmployeeOrgLevelMapping(): Promise<Record<string, string>> {
    const response = await fetch(`${this.baseUrl}/employees/org-level-mapping`);
    if (!response.ok) {
      throw new Error('Failed to get organizational level mapping');
    }
    return response.json();
  }

  async getEmployeeSuggestions(name: string): Promise<{name: string; organizational_level: string; similarity: number}[]> {
    const response = await fetch(`${this.baseUrl}/employees/suggestions?name=${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error('Failed to get employee suggestions');
    }
    return response.json();
  }

  // Manual Leadership Scores Methods

  async getManualLeadershipScores(): Promise<Record<string, number>> {
    const response = await fetch(`${this.baseUrl}/current-dataset/leadership-scores`);
    if (!response.ok) {
      throw new Error('Failed to get leadership scores');
    }
    return response.json();
  }

  async setManualLeadershipScore(employeeName: string, score: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/current-dataset/leadership-scores/${encodeURIComponent(employeeName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score }),
    });

    if (!response.ok) {
      throw new Error('Failed to set leadership score');
    }
  }

  async bulkUpdateManualLeadershipScores(scores: Record<string, number>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/current-dataset/leadership-scores`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scores }),
    });

    if (!response.ok) {
      throw new Error('Failed to update leadership scores');
    }
  }

  // NEW UNIFIED TIMESTAMP-BASED METHODS

  async saveEmployeeData(employees: Employee[], sessionName?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/employee-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employees, sessionName }),
    });

    if (!response.ok) {
      throw new Error('Failed to save employee data');
    }

    const result = await response.json();
    return result.sessionId;
  }

  async getAllUploadSessions(): Promise<UploadSession[]> {
    const response = await fetch(`${this.baseUrl}/upload-sessions`);
    if (!response.ok) {
      throw new Error('Failed to get upload sessions');
    }
    return response.json();
  }

  async getEmployeeDataBySession(sessionId: string): Promise<EmployeeWithSession[]> {
    const response = await fetch(`${this.baseUrl}/employee-data/session/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to get employee data by session');
    }
    const result = await response.json();
    return result.employees || [];
  }

  async getEmployeeDataByTimeRange(startTime?: string, endTime?: string): Promise<EmployeeWithSession[]> {
    let url = `${this.baseUrl}/employee-data/range`;
    const params = new URLSearchParams();
    
    if (startTime) params.append('startTime', startTime);
    if (endTime) params.append('endTime', endTime);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to get employee data by time range');
    }
    return response.json();
  }

  async getLatestEmployeeData(): Promise<EmployeeWithSession[]> {
    const response = await fetch(`${this.baseUrl}/employee-data/latest`);
    if (!response.ok) {
      throw new Error('Failed to get latest employee data');
    }
    return response.json();
  }

  async deleteUploadSession(sessionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/upload-sessions/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete upload session');
    }
  }

}

export const api = new ApiService();
export type { UploadSession, EmployeeWithSession };