/**
 * Refactored App Component
 * Simplified with React Query - no manual data fetching or state management
 * Uses master employees with session-filtered performance data
 */

import React, { useState } from "react";
import { Toaster } from "react-hot-toast";
import { ErrorProvider, useError } from "./contexts/ErrorContext";
import ErrorDisplay from "./components/shared/ErrorDisplay";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import EmptyState from "./components/shared/EmptyState";
import Sidebar from "./components/layout/Sidebar";
import DashboardOverview from "./components/dashboard/DashboardOverview";
import EmployeeAnalytics from "./components/employees/EmployeeAnalytics";
import RekapKinerja from "./components/dashboard/RekapKinerja";
import DataManagementRefactored from "./components/data/DataManagementRefactored";
import TableView from "./components/dashboard/TableView";
import EmployeeManagement from "./components/employees/EmployeeManagement";
import Report from "./components/reporting/Report";
import { IconSparkles } from "./components/shared/Icons";
import { LAYOUT_SPACING } from "./constants/ui";
import { useEmployeesWithSessionData } from "./hooks/useEmployeeData";
import { useSessionManager } from "./hooks/useSessionData";
import { useOrganizationalMappings } from "./hooks/useEmployeeData";
import { useSaveEmployeeData } from "./hooks/useEmployeeData";
import { Employee } from "./types";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "./components/shared/KeyboardShortcutsDialog";

const VIEW_NAMES = {
  EMPLOYEE_MANAGEMENT: "employee-management",
  DATA: "data",
  OVERVIEW: "overview",
} as const;

