/**
 * Employee data processing utilities extracted from parser service
 */

import { parseCsvLine } from './csvUtils';
import { determineOrganizationalLevelFromPosition, categorizeOrganizationalLevel } from './organizationalLevels';

export interface EmployeeMapping {
  [employeeName: string]: string;
}

/**
 * Determine detailed staff position based on position and subPosition fields
 */
export const determineStaffPosition = (position: string, subPosition: string, golongan: string): string => {
  const positionLower = position.toLowerCase();
  const subPositionLower = subPosition.toLowerCase();
  
  // Determine ASN/Non-ASN status based on golongan
  // ASN typically have structured golongan like "III/a", "II/b", etc.
  // Non-ASN might have different patterns or be empty
  const isASN = golongan && golongan.match(/^[IVX]+\/[a-d]$/i);
  const asnStatus = isASN ? 'ASN' : 'Non ASN';
  
  // Determine department/bidang based on position and subPosition
  if (positionLower.includes('sekretariat') || subPositionLower.includes('sekretariat')) {
    return `Staff ${asnStatus} Sekretariat`;
  } else if (positionLower.includes('hukum') || subPositionLower.includes('hukum')) {
    return `Staff ${asnStatus} Bidang Hukum`;
  } else if (positionLower.includes('pemberdayaan') || subPositionLower.includes('pemberdayaan')) {
    return `Staff ${asnStatus} Bidang Pemberdayaan Sosial`;
  } else if (positionLower.includes('rehabilitasi') || subPositionLower.includes('rehabilitasi')) {
    return `Staff ${asnStatus} Bidang Rehabilitasi Sosial`;
  } else if (positionLower.includes('perlindungan') || subPositionLower.includes('perlindungan') || 
             positionLower.includes('jaminan') || subPositionLower.includes('jaminan')) {
    return `Staff ${asnStatus} Bidang Perlindungan dan Jaminan Sosial`;
  } else if (positionLower.includes('bencana') || subPositionLower.includes('bencana') ||
             positionLower.includes('penanganan') || subPositionLower.includes('penanganan')) {
    return `Staff ${asnStatus} Bidang Penanganan Bencana`;
  } else {
    // Default fallback for unrecognized positions
    return `Staff ${asnStatus} Sekretariat`;
  }
};

/**
 * Parse employee data from CSV to extract name and position mappings
 */
export const parseEmployeeData = (csvText: string): EmployeeMapping => {
  const lines = csvText.trim().split('\n').filter(line => line.trim().length > 1);
  const employeeMapping: EmployeeMapping = {};
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    
    // Skip empty rows - expecting at least 6 columns for position and subPosition
    if (values.length < 6 || !values[1] || !values[3]) continue;
    
    const name = values[1].trim();
    const golongan = values[3].trim();
    const position = values[5]?.trim() || '';
    const subPosition = values[6]?.trim() || '';
    
    if (name) {
      const detailedPosition = determineEmployeePosition(position, subPosition, golongan);
      employeeMapping[name] = detailedPosition;
    }
  }
  
  return employeeMapping;
};

/**
 * Determine employee position based on organizational level rules
 */
export const determineEmployeePosition = (position: string, subPosition: string, golongan: string): string => {
  // Use enhanced organizational level determination with golongan-based inference
  const positionBasedLevel = determineOrganizationalLevelFromPosition(position, subPosition);
  const organizationalLevel = categorizeOrganizationalLevel(
    positionBasedLevel === 'Other' ? undefined : positionBasedLevel,
    golongan
  );
  
  // For Eselon levels, use the organizational level directly
  if (organizationalLevel === 'Eselon II' || organizationalLevel === 'Eselon III' || organizationalLevel === 'Eselon IV') {
    return organizationalLevel;
  } else if (organizationalLevel === 'Staff') {
    // For staff positions, determine detailed role based on position and subPosition
    return determineStaffPosition(position, subPosition, golongan);
  } else {
    // Fallback to staff position for unrecognized positions
    return determineStaffPosition(position, subPosition, golongan);
  }
};

/**
 * Resolve the most accurate organizational level from multiple sources
 */
export const resolveOrganizationalLevel = (
  employeeName: string,
  dynamicMapping: EmployeeMapping,
  orgLevelMapping: EmployeeMapping,
  dataOrganizationalLevel: string | null
): string => {
  const candidates: string[] = [
    dynamicMapping[employeeName],
    orgLevelMapping[employeeName],
    dataOrganizationalLevel,
  ].filter(Boolean) as string[];

  // Prefer any candidate that contains the word "eselon" (covers II/III/IV) over staff placeholders
  return candidates.find(level => /eselon/i.test(level)) || 
                        candidates[0] || 
                        'Staff/Other';
};