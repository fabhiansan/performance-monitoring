import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Employee } from '../types';

export interface ReportConfig {
  semester: number;
  year: number;
  employee: Employee;
}

export interface PdfGenerationOptions {
  scale?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
  backgroundColor?: string;
  orientation?: 'portrait' | 'landscape';
  format?: string;
}

export class ReportGenerationService {
  private static readonly DEFAULT_OPTIONS: PdfGenerationOptions = {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    orientation: 'landscape',
    format: 'a4'
  };

  static async generatePDF(
    element: HTMLElement,
    config: ReportConfig,
    options: PdfGenerationOptions = {}
  ): Promise<void> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      const canvas = await html2canvas(element, {
        scale: mergedOptions.scale || 2,
        useCORS: mergedOptions.useCORS || true,
        allowTaint: mergedOptions.allowTaint || true,
        backgroundColor: mergedOptions.backgroundColor || '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF(
        mergedOptions.orientation || 'landscape',
        'mm',
        mergedOptions.format || 'a4'
      );
      
      this.addCanvasToPDF(pdf, canvas, imgData);
      
      const filename = this.generateFilename(config);
      pdf.save(filename);
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static addCanvasToPDF(pdf: jsPDF, canvas: { width: number; height: number }, imgData: string): void {
    const imgWidth = 210; // A4 landscape width in mm
    const pageHeight = 295; // A4 landscape height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  private static generateFilename(config: ReportConfig): string {
    const { employee, semester, year } = config;
    const cleanName = employee.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const semesterText = semester === 1 ? 'I' : 'II';
    return `Laporan_Kinerja_${cleanName}_Semester_${semesterText}_${year}.pdf`;
  }

  static validateReportConfig(config: Partial<ReportConfig>): config is ReportConfig {
    return !!(
      config.employee &&
      config.semester &&
      config.year &&
      config.semester >= 1 &&
      config.semester <= 2 &&
      config.year >= 2020 &&
      config.year <= 2030
    );
  }
}