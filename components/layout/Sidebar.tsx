import React, { useCallback } from "react";
import LogoIcon from "../../assets/icon.png";
import {
  IconDashboard,
  IconChartBar,
  IconUsers,
  IconCog,
  IconCalculator,
  IconDocument,
} from "../shared/Icons";
import { Button } from "../../design-system";
import { useImportState } from "../../hooks/useImportState";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../hooks/useQueryClient";
import { sessionApi } from "../../services/api";

// Constants for repeated string literals
const EMPLOYEE_MANAGEMENT_ID = "employee-management";

interface Dataset {
  id: string;
  name: string;
}

interface SidebarProps {
  datasets: Dataset[];
  selectedDatasetId: string;
  onDatasetChange: (_id: string) => void;
  activeView: string;
  onViewChange: (_view: string) => void;
  isDatasetSwitching?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  datasets,
  selectedDatasetId,
  onDatasetChange,
  activeView,
  onViewChange,
  isDatasetSwitching = false,
}) => {
  const { isImporting } = useImportState();
  const queryClient = useQueryClient();
  const isDisabled = isDatasetSwitching || isImporting; // ✅ Disable during import or switching

  const navigationItems = [
    { id: "overview", label: "Ringkasan", icon: IconDashboard },
    { id: EMPLOYEE_MANAGEMENT_ID, label: "Kelola Pegawai", icon: IconUsers },
    { id: "analytics", label: "Analitik", icon: IconChartBar },
    { id: "rekap-kinerja", label: "Rekap Kinerja", icon: IconCalculator },
    { id: "report", label: "Laporan", icon: IconDocument },
    { id: "data", label: "Data", icon: IconCog },
  ];

  // Prefetch session data on hover for faster navigation
  const handleSessionHover = useCallback(
    (sessionId: string) => {
      if (!sessionId || sessionId === selectedDatasetId) return;

      queryClient.prefetchQuery({
        queryKey: queryKeys.employees.session(sessionId),
        queryFn: ({ signal }) =>
          sessionApi.getEmployeeDataBySession(sessionId, signal),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },
    [queryClient, selectedDatasetId],
  );

  return (
    <div className="bg-white dark:bg-gray-900 h-full w-64 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors duration-200">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
        <img
          src={LogoIcon}
          alt="Logo"
          className="w-10 h-10 rounded-lg shadow-sm"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
            Dashboard Penilaian Kinerja
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Dinas Sosial
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <li key={item.id}>
                <Button
                  onClick={() => onViewChange(item.id)}
                  disabled={
                    isDisabled &&
                    item.id !== "data" &&
                    item.id !== EMPLOYEE_MANAGEMENT_ID
                  }
                  variant={isActive ? "primary" : "tertiary"}
                  size="md"
                  fullWidth
                  leftIcon={<Icon className="w-5 h-5" />}
                  className={`justify-start items-center ${
                    isDisabled &&
                    item.id !== "data" &&
                    item.id !== EMPLOYEE_MANAGEMENT_ID
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  } ${isActive ? "h-10" : "h-10"}`}
                  title={
                    isImporting &&
                    item.id !== "data" &&
                    item.id !== EMPLOYEE_MANAGEMENT_ID
                      ? "Tidak dapat berpindah tampilan saat proses impor"
                      : undefined
                  }
                >
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Dataset selector */}
      {datasets.length > 0 && (
        <div className="px-4 pb-4">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Dataset (Periode)
            {isDisabled && (
              <span className="ml-2 inline-flex items-center">
                <svg
                  className="animate-spin h-3 w-3 text-blue-500"
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
                <span className="text-xs text-blue-500 ml-1">
                  {isImporting ? "Mengimpor..." : "Memuat..."}
                </span>
              </span>
            )}
          </label>
          <select
            value={selectedDatasetId}
            onChange={(e) => onDatasetChange(e.target.value)}
            onMouseEnter={(e) => {
              const target = e.target as HTMLSelectElement;
              if (target.value !== selectedDatasetId) {
                handleSessionHover(target.value);
              }
            }}
            onFocus={(_e) => {
              // Prefetch data for all sessions when dropdown is focused
              datasets.forEach((ds) => {
                if (ds.id !== selectedDatasetId) {
                  handleSessionHover(ds.id);
                }
              });
            }}
            disabled={isDisabled}
            title={
              isImporting
                ? "Tidak dapat mengganti sesi saat proses impor"
                : undefined
            }
            className={`w-full text-sm px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-opacity duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-4 rounded-lg text-white">
          <h3 className="font-semibold text-sm">Employee Performance</h3>
          <p className="text-xs opacity-90 mt-1">Analytics Dashboard</p>
        </div>
      </div> */}
    </div>
  );
};

export default Sidebar;
