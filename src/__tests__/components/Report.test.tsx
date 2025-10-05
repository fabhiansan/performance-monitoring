import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../test-utils";
import Report from "@/components/reporting/Report";
import { ReportGenerationService } from "@/services/reportGenerationService";
import { errorHandler } from "@/services/errorHandler";

const mockEmployees = [
  {
    name: "Test Employee",
    nip: "123456789012345678",
    gol: "III/c",
    pangkat: "Penata",
    position: "Staff",
    sub_position: "Pelaksana",
    organizational_level: "Staff/Other",
    performance: [
      { name: "Integritas", score: 85 },
      { name: "Kerja Sama", score: 90 },
      { name: "Komunikasi", score: 88 },
      { name: "Disiplin", score: 92 },
      { name: "Tanggung Jawab", score: 87 },
      { name: "Kualitas Kerja", score: 80 },
    ],
  },
];

describe("Report component", () => {
   
  let generateSpy: any;

  beforeEach(() => {
    generateSpy = vi
      .spyOn(ReportGenerationService, "generatePDF")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    generateSpy.mockRestore();
  });

  it("calls the report generation service for the selected employee", async () => {
    render(<Report employees={mockEmployees} />);

    const [employeeSelect] = screen.getAllByRole("combobox");
    await userEvent.selectOptions(employeeSelect, "Test Employee");

    const downloadButton = screen.getByRole("button", { name: /unduh pdf/i });
    await userEvent.click(downloadButton);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledTimes(1);
    });

    const [_element, options] = generateSpy.mock.calls[0];
    expect(options).toMatchObject({
      employee: expect.objectContaining({ name: "Test Employee" }),
      semester: expect.any(Number),
      year: expect.any(Number),
    });
  });

  it("routes generation errors through the global error handler", async () => {
    generateSpy.mockRejectedValueOnce(new Error("PDF failure"));
    const errorSpy = vi.spyOn(errorHandler, "handleError");

    render(<Report employees={mockEmployees} />);

    const [employeeSelect] = screen.getAllByRole("combobox");
    await userEvent.selectOptions(employeeSelect, "Test Employee");

    const downloadButton = screen.getByRole("button", { name: /unduh pdf/i });
    await userEvent.click(downloadButton);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });

    expect(downloadButton).not.toBeDisabled();
    errorSpy.mockRestore();
  });
});
