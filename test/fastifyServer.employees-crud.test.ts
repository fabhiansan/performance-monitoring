import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import { FastifyServer } from "../server/fastifyServer";
import type { FastifyInstance } from "fastify";

const TEST_DB_PATH = path.join(__dirname, "test-fastify-crud.db");

describe("FastifyServer employee-centric routes", () => {
  let server: FastifyServer;
  let app: FastifyInstance;
  const injectJson = async <T>(options: {
    method: string;
    url: string;
    payload?: unknown;
  }): Promise<{ status: number; body: T; headers: Record<string, string> }> => {
    const response = await app.inject({
      method: options.method,
      url: options.url,
      payload: options.payload,
    });

    const contentType = response.headers["content-type"] ?? "";
    const body = contentType.includes("application/json")
      ? (response.json() as T)
      : (response.body as T);

    return {
      status: response.statusCode,
      body,
      headers: response.headers as Record<string, string>,
    };
  };

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    server = new FastifyServer({
      port: 0,
      host: "127.0.0.1",
      dbPath: TEST_DB_PATH,
      enableSwagger: false,
      enableCors: true,
      logLevel: "error",
      disableListen: true,
    });

    await server.start();
    app = server.getInstance();

  });

  afterEach(async () => {
    const db = server.getDatabase();
    const employees = await db.getAllEmployees();
    if (employees.length > 0) {
      const ids = employees
        .map((employee) => employee.id)
        .filter((id): id is number => typeof id === "number");
      if (ids.length > 0) {
        await db.bulkDeleteEmployees(ids);
      }
    }

    const sessions = await db.getAllUploadSessions();
    for (const session of sessions) {
      await db.deleteUploadSession(session.session_id);
    }

    await db.clearCurrentDataset();
  });

  afterAll(async () => {
    await server.stop();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  const createEmployee = async (override?: Partial<Record<string, unknown>>) => {
    const payload = {
      name: "Alice Example",
      position: "Analis Kebijakan",
      nip: "123456789012345678",
      gol: "III/c",
      pangkat: "Penata",
      sub_position: "Sub Bagian Evaluasi",
      organizational_level: "Staff/Other",
      ...override,
    };

    const response = await injectJson<{ data: { id: number } }>({
      method: "POST",
      url: "/api/employees",
      payload,
    });
    expect(response.status).toBe(201);
    const id = response.body?.data?.id;
    expect(typeof id).toBe("number");
    return { id: id as number, payload };
  };

  it("creates a new employee and returns the generated identifier", async () => {
    const response = await injectJson({
      method: "POST",
      url: "/api/employees",
      payload: {
        name: "Budi Santoso",
        position: "Staff IT",
        nip: "987654321012345678",
      },
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: expect.any(Number),
        name: "Budi Santoso",
        position: "Staff IT",
      },
      message: "Employee added successfully",
    });
  });

  it("rejects employee creation when the name field is missing", async () => {
    const response = await injectJson({
      method: "POST",
      url: "/api/employees",
      payload: { position: "Staff IT" },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: expect.stringContaining("name is required"),
    });
  });

  it("rejects employee updates that provide a non-numeric identifier", async () => {
    const response = await injectJson({
      method: "PUT",
      url: "/api/employees/not-a-number",
      payload: {
        name: "Invalid Update",
        position: "Staff IT",
      },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid employee ID");
  });

  it("updates an employee when valid data is provided", async () => {
    const { id } = await createEmployee();

    const updateResponse = await injectJson({
      method: "PUT",
      url: `/api/employees/${id}`,
      payload: {
        name: "Alice Updated",
        position: "Koordinator Lapangan",
        nip: "123456789012345678",
      },
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      success: true,
      message: "Employee updated successfully",
      data: {
        id,
        name: "Alice Updated",
      },
    });
  });

  it("deletes an employee and returns a confirmation payload", async () => {
    const { id } = await createEmployee();

    const deleteResponse = await injectJson({
      method: "DELETE",
      url: `/api/employees/${id}`,
    });

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toMatchObject({
      success: true,
      data: {
        message: "Employee deleted successfully",
      },
    });
  });

  it("validates the bulk delete endpoint payload", async () => {
    const response = await injectJson({
      method: "POST",
      url: "/api/employees/bulk/delete",
      payload: { ids: [] },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid or empty employee IDs array");
  });

  it("bulk deletes employees when given valid identifiers", async () => {
    const employeeA = await createEmployee({ name: "Bulk Employee A" });
    const employeeB = await createEmployee({ name: "Bulk Employee B" });

    const response = await injectJson({
      method: "POST",
      url: "/api/employees/bulk/delete",
      payload: { ids: [employeeA.id, employeeB.id] },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        deletedCount: 2,
        message: "Successfully deleted 2 employees",
      },
    });

    const followUp = await injectJson<{ success: boolean; data: unknown[] }>({
      method: "GET",
      url: "/api/employees",
    });
    expect(followUp.status).toBe(200);
    expect(followUp.body.data).toEqual([]);
  });

  it("ensures employee count endpoint reflects newly created records", async () => {
    const before = await injectJson<{ data: { count: number } }>({
      method: "GET",
      url: "/api/employees-count",
    });
    expect(before.status).toBe(200);
    const startingCount = before.body?.data?.count ?? 0;

    await createEmployee({ name: "Counted Employee" });

    const after = await injectJson<{ data: { count: number } }>({
      method: "GET",
      url: "/api/employees-count",
    });
    expect(after.status).toBe(200);
    expect(after.body.data.count).toBe(startingCount + 1);
  });

  it("returns a validation error when resolve endpoint receives invalid mappings", async () => {
    const response = await injectJson({
      method: "POST",
      url: "/api/employees/resolve",
      payload: { mappings: "invalid", sessionId: "abc" },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid mappings: must be an object");
  });

  it("returns a validation error when bulk leadership score payload contains invalid scores", async () => {
    await injectJson({
      method: "POST",
      url: "/api/current-dataset",
      payload: {
        employees: [
          {
            name: "Leadership Candidate",
            nip: "111222333444555666",
            gol: "III/a",
            pangkat: "Penata",
            position: "Staff",
            sub_position: "Pelaksana",
            organizational_level: "Staff/Other",
            performance: [],
          },
        ],
      },
    });

    const response = await injectJson({
      method: "PUT",
      url: "/api/current-dataset/leadership-scores/bulk",
      payload: { scores: { "Jane Doe": 150 } },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("must be a number between 0 and 100");
  });

  it("requires summary content when updating employee summaries", async () => {
    const response = await injectJson({
      method: "PATCH",
      url: "/api/current-dataset/employee/Jane%20Doe/summary",
      payload: { summary: "" },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Summary is required");
  });

  it("returns the latest employee data after a session upload", async () => {
    await injectJson({
      method: "POST",
      url: "/api/employee-data",
      payload: {
        employees: [
          {
            name: "Latest Employee",
            nip: "123456789012345678",
            gol: "III/b",
            pangkat: "Penata",
            position: "Staff",
            sub_position: "Pelaksana",
            organizational_level: "Staff/Other",
            performance: [],
          },
        ],
        sessionName: "September 2024",
      },
    });

    const response = await injectJson({
      method: "GET",
      url: "/api/employee-data/latest",
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        employees: expect.any(Array),
        metadata: {
          totalEmployees: expect.any(Number),
        },
      },
    });
  });

  it("supports retrieving employee data within a time range", async () => {
    const response = await injectJson({
      method: "GET",
      url: "/api/employee-data/range",
      payload: undefined,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        employees: expect.any(Array),
        metadata: {
          sessionsFound: expect.any(Number),
        },
      },
    });
  });

  it("filters employee data by provided time range", async () => {
    const response = await injectJson({
      method: "GET",
      url: "/api/employee-data/range?startTime=" +
        encodeURIComponent(new Date(Date.now() - 86_400_000).toISOString()),
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        employees: expect.any(Array),
        metadata: {
          sessionsFound: expect.any(Number),
        },
      },
    });
  });
});
