/// <reference types="vite/client" />
import { logger } from '../../logger';
import { EmployeeApiClient } from '../clients/EmployeeApiClient';
import { SessionApiClient } from '../clients/SessionApiClient';
import { DataApiClient } from '../clients/DataApiClient';
import { LeadershipApiClient } from '../clients/LeadershipApiClient';
import { ApiClientConfig } from './ApiInterfaces';

// Factory class for creating and managing API clients
export class ApiClientFactory {
  private config: ApiClientConfig;
  private employeeClient?: EmployeeApiClient;
  private sessionClient?: SessionApiClient;
  private dataClient?: DataApiClient;
  private leadershipClient?: LeadershipApiClient;

  constructor() {
    // Handle different environments: development (Vite), production (packaged), and fallback
    let apiBaseUrl = 'http://localhost:3002/api'; // Default fallback
    
    try {
      // In development with Vite, import.meta.env is available
      if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
        apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string;
      }
      // In packaged Electron app, check for process.env
      else if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
        apiBaseUrl = process.env.VITE_API_BASE_URL;
      }
    } catch (error) {
      // Silently fall back to default if import.meta is not available
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Using default API base URL due to environment detection error', { error: message });
    }
    
    this.config = {
      baseUrl: apiBaseUrl,
      useStandardizedFormat: true, // Enable standardized format by default
      timeout: 30000
    };
  }

  // Singleton pattern for each client type
  getEmployeeClient(): EmployeeApiClient {
    if (!this.employeeClient) {
      this.employeeClient = new EmployeeApiClient(this.config);
    }
    return this.employeeClient;
  }

  getSessionClient(): SessionApiClient {
    if (!this.sessionClient) {
      this.sessionClient = new SessionApiClient(this.config);
    }
    return this.sessionClient;
  }

  getDataClient(): DataApiClient {
    if (!this.dataClient) {
      this.dataClient = new DataApiClient(this.config);
    }
    return this.dataClient;
  }

  getLeadershipClient(): LeadershipApiClient {
    if (!this.leadershipClient) {
      this.leadershipClient = new LeadershipApiClient(this.config);
    }
    return this.leadershipClient;
  }

  // Method to update response format for all clients
  setResponseFormat(useStandardized: boolean): void {
    this.config.useStandardizedFormat = useStandardized;
    
    // Update existing clients
    this.employeeClient?.setResponseFormat(useStandardized);
    this.sessionClient?.setResponseFormat(useStandardized);
    this.dataClient?.setResponseFormat(useStandardized);
    this.leadershipClient?.setResponseFormat(useStandardized);
  }

  // Health check method (delegates to any client that has the method)
  async checkHealth(): Promise<boolean> {
    // Use employee client for health check since it's likely to be created first
    return this.getEmployeeClient().checkHealth();
  }
}

// Export singleton factory instance
export const apiClientFactory = new ApiClientFactory();

// Convenience exports for direct client access
export const employeeApi = apiClientFactory.getEmployeeClient();
export const sessionApi = apiClientFactory.getSessionClient();
export const dataApi = apiClientFactory.getDataClient();
export const leadershipApi = apiClientFactory.getLeadershipClient();

// Export all interfaces and types
export * from './ApiInterfaces';
