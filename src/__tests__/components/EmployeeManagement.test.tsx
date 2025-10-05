import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../test-utils";
import { server } from "../mocks/server";
import EmployeeManagement from "@/components/employees/EmployeeManagement";

const BASE_URL = "http://localhost:3002/api";

const baseEmployee = {
  id: 1,
  name: "Test Employee",
  nip: "123456789012345678",
  gol: "III/c",
  pangkat: "Penata",
  position: "Staff IT",
  sub_position: "Pelaksana",
  organizational_level: "Staff/Other",
  performance: [],
};

describe("EmployeeManagement component", () => {
   
  let confirmSpy: any;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it("renders employees and completes deletion workflow", async () => {
    const onEmployeeUpdate = vi.fn();

    server.use(
      http.delete(`${BASE_URL}/employees/1`, () =>
        HttpResponse.json({
          success: true,
          data: { message: "Employee deleted successfully" },
        }),
      ),
    );

    render(
      <EmployeeManagement employees={[baseEmployee]} onEmployeeUpdate={onEmployeeUpdate} />,
    );

    const deleteButton = await screen.findByRole("button", { name: /hapus/i });
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(onEmployeeUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it("surfaces an error message when deletion fails", async () => {
    const onEmployeeUpdate = vi.fn();

    server.use(
      http.delete(`${BASE_URL}/employees/1`, () =>
        HttpResponse.json(
          { success: false, error: "Unable to delete" },
          { status: 500 },
        ),
      ),
    );

    render(
      <EmployeeManagement employees={[baseEmployee]} onEmployeeUpdate={onEmployeeUpdate} />,
    );

    const deleteButton = await screen.findByRole("button", { name: /hapus/i });
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Gagal menghapus pegawai \"Test Employee\". Silakan coba lagi.",
        ),
      ).toBeInTheDocument();
    });
    expect(onEmployeeUpdate).not.toHaveBeenCalled();
  });

  it("filters employees based on the search term", async () => {
    render(
      <EmployeeManagement
        employees={[
          baseEmployee,
          { ...baseEmployee, id: 2, name: "Another Person" },
        ]}
      />,
    );

    expect(await screen.findByText("Test Employee")).toBeInTheDocument();
    expect(screen.getByText("Another Person")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/cari pegawai/i);
    await userEvent.type(searchInput, "Another");

    await waitFor(() => {
      expect(screen.queryByText("Test Employee")).not.toBeInTheDocument();
      expect(screen.getByText("Another Person")).toBeInTheDocument();
    });
  });
});
