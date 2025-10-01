import { Employee } from '../types';
import { PerformanceScores } from './performanceCalculationService';

export interface ReportMetadata {
  semester: number;
  year: string;
  generatedDate: string;
  organizationalLevel: string;
}

export interface FormattedTableRow {
  number: string;
  component: string;
  weight: string;
  value: string;
  isHeader?: boolean;
  isTotal?: boolean;
}

export class ReportFormattingService {
  static formatCurrentDate(): string {
    const now = new Date();
    return now.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  static formatSemesterText(semester: number): string {
    return semester === 1 ? 'I' : 'II';
  }

  static formatOrganizationalLevel(employee: Employee): string {
    return employee.organizational_level?.toUpperCase() || 'ESELON III';
  }

  static generateReportMetadata(employee: Employee, semester: number, year: number): ReportMetadata {
    return {
      semester,
      year: year.toString(),
      generatedDate: this.formatCurrentDate(),
      organizationalLevel: this.formatOrganizationalLevel(employee)
    };
  }

  static formatPerformanceTable(
    employee: Employee, 
    scores: PerformanceScores
  ): FormattedTableRow[] {
    const rows: FormattedTableRow[] = [];

    // Perilaku Kerja Header
    rows.push({
      number: 'I.',
      component: 'PERILAKU KERJA (30%)',
      weight: '25.50',
      value: scores.perilakuKerjaScore.toFixed(2),
      isHeader: true
    });

    // Perilaku Kerja Items
    if (employee.performance && employee.performance.length > 0) {
      employee.performance.slice(0, 5).forEach((perf, index) => {
        rows.push({
          number: (index + 1).toString(),
          component: perf.name,
          weight: '',
          value: perf.score.toFixed(2)
        });
      });
    }

    // Kualitas Kinerja Header
    rows.push({
      number: 'II.',
      component: 'KUALITAS KINERJA (50%)',
      weight: '42.50',
      value: scores.kualitasKinerjaScore.toFixed(2),
      isHeader: true
    });

    // Kualitas Kinerja Items
    if (employee.performance && employee.performance.length > 0) {
      employee.performance.slice(5, 8).forEach((perf, index) => {
        rows.push({
          number: (index + 1).toString(),
          component: perf.name,
          weight: '',
          value: perf.score.toFixed(2)
        });
      });
    }

    // Penilaian Pimpinan
    rows.push({
      number: 'III.',
      component: 'PENILAIAN PIMPINAN (20%)',
      weight: '17.00',
      value: scores.penilaianPimpinanScore.toFixed(2),
      isHeader: true
    });

    // Total
    rows.push({
      number: '',
      component: 'NILAI AKHIR',
      weight: '85.00',
      value: scores.totalScore.toFixed(2),
      isTotal: true
    });

    return rows;
  }

  static formatCriteriaTable(employee: Employee): Array<{
    number: string;
    criteria: string;
    weight: string;
    isHeader?: boolean;
  }> {
    const rows: Array<{
      number: string;
      criteria: string;
      weight: string;
      isHeader?: boolean;
    }> = [];

    // Perilaku Kerja
    rows.push({
      number: 'A.',
      criteria: 'PERILAKU KERJA',
      weight: '30%',
      isHeader: true
    });

    if (employee.performance && employee.performance.length > 0) {
      employee.performance.slice(0, 5).forEach((perf, index) => {
        rows.push({
          number: `${index + 1}.`,
          criteria: perf.name,
          weight: ''
        });
      });
    }

    // Kualitas Kinerja
    rows.push({
      number: 'B.',
      criteria: 'KUALITAS KINERJA',
      weight: '50%',
      isHeader: true
    });

    if (employee.performance && employee.performance.length > 0) {
      employee.performance.slice(5, 8).forEach((perf, index) => {
        rows.push({
          number: `${index + 1}.`,
          criteria: perf.name,
          weight: ''
        });
      });
    }

    // Penilaian Pimpinan
    rows.push({
      number: 'C.',
      criteria: 'PENILAIAN PIMPINAN',
      weight: '20%',
      isHeader: true
    });

    // Total
    rows.push({
      number: '',
      criteria: 'TOTAL',
      weight: '100%',
      isHeader: true
    });

    return rows;
  }

  static formatPerformanceSummaryText(
    _employee: Employee,
    performanceLevel: string,
    totalScore: number
  ): string {
    // Default name fallback - in real implementation this should come from configuration
    const officialName = 'HANDAYATI EKA WARDANI, SE, MM';
    const position = 'Kepala Sub Bagian Perencanaan dan Pelaporan';
    
    return `${position} ${officialName} memperoleh predikat "${performanceLevel}" dengan nilai ${totalScore.toFixed(2)}.`;
  }

  static formatDocumentHeader(_metadata: ReportMetadata): {
    title: string;
    subtitle: string;
    address: string[];
    contact: string[];
  } {
    return {
      title: 'PEMERINTAH PROVINSI KALIMANTAN SELATAN',
      subtitle: 'DINAS SOSIAL',
      address: [
        'Jalan Jenderal A. Yani Km 4,5 Komplek Gubernur Kode Pos 70234'
      ],
      contact: [
        'Telepon: (0511) 52 3854, Fax: (0511) 5265410',
        'Email: dinsos@kalselprov.go.id Website: www.dinsos.kalselprov.go.id'
      ]
    };
  }

  static formatReportTitle(metadata: ReportMetadata): string {
    return `HASIL PENILAIAN KINERJA PEGAWAI DINAS SOSIAL PROVINSI\nKALIMANTAN SELATAN SEMESTER ${this.formatSemesterText(metadata.semester)} TAHUN ${metadata.year}`;
  }

  static formatWorksheetTitle(metadata: ReportMetadata): string {
    return `KERTAS KERJA EVALUASI PENGUKURAN KINERJA ${metadata.organizationalLevel}\nDINAS SOSIAL PROVINSI KALIMANTAN SELATAN SEMESTER ${this.formatSemesterText(metadata.semester)}\nTAHUN ${metadata.year}`;
  }

  static getPerformanceLevelDescriptions(): Array<{
    level: string;
    range: string;
  }> {
    return [
      { level: 'SANGAT BAIK', range: '≥ 80.00' },
      { level: 'BAIK', range: '70.00 - 79.99' },
      { level: 'KURANG BAIK', range: '65.00 - 69.99' }
    ];
  }
}