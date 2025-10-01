import { Employee } from '../types';

export interface PerformanceWeights {
  perilakuKerja: number;
  kualitasKinerja: number;
  penilaianPimpinan: number;
}

export interface PerformanceScores {
  perilakuKerjaScore: number;
  kualitasKinerjaScore: number;
  penilaianPimpinanScore: number;
  totalScore: number;
}

export type PerformanceLevel = 'SANGAT BAIK' | 'BAIK' | 'KURANG BAIK' | 'SANGAT KURANG';

export class PerformanceCalculationService {
  private static readonly DEFAULT_WEIGHTS: PerformanceWeights = {
    perilakuKerja: 0.3,     // 30%
    kualitasKinerja: 0.5,   // 50%
    penilaianPimpinan: 0.2  // 20%
  };

  private static readonly PENILAIAN_PIMPINAN_FIXED_SCORE = 17.0; // Fixed 20% weight = 17.00

  static calculatePerformanceScores(
    employee: Employee,
    weights: PerformanceWeights = this.DEFAULT_WEIGHTS
  ): PerformanceScores {
    if (!employee.performance || employee.performance.length === 0) {
      return {
        perilakuKerjaScore: 0,
        kualitasKinerjaScore: 0,
        penilaianPimpinanScore: 0,
        totalScore: 0
      };
    }

    const perilakuKerjaScore = this.calculatePerilakuKerjaScore(employee, weights.perilakuKerja);
    const kualitasKinerjaScore = this.calculateKualitasKinerjaScore(employee, weights.kualitasKinerja);
    const penilaianPimpinanScore = this.getPenilaianPimpinanScore();

    const totalScore = perilakuKerjaScore + kualitasKinerjaScore + penilaianPimpinanScore;

    return {
      perilakuKerjaScore,
      kualitasKinerjaScore,
      penilaianPimpinanScore,
      totalScore
    };
  }

  static calculatePerilakuKerjaScore(employee: Employee, weight: number = 0.3): number {
    if (!employee.performance || employee.performance.length === 0) return 0;
    
    const perilakuKerjaItems = employee.performance.slice(0, 5);
    if (perilakuKerjaItems.length === 0) return 0;

    const averageScore = perilakuKerjaItems.reduce((sum, perf) => sum + perf.score, 0) / perilakuKerjaItems.length;
    return averageScore * weight;
  }

  static calculateKualitasKinerjaScore(employee: Employee, weight: number = 0.5): number {
    if (!employee.performance || employee.performance.length === 0) return 0;
    
    const kualitasKinerjaItems = employee.performance.slice(5, 8);
    if (kualitasKinerjaItems.length === 0) return 0;

    const averageScore = kualitasKinerjaItems.reduce((sum, perf) => sum + perf.score, 0) / kualitasKinerjaItems.length;
    return averageScore * weight;
  }

  static getPenilaianPimpinanScore(): number {
    return this.PENILAIAN_PIMPINAN_FIXED_SCORE;
  }

  static getPerformanceLevel(score: number): PerformanceLevel {
    if (score >= 90) return 'SANGAT BAIK';
    if (score >= 80) return 'BAIK';
    if (score >= 70) return 'KURANG BAIK';
    return 'SANGAT KURANG';
  }

  static getPerformanceLevelThresholds(): Record<PerformanceLevel, { min: number; max: number }> {
    return {
      'SANGAT BAIK': { min: 90, max: 100 },
      'BAIK': { min: 80, max: 89.99 },
      'KURANG BAIK': { min: 70, max: 79.99 },
      'SANGAT KURANG': { min: 0, max: 69.99 }
    };
  }

  static validatePerformanceData(employee: Employee): boolean {
    return !!(
      employee.performance &&
      Array.isArray(employee.performance) &&
      employee.performance.length >= 8 &&
      employee.performance.every(perf => 
        typeof perf.score === 'number' && 
        perf.score >= 0 && 
        perf.score <= 100 &&
        typeof perf.name === 'string' &&
        perf.name.trim().length > 0
      )
    );
  }

  static getDetailedBreakdown(employee: Employee): {
    perilakuKerja: Array<{ name: string; score: number }>;
    kualitasKinerja: Array<{ name: string; score: number }>;
    scores: PerformanceScores;
  } {
    const perilakuKerja = employee.performance?.slice(0, 5) || [];
    const kualitasKinerja = employee.performance?.slice(5, 8) || [];
    const scores = this.calculatePerformanceScores(employee);

    return {
      perilakuKerja,
      kualitasKinerja,
      scores
    };
  }
}