import { Employee, CompetencyScore } from '../types';
import { getPositionType } from '../utils/organizationalLevels';

export interface PerformanceRecap {
  perilakuKinerja: number; // Max 25.5% (30% allocated but capped)
  kualitasKerja: number;   // Max 42.5% for Eselon, 70% for Staff
  penilaianPimpinan: number; // 20% of raw score for Eselon (e.g., 85 → 17), 0% for Staff (manual input)
  totalNilai: number;
  positionType: 'eselon' | 'staff'; // Track position type for evaluation
}

export interface RecapEmployee extends Employee {
  performanceRecap: PerformanceRecap;
}

// Parameter mapping with updated weights as per task requirements
const PARAMETER_WEIGHTS = {
  // Parameters 1-4, 6 for Perilaku Kinerja - UPDATED WEIGHTS
  perilakuKinerja: {
    // Updated: 5% per parameter, 10% for kepemimpinan
    weights: [5, 5, 5, 5, 10], // Max total: 30 (but will be capped at 25.5)
    parameters: [
      'inisiatif dan fleksibilitas',    // 5% (param 1)
      'kehadiran dan ketepatan waktu',  // 5% (param 2) 
      'kerjasama dan team work',        // 5% (param 3)
      'manajemen waktu kerja',          // 5% (param 4)
      'kepemimpinan'                    // 10% (param 6)
    ]
  },
  // Parameter 5, 7, 8 for Kualitas Kerja (ESELON)
  kualitasKerjaEselon: {
    weights: [25.5, 8.5, 8.5], // Max total: 42.5 (unchanged)
    parameters: [
      'kualitas kinerja',              // 25.5 (param 5)
      'kemampuan berkomunikasi',       // 8.5 (param 7)
      'pemahaman tentang permasalahan sosial' // 8.5 (param 8)
    ]
  },
  // Parameter 5, 7, 8 for Staff - UPDATED WEIGHTS
  kualitasKerjaStaff: {
    // Staff: 50% for kualitas kinerja, 10% each for communication and social understanding
    weights: [42.5, 8.5, 8.5], // Max total: 70 (unchanged for staff)
    parameters: [
      'kualitas kinerja',              // 50% (param 5)
      'kemampuan berkomunikasi',       // 10% (param 7)
      'pemahaman tentang permasalahan sosial' // 10% (param 8)
    ]
  }
};

// Position type determination is now handled by the centralized utility function

/**
 * Finds competency score by partial name matching
 */
const findCompetencyScore = (performance: CompetencyScore[], searchTerms: string[]): number => {
  if (!performance || performance.length === 0) return 0;
  for (const term of searchTerms) {
    const found = performance.find(p => 
      p.name.toLowerCase().includes(term.toLowerCase()) ||
      term.toLowerCase().includes(p.name.toLowerCase())
    );
    if (found) return found.score;
  }
  return 0; // Default if not found
};

/**
 * Calculate Perilaku Kinerja score using updated weight values
 * Sum of parameters 1, 2, 3, 4, 6 with weights 5%, 5%, 5%, 5%, 10% (Max: 25.5)
 */
export const calculatePerilakuKinerja = (performance: CompetencyScore[]): number => {
  if (!performance || performance.length === 0) return 0;
  const { parameters, weights } = PARAMETER_WEIGHTS.perilakuKinerja;
  let totalScore = 0;

  parameters.forEach((param, index) => {
    const searchTerms = [param];
    
    // Add alternative search terms for better matching
    if (param.includes('inisiatif')) searchTerms.push('inisiatif', 'fleksibilitas');
    if (param.includes('kehadiran')) searchTerms.push('kehadiran', 'ketepatan', 'waktu');
    if (param.includes('kerjasama')) searchTerms.push('kerjasama', 'team', 'teamwork');
    if (param.includes('manajemen')) searchTerms.push('manajemen', 'waktu', 'kerja');
    if (param.includes('kepemimpinan')) searchTerms.push('kepemimpinan', 'leadership');
    
    const score = findCompetencyScore(performance, searchTerms);
    // Calculate weighted score: (actual_score / 100) * weight_value
    totalScore += (score / 100) * weights[index];
  });

  // Cap the total at 25.5 as per task requirements
  const cappedScore = Math.min(totalScore, 25.5);
  return parseFloat(cappedScore.toFixed(2));
};

