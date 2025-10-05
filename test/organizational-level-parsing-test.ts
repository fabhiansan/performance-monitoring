/**
 * Comprehensive unit tests for organizational level parsing functionality
 * Tests the enhanced parsing logic with actual data from sample-data/data_pegawai.csv
 */

import { determineOrganizationalLevelFromPosition, categorizeOrganizationalLevel } from '../utils/organizationalLevels';
import { parseEmployeeData } from '../services/parser';
import { parseEmployeeCSV } from '../services/csvParser';
import * as fs from 'fs';
import path from 'path';

// Constants for repeated string literals
const ESELON_II = 'Eselon II';
const ESELON_III = 'Eselon III';
const ESELON_IV = 'Eselon IV';
const KEPALA_DINAS = 'Kepala Dinas';
const KEPALA_BIDANG = 'Kepala Bidang';
const KEPALA_SUB_BAGIAN = 'Kepala Sub Bagian';
const KEPALA_SEKSI = 'Kepala Seksi';

// Test data based on actual CSV positions
const testPositions = [
  // ESELON_II positions (Department/Agency level)
  { position: 'Plt. Kepala Dinas Sosial', subPosition: 'Provinsi Kalimantan Selatan', expected: ESELON_II },
  { position: KEPALA_DINAS, subPosition: 'Sosial', expected: ESELON_II },
  { position: 'Kepala Badan', subPosition: 'Perencanaan', expected: ESELON_II },

  // ESELON_III positions (Division/Bureau level)
  { position: 'Sekretaris Dinas Sosial', subPosition: 'Provinsi Kalimantan Selatan', expected: ESELON_III },
  { position: KEPALA_BIDANG, subPosition: 'Perlindungan dan Jaminan Sosial', expected: ESELON_III },
  { position: KEPALA_BIDANG, subPosition: 'Penanganan Bencana', expected: ESELON_III },
  { position: KEPALA_BIDANG, subPosition: 'Rehabilitasi Sosial', expected: ESELON_III },

  // ESELON_IV positions (Section/Sub-division level)
  { position: KEPALA_SUB_BAGIAN, subPosition: 'Perencanaan dan Pelaporan', expected: ESELON_IV },
  { position: KEPALA_SUB_BAGIAN, subPosition: 'Umum dan Kepegawaian', expected: ESELON_IV },
  { position: KEPALA_SUB_BAGIAN, subPosition: 'Keuangan dan Aset', expected: ESELON_IV },
  { position: KEPALA_SEKSI, subPosition: 'Pengelolaan Data', expected: ESELON_IV },
  { position: KEPALA_SEKSI, subPosition: 'Jaminan Sosial Keluarga', expected: ESELON_IV },
  { position: KEPALA_SEKSI, subPosition: 'Perlindungan Sosial Korban Bencana Alam', expected: ESELON_IV },
  { position: KEPALA_SEKSI, subPosition: 'Rehabilitasi Sosial Anak', expected: ESELON_IV },

  // Staff positions (should be categorized as Staff)
  { position: 'Staf', subPosition: 'Bidang Hukum', expected: 'Staff' },
  { position: 'Analis', subPosition: 'Sekretariat', expected: 'Staff' },
  { position: 'Operator', subPosition: 'Bidang Penanganan Bencana', expected: 'Staff' },

  // NEW: Sub-Jabatan priority tests - positions that would be Eselon but have "STAFF" in Sub-Jabatan
  { position: 'Kepala Sub Bagian', subPosition: 'STAFF Perencanaan', expected: 'Staff' },
  { position: 'Kepala Seksi', subPosition: 'Staff Jaminan Sosial', expected: 'Staff' },
  { position: 'Kepala Bidang', subPosition: 'STAF Rehabilitasi Sosial', expected: 'Staff' },
  { position: 'Sekretaris Dinas', subPosition: 'staff administrasi', expected: 'Staff' },
  
  // NEW: Edge cases for different capitalizations and spellings
  { position: 'Kepala Sub Bagian', subPosition: 'Staff', expected: 'Staff' },
  { position: 'Kepala Seksi', subPosition: 'STAFF', expected: 'Staff' },
  { position: 'Kepala Bidang', subPosition: 'Staf', expected: 'Staff' },
  { position: 'Kepala Sub Bagian', subPosition: 'STAF', expected: 'Staff' },
  
  // NEW: Verify existing logic still works when Sub-Jabatan doesn't contain STAFF
  { position: 'Kepala Sub Bagian', subPosition: 'Perencanaan Regular', expected: 'ESELON_IV' },
  { position: 'Kepala Bidang', subPosition: 'Rehabilitasi Regular', expected: 'ESELON_III' },

  // Edge cases
  { position: '', subPosition: '', expected: 'Other' },
  { position: 'Unknown Position', subPosition: 'Some Department', expected: 'Other' }
];

