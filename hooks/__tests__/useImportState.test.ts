import { describe, it, expect, beforeEach } from "vitest";
import { useImportState } from "../useImportState";

describe("useImportState store", () => {
  beforeEach(() => {
    useImportState.setState({ isImporting: false });
  });

  it("provides a default non-importing state", () => {
    expect(useImportState.getState().isImporting).toBe(false);
  });

  it("toggles importing state through the provided action", () => {
    const { setIsImporting } = useImportState.getState();
    setIsImporting(true);
    expect(useImportState.getState().isImporting).toBe(true);

    setIsImporting(false);
    expect(useImportState.getState().isImporting).toBe(false);
  });
});
