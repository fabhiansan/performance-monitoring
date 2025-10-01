import React, { useState, useMemo, useCallback } from "react";
import { Employee } from "../../types";
import { simplifyOrganizationalLevel } from "../../utils/organizationalLevels";
import {
  NUMERIC_RATING_THRESHOLDS,
  getRatingLabel,
} from "../../constants/performanceRatings";

interface TableViewProps {
  employees: Employee[];
}

const filterEmployeesByTab = (
  employees: Employee[],
  tab: "all" | "eselon" | "staff",
  getOrgLevel: (_emp: Employee) => string,
) => {
  if (tab === "all") {
    return employees;
  }

  if (tab === "eselon") {
    return employees.filter((emp) => getOrgLevel(emp) === "Eselon");
  }

  return employees.filter((emp) => getOrgLevel(emp) === "Staff");
};

const filterEmployeesBySearchTerm = (
  employees: Employee[],
  searchTerm: string,
  getOrgLevel: (_emp: Employee) => string,
) => {
  if (!searchTerm) {
    return employees;
  }

  const query = searchTerm.toLowerCase();
  return employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(query) ||
      getOrgLevel(emp).toLowerCase().includes(query),
  );
};

const calculateAverageScore = (employee: Employee): number => {
  if (!employee.performance || employee.performance.length === 0) {
    return 0;
  }

  const totalScore = employee.performance.reduce(
    (sum, comp) => sum + comp.score,
    0,
  );
  return totalScore / employee.performance.length;
};

const getCompetencyValue = (
  employee: Employee,
  competencyName: string,
): number => {
  if (!employee.performance || employee.performance.length === 0) {
    return 0;
  }

  const competency = employee.performance.find(
    (comp) => comp.name === competencyName,
  );
  return competency ? competency.score : 0;
};

const getSortValue = (
  employee: Employee,
  sortColumn: string,
  getOrgLevel: (_emp: Employee) => string,
): string | number => {
  if (sortColumn === "name") {
    return employee.name;
  }

  if (sortColumn === "organizational_level") {
    return getOrgLevel(employee);
  }

  if (sortColumn === "average") {
    return calculateAverageScore(employee);
  }

  return getCompetencyValue(employee, sortColumn);
};

const compareEmployees = (
  a: Employee,
  b: Employee,
  sortColumn: string,
  sortDirection: "asc" | "desc",
  getOrgLevel: (_emp: Employee) => string,
) => {
  const aValue = getSortValue(a, sortColumn, getOrgLevel);
  const bValue = getSortValue(b, sortColumn, getOrgLevel);

  if (aValue === bValue) {
    return 0;
  }

  const result = aValue > bValue ? 1 : -1;
  return sortDirection === "asc" ? result : -result;
};

