import { Employee, CompetencyScore } from '../types';

export interface PerformanceRecap {
  perilakuKinerja: number; // 30% weight
  kualitasKerja: number;   // 50% for Eselon, 70% for Staff
  penilaianPimpinan: number; // 20% weight for Eselon, 0% for Staff (manual input)
  totalNilai: number;
  positionType: 'eselon' | 'staff'; // Track position type for evaluation
}

export interface RecapEmployee extends Employee {
  performanceRecap: PerformanceRecap;
}

// Parameter mapping based on revised rekap_calculation.md - ACTUAL WEIGHT VALUES
const PARAMETER_WEIGHTS = {
  // Parameters 1-4, 6 for Perilaku Kinerja (ACTUAL WEIGHTS FROM FILE)
  perilakuKinerja: {
    // Using actual weight values from the markdown file
    weights: [4.25, 4.25, 4.25, 4.25, 8.5], // Max total: 25.5
    parameters: [
      'inisiatif dan fleksibilitas',    // 4.25 (param 1)
      'kehadiran dan ketepatan waktu',  // 4.25 (param 2) 
      'kerjasama dan team work',        // 4.25 (param 3)
      'manajemen waktu kerja',          // 4.25 (param 4)
      'kepemimpinan'                    // 8.5 (param 6)
    ]
  },
  // Parameter 5, 7, 8 for Kualitas Kerja (ESELON)
  kualitasKerjaEselon: {
    weights: [25.5, 8.5, 8.5], // Max total: 42.5 (for Eselon III & IV)
    parameters: [
      'kualitas kinerja',              // 25.5 (param 5)
      'kemampuan berkomunikasi',       // 8.5 (param 7)
      'pemahaman tentang permasalahan sosial' // 8.5 (param 8)
    ]
  },
  // Parameter 5, 7, 8 for Staff (DIFFERENT WEIGHTS - incomplete in markdown)
  kualitasKerjaStaff: {
    // Staff section is incomplete in markdown, using proportional weights for 70%
    weights: [42.5, 8.5, 8.5], // Estimated for 70% total (Kualitas Kinerja 50% for staff)
    parameters: [
      'kualitas kinerja',              // 42.5 estimated (50% for staff)
      'kemampuan berkomunikasi',       // 8.5 (param 7)
      'pemahaman tentang permasalahan sosial' // 8.5 (param 8)
    ]
  }
};

/**
 * Determines if employee is Eselon III/IV or Staff based on position
 */
const getPositionType = (employee: Employee): 'eselon' | 'staff' => {
  const position = employee.job?.toLowerCase() || '';
  
  // Check for Eselon III and IV indicators
  if (position.includes('eselon') || 
      position.includes('kepala') || 
      position.includes('manager') ||
      position.includes('direktur') ||
      position.includes('kabag') ||
      position.includes('kasubag') ||
      position.includes('pimpinan')) {
    return 'eselon';
  }
  
  // Default to staff for all other positions
  return 'staff';
};

/**
 * Finds competency score by partial name matching
 */
const findCompetencyScore = (performance: CompetencyScore[], searchTerms: string[]): number => {
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
 * Calculate Perilaku Kinerja score using actual weight values
 * Sum of parameters 1, 2, 3, 4, 6 with weights 4.25, 4.25, 4.25, 4.25, 8.5 (Max: 25.5)
 */
export const calculatePerilakuKinerja = (performance: CompetencyScore[]): number => {
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

  return parseFloat(totalScore.toFixed(2));
};

/**
 * Calculate Kualitas Kerja score using actual weight values (position-based)
 * Eselon: weights 25.5, 8.5, 8.5 (Max: 42.5)
 * Staff: weights 42.5, 8.5, 8.5 (estimated for 70% total)
 */
export const calculateKualitasKerja = (performance: CompetencyScore[], positionType: 'eselon' | 'staff'): number => {
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

  return parseFloat(totalScore.toFixed(2));
};

/**
 * Calculate total performance score using actual weighted values (position-based)
 */
export const calculateTotalScore = (
  perilakuKinerja: number,      // Already weighted (max 25.5)
  kualitasKerja: number,        // Already weighted (max 42.5 for eselon, estimated for staff)
  penilaianPimpinan: number,    // Raw score 0-100
  positionType: 'eselon' | 'staff'
): number => {
  if (positionType === 'eselon') {
    // Eselon III & IV: Sum weighted scores + Penilaian Pimpinan weighted by 17 (max from 20%)
    const penilaianPimpinanWeighted = (penilaianPimpinan / 100) * 17; // Max 17 for 20%
    const total = perilakuKinerja + kualitasKerja + penilaianPimpinanWeighted;
    return parseFloat(total.toFixed(2));
  } else {
    // Staff: Sum weighted scores only (no Penilaian Pimpinan)
    const total = perilakuKinerja + kualitasKerja;
    return parseFloat(total.toFixed(2));
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
    const penilaianPimpinan = manualScores[employee.name] || 80; // Default 80 (16 points out of 20)
    return generateEmployeeRecap(employee, penilaianPimpinan);
  });
};