// Test the core position-based categorization function
console.log('🧪 Testing determineOrganizationalLevelFromPosition function...\n');

let passedTests = 0;
let totalTests = 0;
let csvPassedTests = 0;
let csvTotalTests = 0;
let csvParserPassedTests = 0;
let csvParserTotalTests = 0;

testPositions.forEach((test, index) => {
  totalTests++;
  const result = determineOrganizationalLevelFromPosition(test.position, test.subPosition);
  const passed = result === test.expected;
  
  if (passed) {
    passedTests++;
    console.log(`✅ Test ${index + 1}: PASSED`);
  } else {
    console.log(`❌ Test ${index + 1}: FAILED`);
    console.log(`   Position: "${test.position}"`);
    console.log(`   Sub-Position: "${test.subPosition}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got: "${result}"`);
  }
});

console.log(`\n📊 Position-based categorization: ${passedTests}/${totalTests} tests passed\n`);

// Test with actual CSV data if available
const csvPath = path.join(process.cwd(), 'sample-data', 'data_pegawai.csv');

if (fs.existsSync(csvPath)) {
  console.log('🧪 Testing with actual CSV data from sample-data/data_pegawai.csv...\n');
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Test parseEmployeeData function
    console.log('Testing parseEmployeeData function:');
    const employeeMapping = parseEmployeeData(csvContent);
    
    // Expected categorizations based on actual CSV data
    const expectedCategorizations: Record<string, string> = {
      'MUHAMMADUN, A.KS, M.I.Kom': 'ESELON_II',      // Plt. Kepala Dinas Sosial
      'MURJANI, S.Pd, MM': 'ESELON_III',              // Sekretaris Dinas Sosial
      'GUSNANDA EFFENDI, S.Pd, MM': 'ESELON_III',     // Kepala Bidang
      'H. ACHMADI, S.Sos': 'ESELON_III',              // Kepala Bidang
      'SELAMAT RIADI, S.Sos, M.AP': 'ESELON_III',     // Kepala Bidang
      'HANDIASTY EKA WARDHANI, SE, MM': 'ESELON_IV',  // Kepala Sub Bagian
      'MASWIAH, SE': 'ESELON_IV',                     // Kepala Sub Bagian
      'SUSANTI, SE': 'ESELON_IV',                     // Kepala Sub Bagian
      'SUGIYONO, S.ST': 'ESELON_IV',                  // Kepala Seksi
      'AKHMAD YULIADIE, ST': 'ESELON_IV'              // Kepala Seksi
    };
    
    csvPassedTests = 0;
    csvTotalTests = 0;
    
    Object.entries(expectedCategorizations).forEach(([name, expected]) => {
      csvTotalTests++;
      const actual = employeeMapping[name]?.organizational_level;

      if (actual === expected) {
        csvPassedTests++;
        console.log(`✅ ${name}: ${actual} (correct)`);
      } else {
        console.log(`❌ ${name}: Expected "${expected}", got "${actual || "(missing)"}"`);
      }
    });
    
    console.log(`\n📊 CSV parseEmployeeData: ${csvPassedTests}/${csvTotalTests} tests passed\n`);
    
    // Test parseEmployeeCSV function
    console.log('Testing parseEmployeeCSV function:');
    const csvParseResult = parseEmployeeCSV(csvContent);
    const employees = csvParseResult.employees;
    
    csvParserPassedTests = 0;
    csvParserTotalTests = 0;
    
    employees.forEach(emp => {
      if (expectedCategorizations[emp.name]) {
        csvParserTotalTests++;
        const expected = expectedCategorizations[emp.name];
        
        if (emp.organizational_level === expected) {
          csvParserPassedTests++;
          console.log(`✅ ${emp.name}: ${emp.organizational_level} (correct)`);
        } else {
          console.log(`❌ ${emp.name}: Expected "${expected}", got "${emp.organizational_level}"`);
        }
      }
    });
    
    console.log(`\n📊 CSV parseEmployeeCSV: ${csvParserPassedTests}/${csvParserTotalTests} tests passed\n`);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error testing with CSV data:', message);
  }
} else {
  console.log('⚠️  Sample CSV file not found, skipping CSV-based tests\n');
}

