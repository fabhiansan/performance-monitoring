/**
 * Advanced Export Dialog
 *
 * Provides export functionality with format selection and preview
 */

import React, { useState, useMemo } from "react";
import { Modal } from "../../design-system/components/Modal/Modal";
import { Button } from "../../design-system";
import { Employee } from "../../types";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  title?: string;
}

type ExportFormat = "csv" | "json" | "xlsx";

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  fileExtension: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  employees,
  title = "Ekspor Data",
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [includePerformanceData, setIncludePerformanceData] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);

  const formatOptions: FormatOption[] = [
    {
      id: "csv",
      name: "CSV",
      description:
        "Nilai dipisahkan koma, kompatibel dengan Excel dan Google Sheets",
      fileExtension: ".csv",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      id: "json",
      name: "JSON",
      description:
        "JavaScript Object Notation, ideal untuk API dan pemrosesan data",
      fileExtension: ".json",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      id: "xlsx",
      name: "Excel",
      description: "Format Microsoft Excel dengan pemformatan dan beberapa lembar",
      fileExtension: ".xlsx",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
          <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
        </svg>
      ),
    },
  ];

  const selectedFormatOption = formatOptions.find(
    (f) => f.id === selectedFormat,
  )!;

  // Generate preview data
  const previewData = useMemo(() => {
    if (employees.length === 0) return "";

    switch (selectedFormat) {
      case "csv": {
        const headers = ["Nama", "Level Organisasi"];
        if (includePerformanceData) {
          headers.push("Skor Rata-rata");
        }
        if (includeMetadata) {
          headers.push("ID Pegawai", "Unit");
        }

        const rows = [headers.join(",")];

        // Add sample rows (max 3)
        employees.slice(0, 3).forEach((emp) => {
          const row = [emp.name, emp.organizational_level || "Tidak Ada"];
          if (includePerformanceData) {
            const avg = emp.performance?.length
              ? (
                  emp.performance.reduce((sum, p) => sum + p.score, 0) /
                  emp.performance.length
                ).toFixed(2)
              : "0";
            row.push(avg);
          }
          if (includeMetadata) {
            row.push(emp.id?.toString() || "", emp.organizational_level || "");
          }
          rows.push(row.join(","));
        });

        return rows.join("\n") + "\n...";
      }

      case "json": {
        const data = employees.slice(0, 2).map((emp) => {
          const obj: Record<string, unknown> = {
            name: emp.name,
            organizational_level: emp.organizational_level,
          };

          if (includePerformanceData && emp.performance) {
            obj.performance = emp.performance;
            obj.average_score = emp.performance.length
              ? emp.performance.reduce((sum, p) => sum + p.score, 0) /
                emp.performance.length
              : 0;
          }

          if (includeMetadata) {
            obj.employee_id = emp.id;
            obj.metadata = { unit: emp.organizational_level };
          }

          return obj;
        });

        return JSON.stringify(data, null, 2) + "\n...";
      }

      case "xlsx":
        return `Sheet 1: Data Pegawai
Nama | Level Organisasi${includePerformanceData ? " | Skor Rata-rata" : ""}${includeMetadata ? " | ID Pegawai" : ""}
${employees
  .slice(0, 3)
  .map((emp) => {
    let row = `${emp.name} | ${emp.organizational_level || "Tidak Ada"}`;
    if (includePerformanceData) {
      const avg = emp.performance?.length
        ? (
            emp.performance.reduce((sum, p) => sum + p.score, 0) /
            emp.performance.length
          ).toFixed(2)
        : "0";
      row += ` | ${avg}`;
    }
    if (includeMetadata) {
      row += ` | ${emp.id || ""}`;
    }
    return row;
  })
  .join("\n")}
...`;

      default:
        return "";
    }
  }, [selectedFormat, employees, includePerformanceData, includeMetadata]);

  const handleExport = () => {
    // TODO: Implement actual export logic
    console.log("Mengekspor sebagai:", selectedFormat);
    console.log("Sertakan data kinerja:", includePerformanceData);
    console.log("Sertakan metadata:", includeMetadata);
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={title} size="2xl">
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Pilih Format Ekspor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {formatOptions.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  selectedFormat === format.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 ${
                      selectedFormat === format.id
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {format.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      {format.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {format.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Opsi Ekspor
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includePerformanceData}
                onChange={(e) => setIncludePerformanceData(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Sertakan Data Kinerja
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Ekspor skor kompetensi dan rata-ratanya
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Sertakan Metadata
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Ekspor ID pegawai, unit, dan informasi tambahan
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Pratinjau ({employees.length} pegawai)
          </h3>
          <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre">
              {previewData}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            File akan disimpan sebagai:{" "}
            <span className="font-mono font-semibold">
              export{selectedFormatOption.fileExtension}
            </span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleExport}>
              Ekspor Data
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
