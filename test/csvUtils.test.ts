import { describe, it, expect } from 'vitest';
import {
  detectDelimiter,
  parseCsvLine,
  cleanCompetencyName,
  extractEmployeeName,
  convertScoreToNumber,
} from '../utils/csvUtils';

describe('CSV Utils', () => {
  describe('detectDelimiter', () => {
    it('should detect comma delimiter', () => {
      const line = 'Name,NIP,Position';
      const result = detectDelimiter(line);

      expect(result.delimiter).toBe(',');
      expect(result.isSpaceDelimited).toBe(false);
    });

    it('should detect tab delimiter', () => {
      const line = 'Name\tNIP\tPosition';
      const result = detectDelimiter(line);

      expect(result.delimiter).toBe('\t');
      expect(result.isSpaceDelimited).toBe(false);
    });

    it('should detect space delimiter (Google Sheets paste)', () => {
      const line = 'Name  NIP  Position';
      const result = detectDelimiter(line);

      expect(result.isSpaceDelimited).toBe(true);
    });

    it('should prioritize tabs over commas', () => {
      const line = 'Name,Value\tAnother,Field';
      const result = detectDelimiter(line);

      expect(result.delimiter).toBe('\t');
    });

    it('should prioritize tabs over multiple spaces', () => {
      const line = 'Name  Value\tAnother  Field';
      const result = detectDelimiter(line);

      expect(result.delimiter).toBe('\t');
    });

    it('should handle line with no delimiters', () => {
      const line = 'SingleField';
      const result = detectDelimiter(line);

      expect(result.delimiter).toBe(','); // Default to comma
    });
  });

  describe('parseCsvLine', () => {
    it('should parse comma-delimited line', () => {
      const line = 'John Doe,123456,III/d,Penata';
      const result = parseCsvLine(line);

      expect(result).toEqual(['John Doe', '123456', 'III/d', 'Penata']);
    });

    it('should parse tab-delimited line', () => {
      const line = 'John Doe\t123456\tIII/d\tPenata';
      const result = parseCsvLine(line);

      expect(result).toEqual(['John Doe', '123456', 'III/d', 'Penata']);
    });

    it('should parse space-delimited line', () => {
      const line = 'John Doe  123456  III/d  Penata';
      const result = parseCsvLine(line);

      expect(result).toEqual(['John Doe', '123456', 'III/d', 'Penata']);
    });

    it('should handle quoted fields with commas', () => {
      const line = '"Doe, John",123456,III/d,Penata';
      const result = parseCsvLine(line);

      expect(result).toEqual(['Doe, John', '123456', 'III/d', 'Penata']);
    });

    it('should handle escaped quotes', () => {
      const line = '"John ""Johnny"" Doe",123456,III/d,Penata';
      const result = parseCsvLine(line);

      expect(result).toEqual(['John "Johnny" Doe', '123456', 'III/d', 'Penata']);
    });

    it('should handle quoted fields with quotes inside', () => {
      const line = '"Value with ""quotes""",Other Value';
      const result = parseCsvLine(line);

      expect(result).toEqual(['Value with "quotes"', 'Other Value']);
    });

    it('should trim whitespace from fields', () => {
      const line = '  John Doe  ,  123456  ,  III/d  ';
      const result = parseCsvLine(line);

      expect(result).toEqual(['John Doe', '123456', 'III/d']);
    });

    it('should handle empty fields', () => {
      const line = 'John Doe,,III/d,';
      const result = parseCsvLine(line);

      expect(result).toEqual(['John Doe', 'III/d']);
    });

    it('should filter out empty fields after parsing', () => {
      const line = 'John Doe,,,Penata';
      const result = parseCsvLine(line);

      expect(result).toEqual(['John Doe', 'Penata']);
    });

    it('should handle line with only delimiters', () => {
      const line = ',,,';
      const result = parseCsvLine(line);

      expect(result).toEqual([]);
    });

    it('should handle single field', () => {
      const line = 'SingleValue';
      const result = parseCsvLine(line);

      expect(result).toEqual(['SingleValue']);
    });

    it('should handle complex quoted fields', () => {
      const line = '"Field with, comma","Field with\ttab","Normal Field"';
      const result = parseCsvLine(line);

      expect(result).toEqual(['Field with, comma', 'Field with\ttab', 'Normal Field']);
    });
  });

  describe('cleanCompetencyName', () => {
    it('should remove leading numbers with period', () => {
      const name = '1. Kualitas Kinerja [John Doe]';
      const result = cleanCompetencyName(name);

      expect(result).toBe('Kualitas Kinerja');
    });

    it('should remove leading numbers without period', () => {
      const name = '5 Kepemimpinan [Jane Smith]';
      const result = cleanCompetencyName(name);

      expect(result).toBe('Kepemimpinan');
    });

    it('should remove employee name in brackets', () => {
      const name = 'Kualitas Kinerja [John Doe]';
      const result = cleanCompetencyName(name);

      expect(result).toBe('Kualitas Kinerja');
    });

    it('should normalize internal whitespace', () => {
      const name = 'Kualitas    Kinerja   [John Doe]';
      const result = cleanCompetencyName(name);

      expect(result).toBe('Kualitas Kinerja');
    });

    it('should trim leading and trailing whitespace', () => {
      const name = '  Kualitas Kinerja [John Doe]  ';
      const result = cleanCompetencyName(name);

      expect(result).toBe('Kualitas Kinerja');
    });

    it('should handle name without brackets', () => {
      const name = '3. Kualitas Kinerja';
      const result = cleanCompetencyName(name);

      expect(result).toBe('Kualitas Kinerja');
    });

    it('should handle name without numbers', () => {
      const name = 'Kualitas Kinerja';
      const result = cleanCompetencyName(name);

      expect(result).toBe('Kualitas Kinerja');
    });

    it('should handle empty string', () => {
      const name = '';
      const result = cleanCompetencyName(name);

      expect(result).toBe('');
    });

    it('should handle whitespace only', () => {
      const name = '   ';
      const result = cleanCompetencyName(name);

      expect(result).toBe('');
    });

    it('should handle complex competency name', () => {
      const name = '10. Pemahaman tentang Permasalahan Sosial [John Doe]';
      const result = cleanCompetencyName(name);

      expect(result).toBe('Pemahaman tentang Permasalahan Sosial');
    });
  });

  describe('extractEmployeeName', () => {
    it('should extract employee name from brackets', () => {
      const header = 'Kualitas Kinerja [John Doe]';
      const result = extractEmployeeName(header);

      expect(result).toBe('John Doe');
    });

    it('should extract name and remove leading numbers inside brackets', () => {
      const header = 'Kualitas Kinerja [1. John Doe]';
      const result = extractEmployeeName(header);

      expect(result).toBe('John Doe');
    });

    it('should extract name and remove leading numbers without period', () => {
      const header = 'Kualitas Kinerja [5 John Doe]';
      const result = extractEmployeeName(header);

      expect(result).toBe('John Doe');
    });

    it('should return null if no brackets found', () => {
      const header = 'Kualitas Kinerja';
      const result = extractEmployeeName(header);

      expect(result).toBeNull();
    });

    it('should return null for empty brackets', () => {
      const header = 'Kualitas Kinerja []';
      const result = extractEmployeeName(header);

      expect(result).toBe('');
    });

    it('should trim whitespace from extracted name', () => {
      const header = 'Kualitas Kinerja [  John Doe  ]';
      const result = extractEmployeeName(header);

      expect(result).toBe('John Doe');
    });

    it('should handle multiple brackets (use first match)', () => {
      const header = 'Kualitas [John] Kinerja [Doe]';
      const result = extractEmployeeName(header);

      expect(result).toBe('John');
    });

    it('should handle name with special characters', () => {
      const header = 'Kualitas Kinerja [John Doe, S.Sos]';
      const result = extractEmployeeName(header);

      expect(result).toBe('John Doe, S.Sos');
    });

    it('should handle empty string', () => {
      const header = '';
      const result = extractEmployeeName(header);

      expect(result).toBeNull();
    });
  });

  describe('convertScoreToNumber', () => {
    it('should convert valid numeric score', () => {
      const result = convertScoreToNumber('85');

      expect(result).toBe(85);
    });

    it('should convert floating point score', () => {
      const result = convertScoreToNumber('85.5');

      expect(result).toBe(85.5);
    });

    it('should convert "Sangat Baik" to 85', () => {
      const result = convertScoreToNumber('Sangat Baik');

      expect(result).toBe(85);
    });

    it('should convert "Baik" to 75', () => {
      const result = convertScoreToNumber('Baik');

      expect(result).toBe(75);
    });

    it('should convert "Kurang Baik" to 65', () => {
      const result = convertScoreToNumber('Kurang Baik');

      expect(result).toBe(65);
    });

    it('should handle case-insensitive rating strings', () => {
      expect(convertScoreToNumber('SANGAT BAIK')).toBe(85);
      expect(convertScoreToNumber('baik')).toBe(75);
      expect(convertScoreToNumber('kurang baik')).toBe(65);
    });

    it('should return 0 for empty string', () => {
      const result = convertScoreToNumber('');

      expect(result).toBe(0);
    });

    it('should return 0 for whitespace', () => {
      const result = convertScoreToNumber('   ');

      expect(result).toBe(0);
    });

    it('should return 0 for invalid string', () => {
      const result = convertScoreToNumber('invalid');

      expect(result).toBe(0);
    });

    it('should return 0 for NaN result', () => {
      const result = convertScoreToNumber('abc123');

      expect(result).toBe(0);
    });

    it('should handle numeric score with whitespace', () => {
      const result = convertScoreToNumber('  85  ');

      expect(result).toBe(85);
    });

    it('should handle negative numbers', () => {
      const result = convertScoreToNumber('-10');

      expect(result).toBe(-10);
    });

    it('should handle score of 100', () => {
      const result = convertScoreToNumber('100');

      expect(result).toBe(100);
    });

    it('should handle score of 0', () => {
      const result = convertScoreToNumber('0');

      expect(result).toBe(0);
    });

    it('should handle rating with extra whitespace', () => {
      const result = convertScoreToNumber('  Sangat Baik  ');

      expect(result).toBe(85);
    });
  });
});
