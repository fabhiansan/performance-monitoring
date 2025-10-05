import React, { useMemo } from "react";
import { Employee } from "../../types";
import { Button, Card, Tooltip as DsTooltip } from "../../design-system";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import {
  useDashboardCalculations,
  calculateEmployeeAverageScore,
} from "../../hooks/useDashboardCalculations";
import { useDashboardFilters } from "../../hooks/useDashboardFilters";
import {
  IconSparkles,
  IconUsers,
  IconClipboardData,
  IconAnalyze,
} from "../shared/Icons";
import PerformanceTrendChart from "./charts/PerformanceTrendChart";
import CompetencyRadarChart from "./charts/CompetencyRadarChart";
import EmployeeDistributionDonut from "./charts/EmployeeDistributionDonut";
import CompetencyHeatMap from "./charts/CompetencyHeatMap";
import ProgressGaugeCluster from "./charts/ProgressGaugeCluster";

interface DashboardOverviewProps {
  employees: Employee[];
  organizationalMappings?: Record<string, string>;
  onNavigateToDataManagement?: () => void;
  sessionName?: string; // Add session name prop
}

type StatusTone = "success" | "warning" | "critical";

const STATUS_STYLES: Record<
  StatusTone,
  {
    text: string;
    bg: string;
    border: string;
    iconBg: string;
    iconText: string;
    bar: string;
  }
> = {
  success: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-700",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/60",
    iconText: "text-emerald-600 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  warning: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-700",
    iconBg: "bg-amber-100 dark:bg-amber-900/60",
    iconText: "text-amber-600 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  critical: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/30",
    border: "border-rose-200 dark:border-rose-700",
    iconBg: "bg-rose-100 dark:bg-rose-900/60",
    iconText: "text-rose-600 dark:text-rose-300",
    bar: "bg-rose-500",
  },
};

const TONE_HEX: Record<StatusTone, string> = {
  success: "#059669",
  warning: "#d97706",
  critical: "#dc2626",
};

const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("id-ID", options).format(
    Number.isFinite(value) ? value : 0,
  );


const InfoBadge: React.FC<{ ariaLabel: string; description: string }> = ({
  ariaLabel,
  description,
}) => (
  <DsTooltip content={description} position="top">
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      aria-label={ariaLabel}
    >
      <span className="text-xs font-semibold">i</span>
    </button>
  </DsTooltip>
);

