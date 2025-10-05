import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Employee } from "../../types";
import { parsePerformanceData } from "../../services/parser";
import {
  parseEmployeeCSV,
  validateEmployeeData,
} from "../../services/csvParser";
import {
  ValidationResult,
  getValidationSeverity,
} from "../../services/validationService";
import { useError } from "../../contexts/ErrorContext";
import ResolveEmployeesDialog from "../shared/ResolveEmployeesDialog";
import ValidationFeedback from "./ValidationFeedback";
import { api, UploadSession } from "../../services/api";
import {
  IconClipboardData,
  IconAnalyze,
  IconSparkles,
  IconUsers,
} from "../shared/Icons";
import { Alert, Button } from "../../design-system";
import { showErrorToast, showSuccessToast } from "../../services/toast";
import { simplifyOrganizationalLevel } from "../../utils/organizationalLevels";
import { queryKeys } from "../../hooks/useQueryClient";
import {
  detectDataType,
  extractEmployeeNamesFromData,
} from "../../services/ImportOrchestrator";

// Constants for repeated string literals
const CRITICAL_VALIDATION_ERROR_MESSAGE =
  "Terjadi kesalahan validasi data kritis. Perbaiki masalah tersebut sebelum melanjutkan.";

interface DataManagementProps {
  employees: Employee[];
  onDataUpdate: (_employees: Employee[], _sessionName?: string) => void;
  pendingSaves?: Set<string>;
  savingStatus?: "idle" | "saving" | "saved" | "error";
  selectedSessionId?: string;
}