// Test categorizeOrganizationalLevel function with edge cases
console.log('🧪 Testing categorizeOrganizationalLevel function...\n');

const categorizationTests: Array<{ input: string | null | undefined; expected: string }> = [
  { input: 'ESELON_II', expected: 'ESELON_II' },
  { input: 'ESELON_III', expected: 'ESELON_III' },
  { input: 'ESELON_IV', expected: 'ESELON_IV' },
  { input: 'Staff ASN Sekretariat', expected: 'Staff' },
  { input: 'Staff Non ASN Bidang Hukum', expected: 'Staff' },
  { input: 'eselon ii', expected: 'ESELON_II' },
  { input: 'ESELON III', expected: 'ESELON_III' },
  { input: '  ESELON_IV  ', expected: 'ESELON_IV' },
  { input: 'Es II', expected: 'ESELON_II' },
  { input: 'Esl III', expected: 'ESELON_III' },
  { input: '', expected: 'Other' },
  { input: null, expected: 'Other' },
  { input: undefined, expected: 'Other' },
  { input: 'Invalid Level', expected: 'Other' }
];

let categorizePassedTests = 0;
let categorizeTotalTests = 0;

categorizationTests.forEach((test, index) => {
  categorizeTotalTests++;
  const result = categorizeOrganizationalLevel(test.input);
  const passed = result === test.expected;
  
  if (passed) {
    categorizePassedTests++;
    console.log(`✅ Test ${index + 1}: "${test.input}" → "${result}" (correct)`);
  } else {
    console.log(`❌ Test ${index + 1}: "${test.input}" → Expected "${test.expected}", got "${result}"`);
  }
});

console.log(`\n📊 Categorization function: ${categorizePassedTests}/${categorizeTotalTests} tests passed\n`);

// Summary
const overallPassed = passedTests + csvPassedTests + csvParserPassedTests + categorizePassedTests;
const overallTotal = totalTests + csvTotalTests + csvParserTotalTests + categorizeTotalTests;

console.log('🎯 TEST SUMMARY');
console.log('================');
console.log(`Position-based categorization: ${passedTests}/${totalTests}`);
console.log(`CSV parseEmployeeData: ${csvPassedTests || 0}/${csvTotalTests || 0}`);
console.log(`CSV parseEmployeeCSV: ${csvParserPassedTests || 0}/${csvParserTotalTests || 0}`);
console.log(`Categorization function: ${categorizePassedTests}/${categorizeTotalTests}`);
console.log(`Overall: ${overallPassed}/${overallTotal} tests passed`);

if (overallPassed === overallTotal) {
  console.log('\n🎉 All tests passed! Organizational level parsing is working correctly.');
} else {
  console.log(`\n⚠️  ${overallTotal - overallPassed} tests failed. Please review the implementation.`);
  process.exit(1);
}
