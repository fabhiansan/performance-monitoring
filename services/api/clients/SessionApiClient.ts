import { Employee } from "../../../types";
import {
  createValidationError,
  createServerError,
  AppError,
} from "../../errorHandler";
import { logger } from "../../logger";
import { BaseApiClient } from "../core/ApiClient";
import {
  UploadSession,
  EmployeeWithSession,
  SessionSaveResponse,
  EmployeeDataResponse,
  ApiClientConfig,
  API_OPERATIONS,
  ERROR_MESSAGES,
} from "../interfaces/ApiInterfaces";

// Constants for repeated strings
const SESSION_ID_REQUIRED = "Session ID is required";

export class SessionApiClient extends BaseApiClient {
  constructor(config: ApiClientConfig) {
    super(config);
  }

  async saveEmployeeData(
    employees: Employee[],
    sessionName?: string,
  ): Promise<string> {
    // Validate input data
    if (!employees || !Array.isArray(employees)) {
      throw createValidationError("Invalid employees data: must be an array", {
        operation: "uploadEmployeeData",
      });
    }

    if (employees.length === 0) {
      throw createValidationError("Cannot save empty employee data", {
        operation: "uploadEmployeeData",
      });
    }

    // Validate employee data structure before sending
    const validatedEmployees = employees.map((emp, index) => {
      if (!emp.name || emp.name.trim() === "") {
        throw createValidationError(
          `Employee at index ${index} is missing a name`,
          { operation: "uploadEmployeeData" },
        );
      }

      // Ensure performance data is properly formatted
      const performance = emp.performance || [];
      if (!Array.isArray(performance)) {
        logger.warn(
          "Invalid performance data for employee, converting to array",
          { employeeName: emp.name },
        );
      }

      return {
        ...emp,
        performance: Array.isArray(performance) ? performance : [],
      };
    });

    const result = await this.post<SessionSaveResponse>(
      "/employee-data",
      {
        employees: validatedEmployees,
        sessionName,
      },
      {
        operation: "saveEmployeeData",
      },
    );

    if (!result.sessionId) {
      throw createServerError("Server did not return a session ID", {
        operation: "uploadEmployeeData",
      });
    }

    logger.api(`Saved employees to session`, {
      employeeCount: validatedEmployees.length,
      sessionId: result.sessionId,
    });
    return result.sessionId;
  }

  async getAllUploadSessions(signal?: AbortSignal): Promise<UploadSession[]> {
    return this.get<UploadSession[]>("/upload-sessions", {
      operation: "getAllUploadSessions",
      signal,
    });
  }

  async getEmployeeDataBySession(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<EmployeeWithSession[]> {
    if (!sessionId || sessionId.trim() === "") {
      throw createValidationError(SESSION_ID_REQUIRED, {
        operation: "getEmployeeDataBySession",
      });
    }

    const result = await this.get<EmployeeDataResponse>(
      `/employee-data/session/${encodeURIComponent(sessionId)}`,
      {
        operation: "getEmployeeDataBySession",
        signal,
      },
    );

    // Validate the response structure
    if (!result || !Array.isArray(result.employees)) {
      throw createServerError(ERROR_MESSAGES.INVALID_RESPONSE_FORMAT, {
        operation: API_OPERATIONS.GET_EMPLOYEE_DATA_BY_SESSION,
      });
    }

    // Validate employee data structure and performance data
    const employees = result.employees.map((emp: EmployeeWithSession) => {
      // Ensure performance data is properly structured
      if (emp.performance && !Array.isArray(emp.performance)) {
        logger.warn(
          "Invalid performance data for employee, converting to empty array",
          { employeeName: emp.name },
        );
        emp.performance = [];
      }

      // Ensure required fields exist and map to correct property names
      return {
        id: emp.id || 0,
        name: emp.name || "",
        nip: emp.nip || "",
        gol: emp.gol || "",
        pangkat: emp.pangkat || "",
        position: emp.position || "",
        sub_position: emp.sub_position || "",
        organizational_level: emp.organizational_level || "",
        performance: emp.performance || [],
        ...(emp.created_at ? { created_at: emp.created_at } : {}),
        ...(emp.uploadSession ? { uploadSession: emp.uploadSession } : {}),
        ...(emp.uploadTimestamp
          ? { uploadTimestamp: emp.uploadTimestamp }
          : {}),
        ...(emp.sessionName ? { sessionName: emp.sessionName } : {}),
      };
    });

    // Only surface logs when they highlight performance gaps
    if (result.metadata) {
      const { employeesWithoutPerformanceData } = result.metadata;

      if (
        typeof employeesWithoutPerformanceData === "number" &&
        employeesWithoutPerformanceData > 0
      ) {
        logger.warn("Employees loaded without performance data", {
          count: employeesWithoutPerformanceData,
        });
      }
    }

    return employees;
  }

  async deleteUploadSession(sessionId: string): Promise<void> {
    if (!sessionId || sessionId.trim() === "") {
      throw createValidationError(SESSION_ID_REQUIRED, {
        operation: "deleteUploadSession",
      });
    }

    await this.delete<void>(`/upload-sessions/${sessionId}`, {
      operation: "deleteUploadSession",
    });
  }

  private isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    // Check direct status property
    if ("status" in error && (error as { status: number }).status === 404) {
      return true;
    }

    // Check AppError with nested status
    if (error instanceof AppError) {
      const additionalData = error.context?.additionalData;
      if (
        additionalData &&
        typeof additionalData === "object" &&
        "status" in additionalData
      ) {
        const status = (additionalData as { status?: number }).status;
        return status === 404;
      }
    }

    return false;
  }

  async getCurrentSession(
    signal?: AbortSignal,
  ): Promise<{ session_id: string } | null> {
    try {
      return await this.get<{ session_id: string }>("/current-session", {
        operation: "getCurrentSession",
        signal,
      });
    } catch (error) {
      // If no current session exists, return null instead of throwing
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async setCurrentSession(sessionId: string): Promise<void> {
    if (!sessionId || sessionId.trim() === "") {
      throw createValidationError(SESSION_ID_REQUIRED, {
        operation: "setCurrentSession",
      });
    }

    await this.post<void>(
      "/current-session",
      {
        sessionId,
      },
      {
        operation: "setCurrentSession",
      },
    );
  }
}
