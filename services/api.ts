import { Employee } from '../types';

interface Dataset {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  employee_count?: number;
  employees?: Employee[];
}

interface UserProfile {
  id: number;
  name: string;
  nip: string;
  gol: string;
  pangkat: string;
  position: string;
  sub_position: string;
  created_at: string;
  is_active: boolean;
}

class ApiService {
  private baseUrl = 'http://localhost:3001/api';

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }

  async getAllDatasets(): Promise<Dataset[]> {
    const response = await fetch(`${this.baseUrl}/datasets`);
    if (!response.ok) {
      throw new Error('Failed to get datasets');
    }
    return response.json();
  }

  async getDataset(id: string): Promise<Dataset | null> {
    const response = await fetch(`${this.baseUrl}/datasets/${id}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error('Failed to get dataset');
    }
    return response.json();
  }

  async saveDataset(name: string, employees: Employee[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, employees }),
    });

    if (!response.ok) {
      throw new Error('Failed to save dataset');
    }

    const result = await response.json();
    return result.id;
  }

  async deleteDataset(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/datasets/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete dataset');
    }
  }

  async getCurrentDataset(): Promise<Employee[]> {
    const response = await fetch(`${this.baseUrl}/current-dataset`);
    if (!response.ok) {
      throw new Error('Failed to get current dataset');
    }
    
    const result = await response.json();
    return result.employees || [];
  }

  async saveCurrentDataset(employees: Employee[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/current-dataset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employees }),
    });

    if (!response.ok) {
      throw new Error('Failed to save current dataset');
    }

    const result = await response.json();
    return result.id;
  }

  async clearCurrentDataset(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/current-dataset`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to clear current dataset');
    }
  }

  async updateEmployeeSummary(employeeName: string, summary: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/current-dataset/employee/${encodeURIComponent(employeeName)}/summary`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ summary }),
    });

    if (!response.ok) {
      throw new Error('Failed to update employee summary');
    }
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const response = await fetch(`${this.baseUrl}/user-profile`);
    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }
    return response.json();
  }

  async saveUserProfile(name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string): Promise<number> {
    const response = await fetch(`${this.baseUrl}/user-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, nip, gol, pangkat, position, subPosition }),
    });

    if (!response.ok) {
      throw new Error('Failed to save user profile');
    }

    const result = await response.json();
    return result.id;
  }

  async checkUserProfileExists(): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/user-profile/exists`);
    if (!response.ok) {
      throw new Error('Failed to check user profile');
    }
    const result = await response.json();
    return result.exists;
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

  async addEmployee(name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string): Promise<number> {
    const response = await fetch(`${this.baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, nip, gol, pangkat, position, subPosition }),
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

  async updateEmployee(id: number, name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, nip, gol, pangkat, position, subPosition }),
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
}

export const api = new ApiService();
export type { Dataset, UserProfile };