interface SummaryMetric {
  id: string;
  title: string;
  displayValue: string;
  unit?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: StatusTone;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  employees,
  onNavigateToDataManagement,
  sessionName,
}) => {
  const { filterState, filterActions, uniqueLevels, filteredEmployees } =
    useDashboardFilters(employees);
  const { searchTerm, levelFilter, showFilters } = filterState;
  const { setSearchTerm, setLevelFilter, setShowFilters, resetFilters } =
    filterActions;

  const {
    kpiData,
    competencyData,
    employeesByLevel,
    organizationalSummary,
    scoreRanges,
  } = useDashboardCalculations(filteredEmployees);

  const employeesWithPerformance = useMemo(
    () =>
      filteredEmployees.filter(
        (emp) => emp.performance && emp.performance.length > 0,
      ),
    [filteredEmployees],
  );

  const coveragePercent = useMemo(() => {
    if (filteredEmployees.length === 0) return 0;
    return (employeesWithPerformance.length / filteredEmployees.length) * 100;
  }, [filteredEmployees, employeesWithPerformance]);

  const coverageRounded = Number(coveragePercent.toFixed(1));
  const coverageTone: StatusTone =
    coverageRounded >= 95
      ? "success"
      : coverageRounded >= 75
        ? "warning"
        : "critical";

  const averageScore = Number(kpiData.averageScore.toFixed(1));

  const datasetMetadata = useMemo(() => {
    // Use the session name from props if available, otherwise fall back to extraction
    const periodLabel = sessionName || "Periode data tidak tersedia";
    const datasetLabel = sessionName || "Dataset induk";

    return { periodLabel, datasetLabel };
  }, [sessionName]);

  const summaryMetrics = useMemo<SummaryMetric[]>(() => {
    const topPerformerName = kpiData.topPerformer
      ? kpiData.topPerformer.name
      : null;
    const topPerformerScore = kpiData.topPerformerScore ?? null;
    const topPerformerTone: StatusTone | undefined =
      topPerformerScore === null
        ? undefined
        : topPerformerScore >= 85
          ? "success"
          : topPerformerScore >= 75
            ? "warning"
            : "critical";

    return [
      {
        id: "total-employees",
        title: "Total Pegawai",
        displayValue: formatNumber(kpiData.totalEmployees),
        unit: "orang",
        description: `Total ${formatNumber(kpiData.totalEmployees)} pegawai yang aktif dalam dataset terpilih (termasuk yang memiliki dan belum memiliki data kinerja).`,
        icon: IconUsers,
      },
      {
        id: "coverage",
        title: "Cakupan Data Kinerja",
        displayValue: formatNumber(coverageRounded, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        unit: "%",
        description: `${formatNumber(employeesWithPerformance.length)} pegawai memiliki data kinerja dari total ${formatNumber(filteredEmployees.length)} pegawai = ${formatNumber(coverageRounded, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% cakupan data.`,
        icon: IconClipboardData,
        tone: coverageTone,
      },
      {
        id: "competencies",
        title: "Kompetensi Dinilai",
        displayValue: formatNumber(competencyData.length),
        unit: "kompetensi",
        description: `Total ${formatNumber(competencyData.length)} jenis kompetensi unik yang telah dinilai dan memiliki skor dalam dataset periode ini.`,
        icon: IconAnalyze,
      },
      {
        id: "top-performer",
        title: "Performa Terbaik",
        displayValue: topPerformerName ?? "Belum tersedia",
        unit:
          topPerformerScore !== null
            ? `${formatNumber(topPerformerScore, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })} poin`
            : undefined,
        description:
          topPerformerScore !== null
            ? `${topPerformerName} memiliki rata-rata skor tertinggi (${formatNumber(topPerformerScore, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} poin) dari semua kompetensi yang dinilai.`
            : "Belum ada data pegawai dengan penilaian kompetensi.",
        icon: IconSparkles,
        tone: topPerformerTone,
      },
    ];
  }, [kpiData, coverageRounded, coverageTone, competencyData.length, employeesWithPerformance.length, filteredEmployees.length]);

  const topPerformers = useMemo(
    () =>
      employeesWithPerformance
        .map((emp) => {
          const average = calculateEmployeeAverageScore(emp);
          const tone: StatusTone =
            average >= 85 ? "success" : average >= 75 ? "warning" : "critical";
          return {
            name: emp.name,
            average: Number(average.toFixed(1)),
            tone,
            delta: Number((average - averageScore).toFixed(1)),
            level: emp.organizational_level || "Tidak diketahui",
          };
        })
        .sort((a, b) => b.average - a.average)
        .slice(0, 5),
    [employeesWithPerformance, averageScore],
  );

  const scoreDistributionSegments = useMemo(() => {
    const total = scoreRanges.reduce((sum, range) => sum + range.value, 0);
    const templates = [
      { label: "Excellent (90-100)", color: "bg-emerald-500" },
      { label: "Good (80-89)", color: "bg-sky-500" },
      { label: "Average (70-79)", color: "bg-amber-500" },
      { label: "Below Average (<70)", color: "bg-rose-500" },
    ];

    return scoreRanges.map((range, index) => {
      const percent = total === 0 ? 0 : (range.value / total) * 100;
      const template = templates[index] ?? templates[templates.length - 1];
      return {
        ...range,
        percent: Number(percent.toFixed(1)),
        barColor: template.color,
        label: template.label,
      };
    });
  }, [scoreRanges]);

  const topCompetencies = useMemo(
    () =>
      competencyData.slice(0, 5).map((competency) => {
        const tone: StatusTone =
          competency.average >= 85
            ? "success"
            : competency.average >= 75
              ? "warning"
              : "critical";
        return {
          ...competency,
          tone,
          color: TONE_HEX[tone],
        };
      }),
    [competencyData],
  );

  const levelBreakdown = useMemo(
    () =>
      Object.entries(employeesByLevel)
        .map(([level, levelEmployees]) => ({
          level,
          count: levelEmployees.length,
          percent:
            kpiData.totalEmployees === 0
              ? 0
              : Number(
                  (
                    (levelEmployees.length / kpiData.totalEmployees) *
                    100
                  ).toFixed(1),
                ),
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    [employeesByLevel, kpiData.totalEmployees],
  );

  const hasEmployees = filteredEmployees.length > 0;
  const hasPerformanceData = employeesWithPerformance.length > 0;
  const shouldDisplayMissingPerformance = hasEmployees && !hasPerformanceData;

  const searchAndFilterSection = (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full lg:max-w-xl">
          <label
            htmlFor="dashboard-search"
            className="text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            Cari pegawai atau level organisasi
          </label>
          <div className="relative mt-2">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              id="dashboard-search"
              type="text"
              placeholder="Masukkan nama pegawai atau level"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 placeholder:leading-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 leading-normal"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="secondary"
            size="md"
            leftIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4.5h18m-15 7.5h12m-9 7.5h6"
                />
              </svg>
            }
          >
            Filter
          </Button>
        </div>
      </div>
      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/40">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="level-filter"
                className="text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Filter berdasarkan level organisasi
              </label>
              <select
                id="level-filter"
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Semua level</option>
                {uniqueLevels.map((levelOption) => (
                  <option key={levelOption} value={levelOption}>
                    {levelOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="tertiary" onClick={resetFilters} size="md">
                Reset filter
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  let content: React.ReactNode;

  if (!hasEmployees) {
    content = (
      <Card
        variant="elevated"
        size="lg"
        className="max-w-3xl border-dashed border-slate-300 dark:border-slate-600"
      >
        <Card.Body>
          <div className="space-y-4 text-slate-600 dark:text-slate-300">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              Tidak ada pegawai yang cocok
            </h3>
            <p className="text-sm leading-relaxed">
              Ubah kata kunci pencarian atau reset filter untuk melihat kembali
              seluruh data pegawai yang tersedia.
            </p>
            <Button variant="secondary" size="md" onClick={resetFilters}>
              Tampilkan semua pegawai
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  } else if (shouldDisplayMissingPerformance) {
    content = (
      <section className="space-y-8">
        <Card variant="elevated" size="lg" className="overflow-hidden">
          <Card.Body>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Data pegawai siap dianalisis
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Kami menemukan {formatNumber(filteredEmployees.length)}{" "}
                  pegawai tanpa skor kompetensi. Impor data kinerja untuk
                  mengaktifkan visualisasi performa dan rekomendasi otomatis.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() =>
                    onNavigateToDataManagement
                      ? onNavigateToDataManagement()
                      : window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                >
                  Impor data kinerja
                </Button>
              </div>
              <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6 shadow-inner dark:border-blue-800 dark:bg-blue-900/30">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Langkah selanjutnya
                </h4>
                <ul className="mt-4 space-y-3 text-sm text-blue-800 dark:text-blue-200">
                  <li>
                    • Gunakan format{" "}
                    <code className="rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-900 dark:bg-blue-800 dark:text-blue-100">
                      Kompetensi [Nama Pegawai]
                    </code>{" "}
                    saat menyiapkan file impor
                  </li>
                  <li>• Pastikan nama pegawai identik dengan data master</li>
                  <li>
                    • Unggah minimal satu kompetensi untuk setiap pegawai agar
                    metrik kinerja aktif
                  </li>
                </ul>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card variant="elevated" size="md" className="group">
          <Card.Header
            title="Sebaran level organisasi"
            subtitle="Distribusi pegawai berdasarkan struktur organisasi"
            actions={
              <InfoBadge
                ariaLabel="Definisi sebaran level"
                description="Menampilkan jumlah pegawai pada setiap level organisasi untuk membantu prioritas unggahan data kinerja."
              />
            }
          />
          <Card.Body>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {levelBreakdown.map((item) => (
                <div
                  key={item.level}
                  className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {item.level}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(item.count)}
                    <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      orang
                    </span>
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-slate-500/80"
                      style={{ width: `${Math.min(item.percent, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {formatNumber(item.percent, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                    % dari total pegawai
                  </p>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </section>
    );
  } else {
    content = (
      <section className="space-y-10">
        <Card variant="elevated" size="lg" className="group">
          <Card.Header
            title="Dashboard Metrics"
            subtitle="Ringkasan visual semua indikator kinerja utama"
            actions={
              <InfoBadge
                ariaLabel="Dashboard Metrics"
                description="Cluster gauge yang menampilkan 6 metrics penting organisasi dalam format visual yang mudah dipahami."
              />
            }
          />
          <Card.Body>
            <ProgressGaugeCluster employees={filteredEmployees} />
          </Card.Body>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card variant="elevated" size="md" className="group">
            <Card.Body className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                Eselon II-IV
              </p>
              <div className="flex items-end justify-center gap-1">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(organizationalSummary.eselon)}
                </p>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  orang
                </span>
              </div>
            </Card.Body>
          </Card>
          <Card variant="elevated" size="md" className="group">
            <Card.Body className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                Staff ASN
              </p>
              <div className="flex items-end justify-center gap-1">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(organizationalSummary.asnStaff)}
                </p>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  orang
                </span>
              </div>
            </Card.Body>
          </Card>
          <Card variant="elevated" size="md" className="group">
            <Card.Body className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                Staff Non ASN
              </p>
              <div className="flex items-end justify-center gap-1">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(organizationalSummary.nonAsnStaff)}
                </p>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  orang
                </span>
              </div>
            </Card.Body>
          </Card>
          <Card variant="elevated" size="md" className="group">
            <Card.Body className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                Lainnya
              </p>
              <div className="flex items-end justify-center gap-1">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(organizationalSummary.other)}
                </p>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  orang
                </span>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((metric) => {
            const toneClasses = metric.tone
              ? {
                  iconWrapper: STATUS_STYLES[metric.tone].iconBg,
                  iconColor: STATUS_STYLES[metric.tone].iconText,
                }
              : {
                  iconWrapper: "bg-slate-100 dark:bg-slate-800",
                  iconColor: "text-slate-500 dark:text-slate-300",
                };

            const IconComponent = metric.icon;

            return (
              <Card
                key={metric.id}
                variant="elevated"
                size="md"
                className="group overflow-hidden"
                interactive
                tabIndex={0}
              >
                <Card.Body className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {metric.title}
                      </p>
                      <InfoBadge
                        ariaLabel={`Cara menghitung ${metric.title}`}
                        description={metric.description}
                      />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                      {metric.displayValue}
                      {metric.unit && (
                        <span className="ml-1 text-base font-semibold text-slate-500 dark:text-slate-400">
                          {metric.unit}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${toneClasses.iconWrapper}`}
                  >
                    <IconComponent
                      className={`h-6 w-6 ${toneClasses.iconColor}`}
                    />
                  </span>
                </Card.Body>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Card variant="elevated" size="md" className="group">
            <Card.Header
              title="Sebaran performa organisasi"
              subtitle="Distribusi nilai rata-rata pegawai pada rentang skor utama"
              actions={
                <InfoBadge
                  ariaLabel="Definisi sebaran performa"
                  description="Menunjukkan persentase pegawai dalam setiap rentang skor sehingga area fokus perbaikan dapat teridentifikasi."
                />
              }
            />
            <Card.Body>
              <div className="space-y-5">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  {scoreDistributionSegments.map((segment) => (
                    <div
                      key={segment.label}
                      className={`${segment.barColor}`}
                      style={{ width: `${segment.percent}%` }}
                      aria-label={`${segment.label} ${segment.percent}%`}
                    />
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {scoreDistributionSegments.map((segment) => (
                    <div
                      key={segment.label}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-3 w-3 rounded-full flex-shrink-0 ${segment.barColor}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {segment.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {segment.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {formatNumber(segment.percent, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                          %
                        </p>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          ({formatNumber(segment.value)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card variant="elevated" size="md" className="group">
            <Card.Header
              title="Kompetensi teratas"
              subtitle="Lima kompetensi dengan nilai rata-rata tertinggi"
              actions={
                <InfoBadge
                  ariaLabel="Definisi kompetensi teratas"
                  description="Daftar kompetensi dengan rata-rata skor tertinggi di antara pegawai yang memiliki data kinerja."
                />
              }
            />
            <Card.Body>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCompetencies}
                    layout="vertical"
                    margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                    barSize={14}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      dataKey="shortName"
                      type="category"
                      tick={{ fill: "#475569", fontSize: 12 }}
                      width={120}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(15, 23, 42, 0.08)" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: 12,
                        border: "none",
                        color: "#f8fafc",
                        padding: "12px 16px",
                      }}
                      formatter={(value: number) => [
                        `${formatNumber(value, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })} poin`,
                        "Rata-rata",
                      ]}
                    />
                    <Bar dataKey="average" radius={[0, 12, 12, 0]}>
                      {topCompetencies.map((item) => (
                        <Cell key={item.competency} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>

          <Card variant="elevated" size="md" className="group">
            <Card.Header
              title="Top performer"
              subtitle="Pegawai dengan rata-rata skor tertinggi"
              actions={
                <InfoBadge
                  ariaLabel="Definisi top performer"
                  description="Menampilkan lima pegawai dengan skor rata-rata terbaik untuk membantu program apresiasi dan pembelajaran."
                />
              }
            />
            <Card.Body>
              <ul className="space-y-4">
                {topPerformers.map((performer, index) => (
                  <li key={performer.name} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0 text-center">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {performer.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {performer.level}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-0">
                      <div className="flex items-end justify-end gap-1">
                        <span
                          className={`text-lg font-bold ${STATUS_STYLES[performer.tone].text}`}
                        >
                          {formatNumber(performer.average, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </span>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                          poin
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {performer.delta >= 0 ? "▲" : "▼"}
                        {formatNumber(Math.abs(performer.delta), {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        vs rata-rata
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        </div>

        {/* New Interactive Charts Section */}
        <div className="grid gap-6 xl:grid-cols-2">
          <Card variant="elevated" size="md" className="group">
            <Card.Header
              title="Tren Performa Organisasi"
              subtitle="Perubahan skor rata-rata dari waktu ke waktu"
              actions={
                <InfoBadge
                  ariaLabel="Tren Performa"
                  description="Visualisasi tren performa organisasi menampilkan rata-rata skor, top performer, dan bottom performer dalam 6 bulan terakhir."
                />
              }
            />
            <Card.Body>
              <PerformanceTrendChart employees={filteredEmployees} />
            </Card.Body>
          </Card>

          <Card variant="elevated" size="md" className="group">
            <Card.Header
              title="Distribusi Pegawai"
              subtitle="Sebaran pegawai berdasarkan level organisasi"
              actions={
                <InfoBadge
                  ariaLabel="Distribusi Pegawai"
                  description="Donut chart interaktif yang menampilkan distribusi pegawai di setiap level organisasi dengan persentase detail."
                />
              }
            />
            <Card.Body>
              <div className="relative">
                <EmployeeDistributionDonut employees={filteredEmployees} />
              </div>
            </Card.Body>
          </Card>
        </div>

        <Card variant="elevated" size="lg" className="group">
          <Card.Header
            title="Radar Kompetensi"
            subtitle="Analisis mendalam kompetensi organisasi"
            actions={
              <InfoBadge
                ariaLabel="Radar Kompetensi"
                description="Spider chart yang menampilkan 8 kompetensi teratas dengan skor rata-rata untuk identifikasi kekuatan dan area pengembangan."
              />
            }
          />
          <Card.Body>
            <CompetencyRadarChart employees={filteredEmployees} />
          </Card.Body>
        </Card>

        <Card variant="elevated" size="lg" className="group">
          <Card.Header
            title="Heat Map Kompetensi"
            subtitle="Matriks kompetensi berdasarkan level organisasi"
            actions={
              <InfoBadge
                ariaLabel="Heat Map"
                description="Heat map interaktif menampilkan skor kompetensi di setiap level organisasi untuk identifikasi gap keterampilan."
              />
            }
          />
          <Card.Body>
            <CompetencyHeatMap employees={filteredEmployees} />
          </Card.Body>
        </Card>
      </section>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <section className="rounded-3xl bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 px-8 py-10 text-white shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 lg:flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200">
              Ringkasan kinerja
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Dashboard Kinerja Pegawai
            </h1>
            <p className="max-w-2xl text-sm text-indigo-100 md:text-base">
              Pantau performa organisasi, cakupan data, dan kompetensi unggulan
              dengan tampilan yang lebih terstruktur dan mudah dipindai.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-3xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur lg:flex-shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
              Periode data
            </span>
            <span className="text-lg font-bold text-white">
              {datasetMetadata.periodLabel}
            </span>
            <span className="text-xs text-indigo-100/80">
              Dataset aktif: {datasetMetadata.datasetLabel}
            </span>
          </div>
        </div>
      </section>

      {searchAndFilterSection}

      {content}
    </div>
  );
};

export default DashboardOverview;
