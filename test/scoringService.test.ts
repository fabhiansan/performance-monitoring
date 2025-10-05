import { describe, it, expect } from 'vitest';
import {
  calculatePerilakuKinerja,
  calculateKualitasKerja,
  calculateTotalScore,
  generateEmployeeRecap
} from '../services/scoringService';
import { Employee, CompetencyScore } from '../types';

describe('Scoring Service', () => {
  const createMockPerformance = (scores: Record<string, number>): CompetencyScore[] => {
    return Object.entries(scores).map(([name, score]) => ({ name, score }));
  };

  describe('calculatePerilakuKinerja', () => {
    it('should calculate perilaku kinerja with all competencies', () => {
      const performance = createMockPerformance({
        'inisiatif dan fleksibilitas': 80,
        'kehadiran dan ketepatan waktu': 85,
        'kerjasama dan team work': 90,
        'manajemen waktu kerja': 75,
        'kepemimpinan': 88
      });

      const result = calculatePerilakuKinerja(performance);

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(25.5); // Should be capped at 25.5
    });

    it('should return 0 for empty performance array', () => {
      const result = calculatePerilakuKinerja([]);
      expect(result).toBe(0);
    });

    it('should cap the result at 25.5', () => {
      const performance = createMockPerformance({
        'inisiatif dan fleksibilitas': 100,
        'kehadiran dan ketepatan waktu': 100,
        'kerjasama dan team work': 100,
        'manajemen waktu kerja': 100,
        'kepemimpinan': 100
      });

      const result = calculatePerilakuKinerja(performance);

      expect(result).toBe(25.5);
    });

    it('should handle partial competency data', () => {
      const performance = createMockPerformance({
        'inisiatif dan fleksibilitas': 80,
        'kepemimpinan': 90
      });

      const result = calculatePerilakuKinerja(performance);

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });

    it('should find competencies with alternative names', () => {
      const performance = createMockPerformance({
        'inisiatif': 80,
        'kehadiran': 85,
        'teamwork': 90,
        'waktu kerja': 75,
        'leadership': 88
      });

      const result = calculatePerilakuKinerja(performance);

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });

    it('should apply correct weights (5%, 5%, 5%, 5%, 10%)', () => {
      const performance = createMockPerformance({
        'inisiatif dan fleksibilitas': 100, // 5% = 5
        'kehadiran dan ketepatan waktu': 0,  // 5% = 0
        'kerjasama dan team work': 0,       // 5% = 0
        'manajemen waktu kerja': 0,         // 5% = 0
        'kepemimpinan': 0                   // 10% = 0
      });

      const result = calculatePerilakuKinerja(performance);

      expect(result).toBe(5); // Only inisiatif with 100 score = 5
    });
  });

  describe('calculateKualitasKerja', () => {
    it('should calculate kualitas kerja for Eselon position', () => {
      const performance = createMockPerformance({
        'kualitas kinerja': 85,
        'kemampuan berkomunikasi': 80,
        'pemahaman tentang permasalahan sosial': 90
      });

      const result = calculateKualitasKerja(performance, 'eselon');

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(42.5); // Max for Eselon
    });

    it('should calculate kualitas kerja for Staff position', () => {
      const performance = createMockPerformance({
        'kualitas kinerja': 85,
        'kemampuan berkomunikasi': 80,
        'pemahaman tentang permasalahan sosial': 90
      });

      const result = calculateKualitasKerja(performance, 'staff');

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(70); // Max for Staff
    });

    it('should return 0 for empty performance array', () => {
      const result = calculateKualitasKerja([], 'eselon');
      expect(result).toBe(0);
    });

    it('should cap Eselon result at 42.5', () => {
      const performance = createMockPerformance({
        'kualitas kinerja': 100,
        'kemampuan berkomunikasi': 100,
        'pemahaman tentang permasalahan sosial': 100
      });

      const result = calculateKualitasKerja(performance, 'eselon');

      expect(result).toBe(42.5);
    });

    it('should cap Staff result at 70', () => {
      const performance = createMockPerformance({
        'kualitas kinerja': 100,
        'kemampuan berkomunikasi': 100,
        'pemahaman tentang permasalahan sosial': 100
      });

      const result = calculateKualitasKerja(performance, 'staff');

      expect(result).toBeLessThanOrEqual(70);
    });

    it('should apply correct Eselon weights (25.5%, 8.5%, 8.5%)', () => {
      const performance = createMockPerformance({
        'kualitas kinerja': 100,        // 25.5% = 25.5
        'kemampuan berkomunikasi': 0,   // 8.5% = 0
        'pemahaman tentang permasalahan sosial': 0 // 8.5% = 0
      });

      const result = calculateKualitasKerja(performance, 'eselon');

      expect(result).toBe(25.5);
    });

    it('should find competencies with alternative names', () => {
      const performance = createMockPerformance({
        'kualitas': 85,
        'komunikasi': 80,
        'permasalahan sosial': 90
      });

      const result = calculateKualitasKerja(performance, 'staff');

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateTotalScore', () => {
    it('should calculate total score combining perilaku and kualitas for Eselon', () => {
      const perilakuScore = 20;
      const kualitasScore = 35;
      const leadershipScore = 85;

      const result = calculateTotalScore(perilakuScore, kualitasScore, leadershipScore, 'eselon');

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });

    it('should calculate total score for Staff position', () => {
      const perilakuScore = 20;
      const kualitasScore = 60;
      const leadershipScore = 0;

      const result = calculateTotalScore(perilakuScore, kualitasScore, leadershipScore, 'staff');

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });

    it('should handle zero scores', () => {
      const result = calculateTotalScore(0, 0, 0, 'eselon');

      expect(result).toBe(0);
    });

    it('should not exceed maximum score', () => {
      const result = calculateTotalScore(25.5, 42.5, 100, 'eselon');

      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('generateEmployeeRecap', () => {
    const createMockEmployee = (organizationalLevel: string): Employee => ({
      name: 'Test Employee',
      nip: '123456789012345678',
      gol: 'III/d',
      pangkat: 'Penata Tingkat I',
      position: 'Kepala Sub Bagian',
      organizationalLevel,
      performance: [
        { name: 'inisiatif dan fleksibilitas', score: 80 },
        { name: 'kehadiran dan ketepatan waktu', score: 85 },
        { name: 'kerjasama dan team work', score: 90 },
        { name: 'manajemen waktu kerja', score: 75 },
        { name: 'kepemimpinan', score: 88 },
        { name: 'kualitas kinerja', score: 85 },
        { name: 'kemampuan berkomunikasi', score: 80 },
        { name: 'pemahaman tentang permasalahan sosial', score: 90 }
      ],
      average: 84.13,
      leadershipScore: 88
    });

    it('should generate recap for Eselon employee', () => {
      const employee = createMockEmployee('Eselon IV');
      const result = generateEmployeeRecap(employee);

      expect(result).toBeDefined();
      expect(result.performanceRecap).toBeDefined();
      expect(result.performanceRecap.perilakuKinerja).toBeGreaterThan(0);
      expect(result.performanceRecap.kualitasKerja).toBeGreaterThan(0);
      expect(result.performanceRecap.totalNilai).toBeGreaterThan(0);
    });

    it('should generate recap for Staff employee', () => {
      const employee = createMockEmployee('Staff');
      const result = generateEmployeeRecap(employee);

      expect(result).toBeDefined();
      expect(result.performanceRecap).toBeDefined();
      expect(result.performanceRecap.perilakuKinerja).toBeGreaterThan(0);
      expect(result.performanceRecap.kualitasKerja).toBeGreaterThan(0);
      expect(result.performanceRecap.totalNilai).toBeGreaterThan(0);
    });

    it('should handle employee with no performance data', () => {
      const employee: Employee = {
        name: 'Test Employee',
        nip: '123456789012345678',
        gol: 'III/d',
        pangkat: 'Penata Tingkat I',
        position: 'Kepala Sub Bagian',
        organizationalLevel: 'Eselon IV',
        performance: [],
        average: 0
      };

      const result = generateEmployeeRecap(employee);

      expect(result.performanceRecap.perilakuKinerja).toBe(0);
      expect(result.performanceRecap.kualitasKerja).toBe(0);
      expect(result.performanceRecap.totalNilai).toBe(0);
    });

    it('should ensure total nilai does not exceed 100', () => {
      const employee = createMockEmployee('Eselon IV');
      const result = generateEmployeeRecap(employee);

      expect(result.performanceRecap.totalNilai).toBeLessThanOrEqual(100);
    });

    it('should preserve all original employee properties', () => {
      const employee = createMockEmployee('Eselon IV');
      const result = generateEmployeeRecap(employee);

      expect(result.name).toBe(employee.name);
      expect(result.nip).toBe(employee.nip);
      expect(result.gol).toBe(employee.gol);
      expect(result.pangkat).toBe(employee.pangkat);
      expect(result.position).toBe(employee.position);
      expect(result.organizationalLevel).toBe(employee.organizationalLevel);
      expect(result.performance).toEqual(employee.performance);
      expect(result.average).toBe(employee.average);
    });
  });

  describe('Integration - Full Scoring Workflow', () => {
    it('should calculate consistent scores across all functions', () => {
      const performance = createMockPerformance({
        'inisiatif dan fleksibilitas': 80,
        'kehadiran dan ketepatan waktu': 85,
        'kerjasama dan team work': 90,
        'manajemen waktu kerja': 75,
        'kepemimpinan': 88,
        'kualitas kinerja': 85,
        'kemampuan berkomunikasi': 80,
        'pemahaman tentang permasalahan sosial': 90
      });

      const perilaku = calculatePerilakuKinerja(performance);
      const kualitas = calculateKualitasKerja(performance, 'eselon');
      const total = calculateTotalScore(perilaku, kualitas, 85, 'eselon');

      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(100);
      expect(perilaku).toBeLessThanOrEqual(25.5);
      expect(kualitas).toBeLessThanOrEqual(42.5);
    });
  });
});