/**
 * Calculate Kualitas Kerja score using updated weight values (position-based)
 * Eselon: weights 25.5, 8.5, 8.5 (Max: 42.5)
 * Staff: weights 50, 10, 10 (Max: 70)
 */
export const calculateKualitasKerja = (performance: CompetencyScore[], positionType: 'eselon' | 'staff'): number => {
  if (!performance || performance.length === 0) return 0;
  const configKey = positionType === 'eselon' ? 'kualitasKerjaEselon' : 'kualitasKerjaStaff';
  const { parameters, weights } = PARAMETER_WEIGHTS[configKey];
  let totalScore = 0;

  parameters.forEach((param, index) => {
    const searchTerms = [param];
    
    // Add alternative search terms for better matching
    if (param.includes('kualitas')) searchTerms.push('kualitas', 'kinerja', 'quality');
    if (param.includes('komunikasi')) searchTerms.push('komunikasi', 'berkomunikasi', 'communication');
    if (param.includes('permasalahan')) searchTerms.push('permasalahan', 'sosial', 'social');
    
    const score = findCompetencyScore(performance, searchTerms);
    // Calculate weighted score: (actual_score / 100) * weight_value
    totalScore += (score / 100) * weights[index];
  });

  // Cap the total at max values as per task requirements
  const maxScore = positionType === 'eselon' ? 42.5 : 70;
  const cappedScore = Math.min(totalScore, maxScore);
  return parseFloat(cappedScore.toFixed(2));
};

/**
 * Calculate total performance score using updated weighted values (position-based)
 */
export const calculateTotalScore = (
  perilakuKinerja: number,      // Already weighted (max 25.5)
  kualitasKerja: number,        // Already weighted (max 42.5 for eselon, 70 for staff)
  penilaianPimpinan: number,    // Raw score 0-100
  positionType: 'eselon' | 'staff'
): number => {
  if (positionType === 'eselon') {
    // Eselon II, III & IV: Sum weighted scores + Penilaian Pimpinan at 20% of raw score
    const penilaianPimpinanWeighted = (penilaianPimpinan * 0.20); // 20% of raw score (e.g., 85 → 17)
    const total = perilakuKinerja + kualitasKerja + penilaianPimpinanWeighted;
    // Cap at 85% as per task requirements
    const cappedTotal = Math.min(total, 85);
    return parseFloat(cappedTotal.toFixed(2));
  } else {
    // Staff: Sum weighted scores only (no Penilaian Pimpinan)
    const total = perilakuKinerja + kualitasKerja;
    // Cap at 85% as per task requirements
    const cappedTotal = Math.min(total, 85);
    return parseFloat(cappedTotal.toFixed(2));
  }
};

/**
 * Generate performance recap for an employee
 */
export const generateEmployeeRecap = (
  employee: Employee, 
  penilaianPimpinan: number = 80
): RecapEmployee => {
  const positionType = getPositionType(employee);
  const perilakuKinerja = calculatePerilakuKinerja(employee.performance);
  const kualitasKerja = calculateKualitasKerja(employee.performance, positionType);
  
  // For staff positions, penilaianPimpinan is not used in calculation
  const effectivePenilaianPimpinan = positionType === 'staff' ? 0 : penilaianPimpinan;
  const totalNilai = calculateTotalScore(perilakuKinerja, kualitasKerja, effectivePenilaianPimpinan, positionType);

  return {
    ...employee,
    performanceRecap: {
      perilakuKinerja,
      kualitasKerja,
      penilaianPimpinan: effectivePenilaianPimpinan,
      totalNilai,
      positionType
    }
  };
};

/**
 * Generate performance recap for all employees
 */
export const generateAllEmployeeRecaps = (
  employees: Employee[],
  manualScores: Record<string, number> = {}
): RecapEmployee[] => {
  return employees.map(employee => {
    const penilaianPimpinan = manualScores[employee.name] || 80; // Default 80 (16 points at 20%)
    return generateEmployeeRecap(employee, penilaianPimpinan);
  });
};

/**
 * Get performance rating based on total score
 * 60-69.99 = Kurang Baik
 * 70-79.99 = Baik
 * >=80 = Sangat Baik
 */
export const getPerformanceRating = (totalScore: number): string => {
  if (totalScore >= 80) {
    return 'Sangat Baik';
  } else if (totalScore >= 70) {
    return 'Baik';
  } else if (totalScore >= 60) {
    return 'Kurang Baik';
  } else {
    return 'Kurang Baik'; // Below 60 also considered Kurang Baik
  }
};