import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../test-utils";
import { server } from "../mocks/server";
import ResolveEmployeesDialog from "@/components/shared/ResolveEmployeesDialog";

const BASE_URL = "http://localhost:3002/api";

describe("ResolveEmployeesDialog", () => {
  it("auto-selects exact matches from suggestions and submits mapping", async () => {
    server.use(
      http.get(`${BASE_URL}/employees/suggestions`, ({ request }) => {
        const url = new URL(request.url);
        const name = url.searchParams.get("name");
        return HttpResponse.json([
          {
            id: 1,
            name,
            organizational_level: "Eselon II",
          },
        ]);
      }),
    );

    const handleSubmit = vi.fn();

    render(
      <ResolveEmployeesDialog
        unknownEmployees={["Jane Doe"]}
        onSubmit={handleSubmit}
        onCancel={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/memuat saran/i)).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        "Jane Doe": {
          chosenName: "Jane Doe",
          orgLevel: "Eselon",
          isNew: false,
        },
      });
    });
  });

  it("falls back to new employee mapping when suggestions fail", async () => {
    server.use(
      http.get(`${BASE_URL}/employees/suggestions`, () =>
        HttpResponse.json({ message: "server error" }, { status: 500 }),
      ),
    );

    const handleSubmit = vi.fn();

    render(
      <ResolveEmployeesDialog
        unknownEmployees={["Unknown Person"]}
        onSubmit={handleSubmit}
        onCancel={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/memuat saran/i)).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        "Unknown Person": {
          chosenName: "Unknown Person",
          orgLevel: "Staff",
          isNew: true,
        },
      });
    });
  });
});
