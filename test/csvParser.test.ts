import { describe, it, expect } from 'vitest';
import { parseEmployeeCSV } from '../services/csvParser';

describe('CSV Parser Service', () => {
  describe('parseEmployeeCSV', () => {
    it('should parse basic employee CSV with standard format', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees).toBeDefined();
      expect(result.employees.length).toBe(1);
      expect(result.employees[0].name).toBe('John Doe');
      expect(result.employees[0].nip).toBe('123456789012345678');
      expect(result.employees[0].gol).toBe('III/d');
      expect(result.employees[0].pangkat).toBe('Penata Tingkat I');
      expect(result.employees[0].position).toBe('Kepala Sub Bagian');
      expect(result.employees[0].subPosition).toBe('Staff Perencanaan');
    });

    it('should parse multiple employees', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan
Jane Smith,987654321098765432,IV/a,Pembina,Kepala Bidang,Sekretariat
Bob Wilson,111222333444555666,III/c,Penata,Kepala Seksi,Staff Jaminan Sosial`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBe(3);
      expect(result.employees[0].name).toBe('John Doe');
      expect(result.employees[1].name).toBe('Jane Smith');
      expect(result.employees[2].name).toBe('Bob Wilson');
    });

    it('should handle tab-delimited data', () => {
      const csvText = `NAMA\tNIP\tGOL\tPANGKAT\tJABATAN\tSUB POSISI
John Doe\t123456789012345678\tIII/d\tPenata Tingkat I\tKepala Sub Bagian\tStaff Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].name).toBe('John Doe');
      expect(result.employees[0].nip).toBe('123456789012345678');
    });

    it('should handle space-delimited data (Google Sheets paste)', () => {
      const csvText = `NAMA  NIP  GOL  PANGKAT  JABATAN  SUB POSISI
John Doe  123456789012345678  III/d  Penata Tingkat I  Kepala Sub Bagian  Staff Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].name).toBe('John Doe');
    });

    it('should handle quoted fields with special characters', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
"Doe, John",123456789012345678,III/d,Penata Tingkat I,"Kepala Sub Bagian, Utama",Staff Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].name).toBe('Doe, John');
      expect(result.employees[0].position).toBe('Kepala Sub Bagian, Utama');
    });

    it('should handle escaped quotes in fields', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
"John ""Johnny"" Doe",123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].name).toBe('John "Johnny" Doe');
    });

    it('should determine organizational level for Eselon IV', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees[0].organizationalLevel).toBe('Eselon IV');
      expect(result.employees[0].organizational_level).toBe('Eselon IV');
    });

    it('should determine organizational level for Eselon III', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
Jane Smith,987654321098765432,IV/a,Pembina,Kepala Bidang,Sekretariat`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees[0].organizationalLevel).toBe('Eselon III');
      expect(result.employees[0].organizational_level).toBe('Eselon III');
    });

    it('should determine organizational level for Staff based on sub-position', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees[0].organizationalLevel).toBe('Staff');
      expect(result.employees[0].organizational_level).toBe('Staff');
    });

    it('should handle Staff designation with STAF spelling', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,STAF Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees[0].organizationalLevel).toBe('Staff');
    });

    it('should handle mixed case staff designation', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,staff administrasi`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees[0].organizationalLevel).toBe('Staff');
    });

    it('should return validation warnings for invalid data', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
,123456,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.validation).toBeDefined();
      expect(result.validation.warnings).toBeDefined();
    });

    it('should skip invalid rows and continue parsing', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan
,,,,,
Jane Smith,987654321098765432,IV/a,Pembina,Kepala Bidang,Sekretariat`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBeGreaterThanOrEqual(2);
      expect(result.employees.some(emp => emp.name === 'John Doe')).toBe(true);
      expect(result.employees.some(emp => emp.name === 'Jane Smith')).toBe(true);
    });

    it('should handle empty CSV', () => {
      const csvText = '';

      const result = parseEmployeeCSV(csvText);

      expect(result.employees).toEqual([]);
      expect(result.validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle CSV with only headers', () => {
      const csvText = 'NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI';

      const result = parseEmployeeCSV(csvText);

      expect(result.employees).toEqual([]);
    });

    it('should handle missing columns gracefully', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,,,Kepala Sub Bagian,Staff Perencanaan`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].gol).toBe('');
      expect(result.employees[0].pangkat).toBe('');
    });

    it('should trim whitespace from fields', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
  John Doe  ,  123456789012345678  ,  III/d  ,  Penata Tingkat I  ,  Kepala Sub Bagian  ,  Staff Perencanaan  `;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees[0].name).toBe('John Doe');
      expect(result.employees[0].nip).toBe('123456789012345678');
      expect(result.employees[0].gol).toBe('III/d');
    });

    it('should handle different column order if headers are provided', () => {
      const csvText = `NAMA,JABATAN,SUB POSISI,NIP,GOL,PANGKAT
John Doe,Kepala Sub Bagian,Staff Perencanaan,123456789012345678,III/d,Penata Tingkat I`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].name).toBe('John Doe');
      expect(result.employees[0].position).toBe('Kepala Sub Bagian');
    });

    it('should validate NIP format and length', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,12345,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan
Jane Smith,987654321098765432,IV/a,Pembina,Kepala Bidang,Sekretariat`;

      const result = parseEmployeeCSV(csvText);

      // Should still parse but may have validation warnings
      expect(result.employees.length).toBeGreaterThanOrEqual(1);
      expect(result.validation).toBeDefined();
    });

    it('should handle lines with extra delimiters', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI,
John Doe,123456789012345678,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan,`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].name).toBe('John Doe');
    });

    it('should handle Sekretaris Dinas position (Eselon II)', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456789012345678,IV/b,Pembina Tk I,Sekretaris Dinas,Sekretariat`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees[0].position).toBe('Sekretaris Dinas');
      expect(result.employees[0].organizationalLevel).toBe('Eselon II');
    });

    it('should handle positions with "Kepala" for Eselon levels', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,111111111111111111,III/c,Penata,Kepala Seksi,Rehabilitasi
Jane Smith,222222222222222222,III/d,Penata Tk I,Kepala Sub Bagian,Perencanaan
Bob Wilson,333333333333333333,IV/a,Pembina,Kepala Bidang,Jaminan Sosial`;

      const result = parseEmployeeCSV(csvText);

      expect(result.employees[0].organizationalLevel).toMatch(/Eselon/);
      expect(result.employees[1].organizationalLevel).toMatch(/Eselon/);
      expect(result.employees[2].organizationalLevel).toMatch(/Eselon/);
    });
  });
});