const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState("overview");
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const { showError } = useError();

  // Use React Query hooks for data management
  const {
    sessions,
    activeSessionId,
    isLoading: sessionLoading,
    isSwitching,
    changeSession,
    error: sessionError,
  } = useSessionManager();

  // Get all employees with session-filtered performance data
  // This returns ALL master employees (161 total), with performance data filtered by active session
  const {
    data: employees = [],
    isLoading: employeesLoading,
    error: employeesError,
  } = useEmployeesWithSessionData(activeSessionId);

  const { data: orgMappings = {}, error: orgMappingsError } =
    useOrganizationalMappings();

  const saveEmployeeData = useSaveEmployeeData();

  // Display errors from React Query
  React.useEffect(() => {
    if (employeesError) {
      showError(employeesError, {
        component: "App",
        operation: "fetch employees with session data",
      });
    }
  }, [employeesError, showError]);

  React.useEffect(() => {
    if (orgMappingsError) {
      showError(orgMappingsError, {
        component: "App",
        operation: "fetch org mappings",
      });
    }
  }, [orgMappingsError, showError]);

  React.useEffect(() => {
    if (sessionError) {
      showError(sessionError, {
        component: "App",
        operation: "session management",
      });
    }
  }, [sessionError, showError]);

  // Unified data update handler
  const handleDataUpdate = async (
    newEmployeeData: Employee[],
    sessionName?: string,
  ) => {
    try {
      await saveEmployeeData.mutateAsync({
        employees: newEmployeeData,
        sessionName,
      });

      // Redirect to overview after saving session data
      if (
        sessionName &&
        sessionName.trim().length > 0 &&
        activeView === "data"
      ) {
        setActiveView("overview");
      }
    } catch (error) {
      showError(error, {
        component: "App",
        operation: "handleDataUpdate",
        dataLength: newEmployeeData.length,
        sessionName,
      });
    }
  };

  const handleDatasetChange = async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    try {
      await changeSession(sessionId);
    } catch (error) {
      showError(error, {
        component: "App",
        operation: "change session",
        sessionId,
      });
    }
  };

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: "o",
      description: "Buka Ringkasan",
      action: () => setActiveView("overview"),
    },
    {
      key: "a",
      description: "Buka Analitik",
      action: () => setActiveView("analytics"),
    },
    {
      key: "d",
      description: "Buka Manajemen Data",
      action: () => setActiveView("data"),
    },
    {
      key: "t",
      description: "Buka Tampilan Tabel",
      action: () => setActiveView("table"),
    },
    {
      key: "r",
      description: "Buka Laporan",
      action: () => setActiveView("report"),
    },
    {
      key: "e",
      description: "Buka Manajemen Pegawai",
      action: () => setActiveView("employee-management"),
    },
    {
      key: "?",
      shiftKey: true,
      description: "Tampilkan pintasan keyboard",
      action: () => setShowShortcutsDialog(true),
      preventDefault: true,
    },
    {
      key: "Escape",
      description: "Tutup dialog",
      action: () => setShowShortcutsDialog(false),
      preventDefault: false,
    },
  ];

  useKeyboardShortcuts({ shortcuts, enabled: true });

  // Loading state
  if (employeesLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <IconSparkles className="w-16 h-16 mx-auto text-blue-500 animate-pulse mb-4" />
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Memuat Dashboard Penilaian Kinerja Pegawai Dinas Sosial...
          </p>
        </div>
      </div>
    );
  }

  const hasEmployees = employees.length > 0;

  // Determine which empty state to show based on data availability
  const getEmptyStateConfig = (): {
    show: boolean;
    type: "no-employees" | "no-session-data" | "no-performance-data";
  } => {
    if (activeView === "overview") {
      if (!hasEmployees) {
        return { show: true, type: "no-employees" };
      }

      const hasPerformanceData = employees.some(
        (emp) => emp.performance && emp.performance.length > 0,
      );

      if (!hasPerformanceData) {
        return { show: true, type: "no-performance-data" };
      }
    }

    // Check if employees exist for other views
    if (activeView !== "overview" && !hasEmployees) {
      return { show: true, type: "no-employees" };
    }

    return { show: false, type: "no-employees" };
  };

  const renderActiveView = () => {
    // Get the current session name for display
    const currentSessionName = sessions.find(
      (s) => s.session_id === activeSessionId,
    )?.session_name;

    switch (activeView) {
      case "overview":
        return (
          <ErrorBoundary>
            <DashboardOverview
              employees={employees}
              organizationalMappings={orgMappings}
              onNavigateToDataManagement={() => setActiveView("data")}
              sessionName={currentSessionName}
            />
          </ErrorBoundary>
        );
      case "analytics":
      case "employees":
        return (
          <ErrorBoundary>
            <EmployeeAnalytics employees={employees} />
          </ErrorBoundary>
        );
      case "rekap-kinerja":
        return (
          <ErrorBoundary>
            <RekapKinerja employees={employees} />
          </ErrorBoundary>
        );
      case "report":
        return <Report employees={employees} />;
      case "table":
        return <TableView employees={employees} />;
      case VIEW_NAMES.EMPLOYEE_MANAGEMENT:
        return (
          <EmployeeManagement
            employees={employees}
            onEmployeeUpdate={async () => {
              // React Query will automatically refetch after mutations
              // No manual refresh needed
            }}
          />
        );
      case "data":
        return (
          <ErrorBoundary>
            <DataManagementRefactored
              employees={employees}
              onDataUpdate={handleDataUpdate}
            />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <DashboardOverview
              employees={employees}
              organizationalMappings={orgMappings}
              onNavigateToDataManagement={() => setActiveView("data")}
              sessionName={currentSessionName}
            />
          </ErrorBoundary>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <div className="flex h-screen">
        <Sidebar
          datasets={(
            sessions as Array<{ session_id: string; session_name: string }>
          ).map((s) => ({ id: s.session_id, name: s.session_name }))}
          selectedDatasetId={activeSessionId}
          onDatasetChange={handleDatasetChange}
          activeView={activeView}
          onViewChange={setActiveView}
          isDatasetSwitching={isSwitching}
        />

        <main className="flex-1 overflow-auto relative">
          {/* Dataset switching loading overlay */}
          {isSwitching && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-500"
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
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Mengganti Dataset
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Memuat data pegawai...
                </p>
              </div>
            </div>
          )}

          <div style={{ padding: LAYOUT_SPACING.PAGE_PADDING }}>
            <div style={{ marginBottom: LAYOUT_SPACING.COMPONENT_GAP }}>
              <ErrorDisplay />
            </div>
            {(() => {
              const emptyStateConfig = getEmptyStateConfig();

              // Don't show empty state on data management or employee management views
              if (
                activeView === VIEW_NAMES.DATA ||
                activeView === VIEW_NAMES.EMPLOYEE_MANAGEMENT
              ) {
                return renderActiveView();
              }

              if (emptyStateConfig.show) {
                return (
                  <EmptyState
                    type={emptyStateConfig.type}
                    onNavigateToManagement={() =>
                      setActiveView(VIEW_NAMES.EMPLOYEE_MANAGEMENT)
                    }
                    onNavigateToDataImport={() =>
                      setActiveView(VIEW_NAMES.DATA)
                    }
                  />
                );
              }

              return renderActiveView();
            })()}
          </div>
        </main>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={showShortcutsDialog}
        onClose={() => setShowShortcutsDialog(false)}
        shortcuts={shortcuts}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#111827",
            color: "#F9FAFB",
            fontWeight: 500,
          },
        }}
      />
    </ErrorProvider>
  );
};

export default App;
