import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SessionApiClient } from "../SessionApiClient";
import { ApiClientConfig } from "../../interfaces/ApiInterfaces";

const config: ApiClientConfig = {
  baseUrl: "http://localhost:3002/api",
  useStandardizedFormat: true,
  timeout: 5_000,
};

const originalFetch = globalThis.fetch;

describe("SessionApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("normalizes period-based session payloads into UploadSession entries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            period: "2024-08",
            employee_count: 5,
            competency_count: 12,
            latest_upload: "2024-08-03T10:15:00.000Z",
          },
        ]),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new SessionApiClient(config);
    const sessions = await client.getAllUploadSessions();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/api/upload-sessions",
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(sessions).toEqual([
      {
        session_id: "2024-08",
        session_name: "08/2024",
        upload_timestamp: "2024-08-03T10:15:00.000Z",
        employee_count: 5,
        competency_count: 12,
      },
    ]);
  });

  it("returns UploadSession entries untouched when server already provides the shape", async () => {
    const payload = [
      {
        session_id: "2024-07",
        session_name: "07/2024",
        upload_timestamp: "2024-07-20T04:00:00.000Z",
        employee_count: 8,
        competency_count: 20,
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new SessionApiClient(config);
    const sessions = await client.getAllUploadSessions();

    expect(sessions).toEqual(payload);
  });

  it("extracts employees from standardized responses when fetching by session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            employees: [
              {
                id: 1,
                name: "Jane Doe",
                nip: "12345",
                gol: "III",
                pangkat: "Pembina",
                position: "Analis",
                sub_position: "Teknis",
                organizational_level: "Staff/Other",
                performance: [
                  {
                    name: "Integritas",
                    score: 85,
                  },
                ],
                sessionName: "08/2024",
              },
            ],
            sessionId: "2024-08",
            metadata: {
              totalEmployees: 1,
              employeesWithoutPerformanceData: 0,
            },
          },
          timestamp: "2024-08-03T10:15:00.000Z",
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new SessionApiClient(config);
    const employees = await client.getEmployeeDataBySession("2024-08");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/api/employee-data/session/2024-08",
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(employees).toEqual([
      expect.objectContaining({
        name: "Jane Doe",
        performance: [{ name: "Integritas", score: 85 }],
      }),
    ]);
  });
});