const DataManagement: React.FC<DataManagementProps> = ({
  employees,
  onDataUpdate,
  pendingSaves = new Set(),
  savingStatus = "idle",
  selectedSessionId: _selectedSessionId,
}) => {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showError } = useError();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resolveModal, setResolveModal] = useState<{
    unknown: string[];
    orgMap: Record<string, string>;
  } | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [pendingPerformanceData, setPendingPerformanceData] = useState<
    Employee[] | null
  >(null);




  const handleProcessData = async () => {
    if (!rawText.trim()) {
      setError("Silakan tempel data pada area teks.");
      return;
    }
    setIsLoading(true);
    setError(null);

    setTimeout(async () => {
      try {
        // Detect data type first
        const dataType = detectDataType(rawText).type;

        if (dataType === "employee_roster") {
          // Handle employee roster data import

          try {
            const parsedResult = parseEmployeeCSV(rawText);
            const validation = validateEmployeeData(parsedResult.employees);

            if (!validation.valid) {
              setError(`Data tidak valid:\n${validation.errors.join("\n")}`);
              return;
            }

            // Import employee roster data to database (convert EmployeeData to Employee)
            await api.importEmployeesFromCSV(
              parsedResult.employees as unknown as Employee[],
            );

            // Invalidate React Query cache to trigger automatic refresh
            queryClient.invalidateQueries({
              queryKey: queryKeys.employees.all,
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.organizational.mappings,
            });

            // Show success message and guide user to next step
            setError(null);
            setRawText("");

            // Create a more informative success notification
            const successMessage = `✅ Berhasil mengimpor ${parsedResult.employees.length} data pegawai!\n\nData pegawai sekarang ditampilkan di dashboard. Untuk melihat analisis kinerja, silakan impor data kinerja yang berisi skor kompetensi dengan format: "Kompetensi [Nama Pegawai]".`;
            showSuccessToast(successMessage, 6000);

            return;
          } catch (err) {
            showError(err, {
              component: "DataManagement",
              operation: "importEmployeeRoster",
              dataType: "employee_roster",
            });
            showErrorToast("Gagal mengimpor data pegawai. Silakan coba lagi.");
            return;
          } finally {
            setIsLoading(false);
          }
        }

        // Handle performance data (existing logic)
        // Extract employee names from performance data
        const employeeNamesInData = extractEmployeeNamesFromData(rawText);

        // Fetch organizational level mapping from database
        let orgLevelMapping: { [key: string]: string } = {};
        try {
          orgLevelMapping = await api.getEmployeeOrgLevelMapping();

          if (Object.keys(orgLevelMapping).length === 0) {
            console.warn(
              "WARNING: No employee data found in employee_database table!",
            );
          }
        } catch (mappingError) {
          showError(mappingError, {
            component: "DataManagement",
            operation: "fetchOrgLevelMapping",
          });
        }

        // Helper function to normalize names for comparison
        const normalizeName = (name: string): string => {
          // List of common Indonesian academic titles and honorifics to strip out
          const stopWords = [
            "st",
            "sh",
            "se",
            "mm",
            "si",
            "sk",
            "sos",
            "ssos",
            "sap",
            "skep",
            "ners",
            "mi",
            "mps",
            "sp",
            "kom",
            "stp",
            "ap",
            "pd",
            "map",
            "msc",
            "ma",
            "mph",
            "dra",
            "dr",
            "ir",
            "amd",
          ];
          const titleRegex = new RegExp(`\\b(${stopWords.join("|")})\\b`, "g");

          return name
            .toLowerCase()
            .replace(/[.,\-_]/g, "") // Remove punctuation characters
            .replace(/\s+/g, " ") // Collapse multiple spaces first
            .replace(titleRegex, "") // Remove detected titles/qualifications
            .replace(/\s+/g, " ") // Collapse spaces again after removals
            .trim();
        };

        // Enhanced fuzzy matching with Levenshtein distance
        const calculateSimilarity = (str1: string, str2: string): number => {
          const longer = str1.length > str2.length ? str1 : str2;
          const shorter = str1.length > str2.length ? str2 : str1;

          if (longer.length === 0) return 1.0;

          const editDistance = levenshteinDistance(longer, shorter);
          return (longer.length - editDistance) / longer.length;
        };

        const levenshteinDistance = (str1: string, str2: string): number => {
          const matrix = [];
          for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
          }
          for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
              if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j - 1] + 1,
                  matrix[i][j - 1] + 1,
                  matrix[i - 1][j] + 1,
                );
              }
            }
          }
          return matrix[str2.length][str1.length];
        };

        // Create a normalized mapping for better matching
        const normalizedOrgMapping: { [key: string]: string } = {};
        const originalToNormalizedMap: { [key: string]: string } = {};

        Object.keys(orgLevelMapping).forEach((originalName) => {
          const normalized = normalizeName(originalName);
          normalizedOrgMapping[normalized] = orgLevelMapping[originalName];
          originalToNormalizedMap[normalized] = originalName;
        });

        // Check for unknown employees with enhanced fuzzy matching
        const unknownEmployees: string[] = [];
        const fuzzyMatchedEmployees: { [key: string]: string } = {};

        employeeNamesInData.forEach((name) => {
          const normalizedName = normalizeName(name);

          // Direct exact match
          if (orgLevelMapping[name]) {
            return;
          }

          // Normalized exact match
          if (normalizedOrgMapping[normalizedName]) {
            fuzzyMatchedEmployees[name] = normalizedOrgMapping[normalizedName];
            return;
          }

          // Enhanced fuzzy matching with similarity threshold
          let bestMatch = "";
          let bestSimilarity = 0;
          const SIMILARITY_THRESHOLD = 0.8; // 80% similarity required

          Object.keys(orgLevelMapping).forEach((dbName) => {
            const normalizedDbName = normalizeName(dbName);
            const similarity = calculateSimilarity(
              normalizedName,
              normalizedDbName,
            );

            if (
              similarity > bestSimilarity &&
              similarity >= SIMILARITY_THRESHOLD
            ) {
              bestSimilarity = similarity;
              bestMatch = dbName;
            }
          });

          if (bestMatch) {
            fuzzyMatchedEmployees[name] = orgLevelMapping[bestMatch];
            return;
          }

          // No match found
          unknownEmployees.push(name);
        });

        // Add fuzzy matches to the orgLevelMapping
        Object.entries(fuzzyMatchedEmployees).forEach(
          ([originalName, orgLevel]) => {
            orgLevelMapping[originalName] = orgLevel;
          },
        );

        if (unknownEmployees.length > 0) {
          setResolveModal({
            unknown: unknownEmployees,
            orgMap: orgLevelMapping as Record<string, string>,
          });
          setIsLoading(false);
          return;
        }

        // If still any unknown (should be none here), default them to Staff/Other
        unknownEmployees.forEach((name) => {
          orgLevelMapping[name] = "Staff/Other";
        });

        // Convert string mapping to EmployeeMapping format
        const employeeMapping: Record<string, { organizational_level?: string }> = {};
        Object.entries(orgLevelMapping).forEach(([name, level]) => {
          employeeMapping[name] = { organizational_level: level };
        });

        const parseResult = parsePerformanceData(
          rawText,
          undefined,
          employeeMapping,
        );
        const sortedData = parseResult.employees.sort((a, b) =>
          a.name.localeCompare(b.name),
        );

        // Store validation result for display
        setValidationResult(parseResult.validation);

        // Check if validation passed with acceptable quality
        const severity = getValidationSeverity(parseResult.validation);
        if (severity === "critical") {
          setError(CRITICAL_VALIDATION_ERROR_MESSAGE);
          return;
        }

        // Store performance data and show save dialog for user confirmation
        setPendingPerformanceData(sortedData);

        // Set default session name
        const now = new Date();
        const defaultName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setSessionName(defaultName);

        // Show save dialog
        setShowSaveDialog(true);
        setRawText("");
      } catch (e) {
        console.error("Parsing error details:", e);
        if (e instanceof Error) {
          let errorMessage = `Parsing error: ${e.message}`;

          // Provide specific guidance based on common error patterns
          if (e.message.includes("header row")) {
            errorMessage +=
              '\n\nTips:\n• Ensure the first row contains column headers\n• Headers should include employee names in brackets like: "Competency [Employee Name]"';
          } else if (e.message.includes("numeric scores")) {
            errorMessage +=
              "\n\nTips:\n• Ensure data rows contain numeric scores (10, 65, 75, etc.) or string ratings\n• Supported string ratings: 'Baik' (75), 'Sangat Baik' (85), 'Kurang Baik' (65)\n• Check for missing or invalid values in score columns";
          } else if (e.message.includes("format")) {
            errorMessage +=
              '\n\nSupported formats:\n• Standard CSV with quoted fields\n• Headers: "Competency [Employee Name]"\n• Multiple assessment rows per employee are supported';
          }

          setError(errorMessage);
        } else {
          setError(
            "Terjadi kesalahan tak dikenal saat memproses data. Periksa konsol untuk detail lebih lanjut.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    }, 50);
  };

  const handleResolveSubmit = async (
    mapping: Record<
      string,
      { chosenName: string; orgLevel: string; isNew: boolean }
    >,
  ) => {
    if (!resolveModal) return;

    // Check if there are new employees that need to be created
    const newEmployees = Object.entries(mapping).filter(
      ([, value]) => value.isNew,
    );

    if (newEmployees.length > 0) {
      try {
        // Create all new employees in database immediately with minimal data
        for (const [, value] of newEmployees) {
          await api.addEmployee(
            value.chosenName, // name
            "-", // nip (placeholder)
            "-", // gol (placeholder)
            "-", // pangkat (placeholder)
            "-", // position (placeholder)
            "-", // subPosition (placeholder)
            value.orgLevel, // organizational_level
          );
        }

        // Refresh org level mapping after creating new employees
        const updatedOrgMapping = await api.getEmployeeOrgLevelMapping();

        // Update the mapping with the database org levels
        for (const [orig] of Object.entries(mapping)) {
          resolveModal.orgMap[orig] =
            updatedOrgMapping[mapping[orig].chosenName] ||
            mapping[orig].orgLevel;
        }
      } catch (e) {
        console.error("Error creating new employees:", e);
        setError("Failed to create new employees in database.");
        return;
      }
    } else {
      // No new employees, just update the mapping
      for (const [orig, value] of Object.entries(mapping)) {
        resolveModal.orgMap[orig] = value.orgLevel;
      }
    }

    // Proceed with parsing immediately (no AddEmployeeForm modal)
    setResolveModal(null);
    setIsLoading(true);

    setTimeout(async () => {
      try {
        // Convert string mapping to EmployeeMapping format
        const employeeMapping: Record<string, { organizational_level?: string }> = {};
        Object.entries(resolveModal.orgMap).forEach(([name, level]) => {
          employeeMapping[name] = { organizational_level: level };
        });

        const parseResult = parsePerformanceData(
          rawText,
          undefined,
          employeeMapping,
        );
        const sorted = parseResult.employees.sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setValidationResult(parseResult.validation);

        const severity = getValidationSeverity(parseResult.validation);
        if (severity === "critical") {
          setError(CRITICAL_VALIDATION_ERROR_MESSAGE);
          return;
        }

        // Store performance data and show save dialog for user confirmation
        setPendingPerformanceData(sorted);

        // Set default session name
        const now = new Date();
        const defaultName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setSessionName(defaultName);

        // Show save dialog
        setShowSaveDialog(true);
        setRawText("");
      } catch (e) {
        console.error(e);
        setError("Failed after resolving employees.");
      } finally {
        setIsLoading(false);
      }
    }, 10);
  };

  const handleResolveCancel = () => {
    setResolveModal(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === "text/csv") {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const exportData = () => {
    if (employees.length === 0) return;

    // Check if there are pending saves and prevent export
    if (pendingSaves.size > 0 || savingStatus === "saving") {
      setError("Tunggu hingga proses penyimpanan selesai sebelum mengekspor.");
      return;
    }

    const csvData = employees.map((emp) => {
      const avgScore =
        emp.performance && emp.performance.length > 0
          ? emp.performance.reduce((s, p) => s + p.score, 0) /
            emp.performance.length
          : 0;
      return {
        Name: emp.name,
        Job: simplifyOrganizationalLevel(emp.organizational_level, emp.gol),
        "Average Score": avgScore.toFixed(2),
        ...(emp.performance && emp.performance.length > 0
          ? emp.performance.reduce(
              (acc, perf) => ({
                ...acc,
                [perf.name]: perf.score,
              }),
              {},
            )
          : {}),
      };
    });

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => `"${row[header as keyof typeof row]}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee-performance-data.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearData = () => {
    setRawText("");
    onDataUpdate([]);
    setError(null);
    setValidationResult(null);
  };

  const loadUploadSessions = useCallback(async () => {
    try {
      const sessions = await api.getAllUploadSessions();
      setUploadSessions(sessions);
    } catch (error) {
      showError(error, {
        component: "DataManagement",
        operation: "loadUploadSessions",
      });
    }
  }, [showError]);

  const saveCurrentSession = async () => {
    try {
      // Check if we have pending performance data (from import flow)
      if (pendingPerformanceData && pendingPerformanceData.length > 0) {
        // Save performance data to session
        const sessionId = await api.saveEmployeeData(
          pendingPerformanceData,
          sessionName,
        );

        // Invalidate React Query cache to trigger automatic refresh
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.detail(sessionId),
        });

        // Show success message
        showSuccessToast(
          `✅ Berhasil mengimpor data kinerja untuk ${pendingPerformanceData.length} pegawai!\n\nData kinerja sekarang tersedia di dashboard.`,
          6000,
        );

        // Clear pending data
        setPendingPerformanceData(null);
      } else if (employees.length > 0) {
        // Fallback: save current employees via onDataUpdate (legacy flow)
        await onDataUpdate(employees, sessionName);
      } else {
        return; // Nothing to save
      }

      // Close dialog and reset
      setShowSaveDialog(false);
      setSessionName("");
      await loadUploadSessions();
    } catch (error) {
      showError(error, {
        component: "DataManagement",
        operation: "saveCurrentSession",
        sessionName,
        employeeCount: pendingPerformanceData?.length || employees.length,
      });
      showErrorToast("Gagal menyimpan data. Silakan coba lagi.");
    }
  };

  // Helper to check if we can perform export operations
  const canExport = () => {
    return (
      employees.length > 0 &&
      pendingSaves.size === 0 &&
      savingStatus !== "saving"
    );
  };

  // Helper to get save status message
  const getSaveStatusMessage = () => {
    if (pendingSaves.size > 0 || savingStatus === "saving") {
      return "Saving data...";
    }
    if (savingStatus === "saved") {
      return "Data saved successfully!";
    }
    if (savingStatus === "error") {
      return "Gagal menyimpan. Silakan coba lagi.";
    }
    return null;
  };

  const loadSession = async (session: UploadSession) => {
    try {
      const employees = await api.getEmployeeDataBySession(session.session_id);
      if (employees) {
        onDataUpdate(employees);
      }
    } catch (_error) {
      setError("Failed to load session");
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await api.deleteUploadSession(sessionId);
      await loadUploadSessions();
    } catch (_error) {
      setError("Failed to delete session");
    }
  };

  const handleSessionSelection = (sessionId: string, checked: boolean) => {
    const newSelected = new Set(selectedSessions);
    if (checked) {
      newSelected.add(sessionId);
    } else {
      newSelected.delete(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const mergeSelectedSessions = async () => {
    if (selectedSessions.size < 2) {
      setError("Silakan pilih minimal 2 sesi untuk digabung");
      return;
    }

    try {
      setIsLoading(true);
      const allEmployees: Employee[] = [];

      // Fetch data from all selected sessions
      for (const sessionId of selectedSessions) {
        const employees = await api.getEmployeeDataBySession(sessionId);
        allEmployees.push(...employees);
      }

      // Remove duplicates based on employee name
      const uniqueEmployees = allEmployees.reduce((acc, current) => {
        const existing = acc.find((emp) => emp.name === current.name);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, [] as Employee[]);

      const mergedSessionName = `Merged ${selectedSessions.size} sessions - ${new Date().toLocaleString()}`;
      onDataUpdate(uniqueEmployees, mergedSessionName);
      setSelectedSessions(new Set());
      setShowMergeOptions(false);
      setError(null);
    } catch (_error) {
      setError("Failed to merge sessions");
    } finally {
      setIsLoading(false);
    }
  };

  const selectAllSessions = () => {
    const allIds = new Set(uploadSessions.map((s) => s.session_id));
    setSelectedSessions(allIds);
  };

  const clearSelection = () => {
    setSelectedSessions(new Set());
  };

  useEffect(() => {
    loadUploadSessions();
  }, [loadUploadSessions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Data Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import, export, and manage performance data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            <IconClipboardData className="w-8 h-8 mr-3 text-gray-500" />
            Import Data
          </h2>

          <div
            className={`border-2 border-dashed rounded-lg p-4 mb-4 transition-colors ${
              isDragOver
                ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center">
              <IconClipboardData className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                Drag & drop CSV file here or
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 ml-1"
                >
                  browse
                </button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste CSV data here...

Supported data types:

🏢 EMPLOYEE ROSTER DATA (Step 1):
- Headers: No., Nama, NIP, Gol, Pangkat, Jabatan, Sub-Jabatan
- Import this first to register employees in the system
- After import, you'll see employees in the dashboard without scores

📊 PERFORMANCE DATA (Step 2):
- Headers with employee names in brackets: 'Competency [Employee Name]'
- Data rows with numeric scores (10, 65, 75, etc.) or string ratings
- Supported string ratings: 'Baik' (75), 'Sangat Baik' (85), 'Kurang Baik' (65)
- Employee names must match those from Step 1
- Multiple assessment rows per employee supported

💡 TIPS:
- Import employee roster first, then performance data
- System auto-detects data type and processes accordingly
- Names in performance data should exactly match roster names"
            className="w-full h-60 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-mono mb-4"
          />

          <div className="flex gap-3">
            <Button
              onClick={handleProcessData}
              disabled={isLoading || !rawText.trim()}
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              leftIcon={
                !isLoading ? <IconAnalyze className="w-5 h-5" /> : undefined
              }
            >
              {isLoading ? "Processing..." : "Analyze Data"}
            </Button>

            <Button onClick={clearData} variant="outline" size="lg">
              Clear
            </Button>
          </div>

          {error && (
            <Alert
              variant="error"
              title="Error"
              className="mt-4"
              dismissible
              onDismiss={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {validationResult && (
            <ValidationFeedback
              validation={validationResult}
              className="mt-4"
            />
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            <IconSparkles className="w-8 h-8 mr-3 text-gray-500" />
            Current Dataset
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Employees
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employees.length}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Competencies
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employees.length > 0 && employees[0].performance
                    ? employees[0].performance.length
                    : 0}
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {employees.map((emp, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {emp.name}
                  </span>
                  <span
                    className="text-sm text-gray-600 dark:text-gray-400"
                    title={emp.organizational_level || undefined}
                  >
                    {simplifyOrganizationalLevel(
                      emp.organizational_level,
                      emp.gol,
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowSaveDialog(true)}
                disabled={employees.length === 0}
                variant="primary"
                size="md"
                fullWidth
              >
                Save Dataset
              </Button>

              <Button
                onClick={exportData}
                disabled={!canExport()}
                variant="success"
                size="md"
                fullWidth
                loading={pendingSaves.size > 0 || savingStatus === "saving"}
                title={
                  !canExport() && pendingSaves.size > 0
                    ? "Waiting for saves to complete..."
                    : "Export data as CSV"
                }
              >
                Export CSV
              </Button>

              <Button
                onClick={() => {
                  if (!canExport()) {
                    setError(
                      "Tunggu hingga proses penyimpanan selesai sebelum mengekspor.",
                    );
                    return;
                  }
                  const jsonData = JSON.stringify(employees, null, 2);
                  const blob = new Blob([jsonData], {
                    type: "application/json",
                  });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "employee-data.json";
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                disabled={!canExport()}
                variant="secondary"
                size="md"
                fullWidth
                loading={pendingSaves.size > 0 || savingStatus === "saving"}
                title={
                  !canExport() && pendingSaves.size > 0
                    ? "Waiting for saves to complete..."
                    : "Export data as JSON"
                }
              >
                Export JSON
              </Button>
            </div>
          </div>

          {/* Save Status Indicator */}
          {getSaveStatusMessage() && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                savingStatus === "saving"
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"
                  : savingStatus === "saved"
                    ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200"
                    : savingStatus === "error"
                      ? "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200"
                      : "bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200"
              }`}
            >
              <div className="flex items-center">
                {(pendingSaves.size > 0 || savingStatus === "saving") && (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {savingStatus === "saved" && (
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {savingStatus === "error" && (
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {getSaveStatusMessage()}
              </div>
            </div>
          )}
        </div>
      </div>

      {uploadSessions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200">
              <IconUsers className="w-8 h-8 mr-3 text-gray-500" />
              Saved Datasets
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMergeOptions(!showMergeOptions)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {showMergeOptions ? "Cancel" : "Merge Datasets"}
              </button>
            </div>
          </div>

          {showMergeOptions && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Select multiple sessions to merge them together. Selected:{" "}
                {selectedSessions.size}
              </p>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={selectAllSessions}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Clear
                </button>
                <button
                  onClick={mergeSelectedSessions}
                  disabled={
                    selectedSessions.size < 2 ||
                    isLoading ||
                    pendingSaves.size > 0 ||
                    savingStatus === "saving"
                  }
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    pendingSaves.size > 0 || savingStatus === "saving"
                      ? "Wait for saves to complete before merging"
                      : ""
                  }
                >
                  {isLoading
                    ? "Merging..."
                    : `Merge ${selectedSessions.size} Sessions`}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadSessions.map((session) => (
              <div
                key={session.session_id}
                className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border ${selectedSessions.has(session.session_id) ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {showMergeOptions && (
                      <input
                        type="checkbox"
                        checked={selectedSessions.has(session.session_id)}
                        onChange={(e) =>
                          handleSessionSelection(
                            session.session_id,
                            e.target.checked,
                          )
                        }
                        className="mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    )}
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {session.session_name}
                    </h3>
                  </div>
                  {!showMergeOptions && (
                    <button
                      onClick={() => deleteSession(session.session_id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Delete session"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {session.employee_count} employees
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                  {new Date(session.upload_timestamp).toLocaleDateString()}
                </p>
                {!showMergeOptions && (
                  <button
                    onClick={() => loadSession(session)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    Load Session
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Dataset Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Save Dataset
            </h3>
            <input
              type="month"
              placeholder="YYYY-MM e.g. 2025-10"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSessionName("");
                  setPendingPerformanceData(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentSession}
                disabled={!sessionName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {resolveModal && (
        <ResolveEmployeesDialog
          unknownEmployees={resolveModal.unknown}
          onSubmit={handleResolveSubmit}
          onCancel={handleResolveCancel}
        />
      )}
    </div>
  );
};

export default DataManagement;
