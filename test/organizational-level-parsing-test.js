/**
 * Comprehensive unit tests for organizational level parsing functionality
 * Tests the enhanced parsing logic with actual data from sample-data/data_pegawai.csv
 */

import { determineOrganizationalLevelFromPosition, categorizeOrganizationalLevel } from '../utils/organizationalLevels.js';
import { parseEmployeeData } from '../services/parser.js';
import { parseEmployeeCSV } from '../services/csvParser.js';
import fs from 'fs';
import path from 'path';

// Test data based on actual CSV positions
const testPositions = [
  // Eselon II positions (Department/Agency level)
  { position: 'Plt. Kepala Dinas Sosial', subPosition: 'Provinsi Kalimantan Selatan', expected: 'Eselon II' },
  { position: 'Kepala Dinas', subPosition: 'Sosial', expected: 'Eselon II' },
  { position: 'Kepala Badan', subPosition: 'Perencanaan', expected: 'Eselon II' },

  // Eselon III positions (Division/Bureau level)
  { position: 'Sekretaris Dinas Sosial', subPosition: 'Provinsi Kalimantan Selatan', expected: 'Eselon III' },
  { position: 'Kepala Bidang', subPosition: 'Perlindungan dan Jaminan Sosial', expected: 'Eselon III' },
  { position: 'Kepala Bidang', subPosition: 'Penanganan Bencana', expected: 'Eselon III' },
  { position: 'Kepala Bidang', subPosition: 'Rehabilitasi Sosial', expected: 'Eselon III' },

  // Eselon IV positions (Section/Sub-division level)
  { position: 'Kepala Sub Bagian', subPosition: 'Perencanaan dan Pelaporan', expected: 'Eselon IV' },
  { position: 'Kepala Sub Bagian', subPosition: 'Umum dan Kepegawaian', expected: 'Eselon IV' },
  { position: 'Kepala Sub Bagian', subPosition: 'Keuangan dan Aset', expected: 'Eselon IV' },
  { position: 'Kepala Seksi', subPosition: 'Pengelolaan Data', expected: 'Eselon IV' },
  { position: 'Kepala Seksi', subPosition: 'Jaminan Sosial Keluarga', expected: 'Eselon IV' },
  { position: 'Kepala Seksi', subPosition: 'Perlindungan Sosial Korban Bencana Alam', expected: 'Eselon IV' },
  { position: 'Kepala Seksi', subPosition: 'Rehabilitasi Sosial Anak', expected: 'Eselon IV' },

  // Staff positions (should be categorized as Staff)
  { position: 'Staf', subPosition: 'Bidang Hukum', expected: 'Staff' },
  { position: 'Analis', subPosition: 'Sekretariat', expected: 'Staff' },
  { position: 'Operator', subPosition: 'Bidang Penanganan Bencana', expected: 'Staff' },

  // Edge cases
  { position: '', subPosition: '', expected: 'Other' },
  { position: 'Unknown Position', subPosition: 'Some Department', expected: 'Other' }
];

// Test the core position-based categorization function
console.log('🧪 Testing determineOrganizationalLevelFromPosition function...\n');

let passedTests = 0;
let totalTests = 0;

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
    const expectedCategorizations = {
      'MUHAMMADUN, A.KS, M.I.Kom': 'Eselon II',      // Plt. Kepala Dinas Sosial
      'MURJANI, S.Pd, MM': 'Eselon III',              // Sekretaris Dinas Sosial
      'GUSNANDA EFFENDI, S.Pd, MM': 'Eselon III',     // Kepala Bidang
      'H. ACHMADI, S.Sos': 'Eselon III',              // Kepala Bidang
      'SELAMAT RIADI, S.Sos, M.AP': 'Eselon III',     // Kepala Bidang
      'HANDIASTY EKA WARDHANI, SE, MM': 'Eselon IV',  // Kepala Sub Bagian
      'MASWIAH, SE': 'Eselon IV',                     // Kepala Sub Bagian
      'SUSANTI, SE': 'Eselon IV',                     // Kepala Sub Bagian
      'SUGIYONO, S.ST': 'Eselon IV',                  // Kepala Seksi
      'AKHMAD YULIADIE, ST': 'Eselon IV'              // Kepala Seksi
    };
    
    let csvPassedTests = 0;
    let csvTotalTests = 0;
    
    Object.entries(expectedCategorizations).forEach(([name, expected]) => {
      csvTotalTests++;
      const actual = employeeMapping[name];
      
      if (actual === expected) {
        csvPassedTests++;
        console.log(`✅ ${name}: ${actual} (correct)`);
      } else {
        console.log(`❌ ${name}: Expected "${expected}", got "${actual}"`);
      }
    });
    
    console.log(`\n📊 CSV parseEmployeeData: ${csvPassedTests}/${csvTotalTests} tests passed\n`);
    
    // Test parseEmployeeCSV function
    console.log('Testing parseEmployeeCSV function:');
    const employees = parseEmployeeCSV(csvContent);
    
    let csvParserPassedTests = 0;
    let csvParserTotalTests = 0;
    
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
    console.error('❌ Error testing with CSV data:', error.message);
  }
} else {
  console.log('⚠️  Sample CSV file not found, skipping CSV-based tests\n');
}

// Test categorizeOrganizationalLevel function with edge cases
console.log('🧪 Testing categorizeOrganizationalLevel function...\n');

const categorizationTests = [
  { input: 'Eselon II', expected: 'Eselon II' },
  { input: 'Eselon III', expected: 'Eselon III' },
  { input: 'Eselon IV', expected: 'Eselon IV' },
  { input: 'Staff ASN Sekretariat', expected: 'Staff' },
  { input: 'Staff Non ASN Bidang Hukum', expected: 'Staff' },
  { input: 'eselon ii', expected: 'Eselon II' },
  { input: 'ESELON III', expected: 'Eselon III' },
  { input: '  Eselon IV  ', expected: 'Eselon IV' },
  { input: 'Es II', expected: 'Eselon II' },
  { input: 'Esl III', expected: 'Eselon III' },
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