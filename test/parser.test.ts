import { describe, it, expect } from 'vitest';
import { parseEmployeeData, parsePerformanceData } from '../services/parser';

describe('Parser Service', () => {
  describe('parseEmployeeData', () => {
    it('should parse basic employee CSV data', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan`;

      const result = parseEmployeeData(csvText);

      expect(result).toBeDefined();
      expect(result['John Doe']).toBeDefined();
      expect(result['John Doe'].position).toBe('Kepala Sub Bagian');
      expect(result['John Doe'].subPosition).toBe('Staff Perencanaan');
    });

    it('should handle multiple employees', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan
Jane Smith,789012,IV/a,Pembina,Kepala Bidang,Sekretariat`;

      const result = parseEmployeeData(csvText);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['John Doe']).toBeDefined();
      expect(result['Jane Smith']).toBeDefined();
    });

    it('should handle empty CSV data', () => {
      const csvText = '';
      const result = parseEmployeeData(csvText);
      expect(result).toEqual({});
    });

    it('should handle CSV with only headers', () => {
      const csvText = 'NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI';
      const result = parseEmployeeData(csvText);
      expect(result).toEqual({});
    });

    it('should handle CSV with quoted fields', () => {
      const csvText = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
"John ""Johnny"" Doe",123456,III/d,Penata Tingkat I,"Kepala Sub Bagian",Staff Perencanaan`;

      const result = parseEmployeeData(csvText);
      expect(result['John "Johnny" Doe']).toBeDefined();
    });
  });

  describe('parsePerformanceData', () => {
    it('should parse basic performance data', () => {
      const performanceText = `Competency [John Doe],Competency [Jane Smith]
Kualitas Kinerja [John Doe],85,90
Kepemimpinan [Jane Smith],75,80`;

      const result = parsePerformanceData(performanceText);

      expect(result.employees).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.employees.length).toBeGreaterThan(0);
    });

    it('should validate parsed performance data', () => {
      const performanceText = `Competency [John Doe]
Kualitas Kinerja [John Doe],85
Kepemimpinan [John Doe],75`;

      const result = parsePerformanceData(performanceText);

      expect(result.validation).toBeDefined();
      expect(result.validation.isValid).toBeDefined();
    });

    it('should throw error for invalid data format', () => {
      const invalidText = 'Just a single line without proper format';

      expect(() => {
        parsePerformanceData(invalidText);
      }).toThrow();
    });

    it('should handle empty performance data', () => {
      const emptyText = '';

      expect(() => {
        parsePerformanceData(emptyText);
      }).toThrow('Data must have a header row and at least one data row');
    });

    it('should parse performance data with employee CSV mapping', () => {
      const performanceText = `Competency [John Doe]
Kualitas Kinerja [John Doe],85
Kepemimpinan [John Doe],75`;

      const employeeCsv = `NAMA,NIP,GOL,PANGKAT,JABATAN,SUB POSISI
John Doe,123456,III/d,Penata Tingkat I,Kepala Sub Bagian,Staff Perencanaan`;

      const result = parsePerformanceData(performanceText, employeeCsv);

      expect(result.employees).toBeDefined();
      expect(result.employees.length).toBeGreaterThan(0);
    });

    it('should filter out employees with no performance data', () => {
      const performanceText = `Competency [John Doe],Competency [Jane Smith]
Kualitas Kinerja [John Doe],85,
Kepemimpinan [John Doe],75,`;

      const result = parsePerformanceData(performanceText);

      // Should only include John Doe who has performance data
      const johnDoe = result.employees.find(emp => emp.name === 'John Doe');
      expect(johnDoe).toBeDefined();

      // Jane Smith should be filtered out if she has no scores
      const validEmployeesOnly = result.employees.every(emp =>
        emp.performance && emp.performance.length > 0
      );
      expect(validEmployeesOnly).toBe(true);
    });

    it('should handle competency scores with numeric values', () => {
      const performanceText = `Competency [John Doe]
Kualitas Kinerja [John Doe],85
Kepemimpinan [John Doe],90
Kerjasama [John Doe],80`;

      const result = parsePerformanceData(performanceText);

      expect(result.employees.length).toBeGreaterThan(0);
      const employee = result.employees[0];
      expect(employee.performance).toBeDefined();
      expect(employee.performance.length).toBe(3);

      // Check that scores are parsed correctly
      const kualitasScore = employee.performance.find(p =>
        p.name.toLowerCase().includes('kualitas')
      );
      expect(kualitasScore?.score).toBe(85);
    });

    it('should parse data with organizational level mapping', () => {
      const performanceText = `Competency [John Doe]
Kualitas Kinerja [John Doe],85
Kepemimpinan [John Doe],75`;

      const orgLevelMapping = {
        'John Doe': {
          position: 'Kepala Bidang',
          subPosition: 'Sekretariat',
          organizationalLevel: 'Eselon III',
          detailedPosition: 'Eselon III'
        }
      };

      const result = parsePerformanceData(performanceText, undefined, orgLevelMapping);

      expect(result.employees.length).toBeGreaterThan(0);
      const employee = result.employees[0];
      expect(employee.organizationalLevel).toBeDefined();
    });
  });

  describe('parsePerformanceData edge cases', () => {
    it('should handle lines with only commas', () => {
      const performanceText = `Kualitas Kinerja [John Doe]
,,,
85`;

      const result = parsePerformanceData(performanceText);

      expect(result.employees).toBeDefined();
      expect(result.employees.length).toBeGreaterThan(0);
    });

    it('should handle empty lines', () => {
      const performanceText = `Kualitas Kinerja [John Doe],Kepemimpinan [John Doe]

85,75

`;

      const result = parsePerformanceData(performanceText);

      expect(result.employees).toBeDefined();
      expect(result.employees.length).toBeGreaterThan(0);
    });

    it('should handle trailing commas', () => {
      const performanceText = `Kualitas Kinerja [John Doe],Kepemimpinan [John Doe],
85,75,`;

      const result = parsePerformanceData(performanceText);

      expect(result.employees).toBeDefined();
      expect(result.employees.length).toBeGreaterThan(0);
    });
  });
});