const TableView: React.FC<TableViewProps> = ({ employees }) => {
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "eselon" | "staff">("all");

  const getOrgLevel = useCallback((emp: Employee): string => {
    const raw = emp.organizational_level || emp.organizationalLevel || "";
    if (!raw) {
      return "Tidak Ada";
    }
    return simplifyOrganizationalLevel(raw, emp.gol);
  }, []);

  // Get competency names that have actual data for the current filter
  const competencyNames = useMemo(() => {
    const names = new Set<string>();

    // Filter employees by tab first
    let relevantEmployees = employees;
    if (activeTab === "eselon") {
      relevantEmployees = employees.filter(
        (emp) => getOrgLevel(emp) === "Eselon",
      );
    } else if (activeTab === "staff") {
      relevantEmployees = employees.filter(
        (emp) => getOrgLevel(emp) === "Staff",
      );
    }

    // Then filter by search term
    if (searchTerm) {
      relevantEmployees = relevantEmployees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getOrgLevel(emp).toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Collect competency names that have actual data
    relevantEmployees.forEach((emp) => {
      if (!emp.performance || emp.performance.length === 0) return;
      emp.performance.forEach((comp) => {
        // Only include competencies with actual scores > 0
        if (comp.score > 0) {
          names.add(comp.name);
        }
      });
    });

    return Array.from(names).sort();
  }, [employees, activeTab, searchTerm, getOrgLevel]);

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    const byTab = filterEmployeesByTab(employees, activeTab, getOrgLevel);
    const bySearch = filterEmployeesBySearchTerm(
      byTab,
      searchTerm,
      getOrgLevel,
    );
    const toSort = [...bySearch];
    return toSort.sort((a, b) =>
      compareEmployees(a, b, sortColumn, sortDirection, getOrgLevel),
    );
  }, [
    employees,
    searchTerm,
    sortColumn,
    sortDirection,
    activeTab,
    getOrgLevel,
  ]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getCompetencyScore = (
    employee: Employee,
    competencyName: string,
  ): number => {
    if (!employee.performance || employee.performance.length === 0) return 0;
    const comp = employee.performance.find((c) => c.name === competencyName);
    return comp ? comp.score : 0;
  };

  const getScoreColor = (score: number): string => {
    if (score >= NUMERIC_RATING_THRESHOLDS.EXCELLENT)
      return "text-green-800 dark:text-green-200"; // Sangat Baik
    if (score >= NUMERIC_RATING_THRESHOLDS.GOOD)
      return "text-orange-800 dark:text-orange-200"; // Baik
    if (score >= NUMERIC_RATING_THRESHOLDS.FAIR)
      return "text-red-800 dark:text-red-200"; // Kurang Baik
    return "text-purple-800 dark:text-purple-200"; // Perlu Perbaikan
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= NUMERIC_RATING_THRESHOLDS.EXCELLENT)
      return "bg-green-50 dark:bg-green-900/30"; // Sangat Baik
    if (score >= NUMERIC_RATING_THRESHOLDS.GOOD)
      return "bg-orange-50 dark:bg-orange-900/30"; // Baik
    if (score >= NUMERIC_RATING_THRESHOLDS.FAIR)
      return "bg-red-50 dark:bg-red-900/30"; // Kurang Baik
    return "bg-purple-50 dark:bg-purple-900/30"; // Perlu Perbaikan
  };

  const getScoreLabel = (score: number): string => {
    if (score >= NUMERIC_RATING_THRESHOLDS.FAIR) {
      return getRatingLabel(score);
    }
    return "Perlu Perbaikan";
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return (
        <svg
          className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortDirection === "asc" ? (
      <svg
        className="w-4 h-4 text-blue-600 transition-transform"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-blue-600 transition-transform"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Tidak ada data pegawai
        </p>
        <p className="text-gray-500 dark:text-gray-500 mt-2">
          Impor data CSV untuk menampilkan tabel
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Tabel Kinerja
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Tampilan rinci seluruh metrik kinerja pegawai
          </p>
          {/* Tab Navigation */}
          <div className="mt-4 flex space-x-2">
            {(["all", "eselon", "staff"] as const).map((tab) => {
              const label =
                tab === "all"
                  ? "Semua Pegawai"
                  : tab === "eselon"
                    ? "Eselon"
                    : "Staf";
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold focus:outline-none transition-all duration-200 ${
                    active
                      ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:shadow-md"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari pegawai..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    Nama Pegawai
                    <SortIcon column="name" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort("organizational_level")}
                >
                  <div className="flex items-center gap-2">
                    Jabatan
                    <SortIcon column="organizational_level" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort("average")}
                >
                  <div className="flex items-center gap-2">
                    Skor Rata-rata
                    <SortIcon column="average" />
                  </div>
                </th>
                {competencyNames.map((competency) => (
                  <th
                    key={competency}
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort(competency)}
                  >
                    <div className="flex items-center gap-2">
                      {competency}
                      <SortIcon column={competency} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedEmployees.map((employee, index) => {
                const averageScore = calculateAverageScore(employee);
                const orgLevel = getOrgLevel(employee);

                return (
                  <tr
                    key={employee.name}
                    className={
                      index % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-750"
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {employee.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="text-sm text-gray-700 dark:text-gray-300"
                        title={employee.organizational_level || undefined}
                      >
                        {orgLevel}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBgColor(averageScore)} ${getScoreColor(averageScore)}`}
                      >
                        {averageScore.toFixed(1)} ({getScoreLabel(averageScore)}
                        )
                      </div>
                    </td>
                    {competencyNames.map((competency) => {
                      const score = getCompetencyScore(employee, competency);
                      return (
                        <td
                          key={competency}
                          className="px-6 py-4 whitespace-nowrap"
                        >
                          <div
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBgColor(score)} ${getScoreColor(score)}`}
                          >
                            {score.toFixed(1)} ({getScoreLabel(score)})
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        Menampilkan {filteredAndSortedEmployees.length} dari {employees.length}{" "}
        pegawai
      </div>
    </div>
  );
};

export default TableView;
