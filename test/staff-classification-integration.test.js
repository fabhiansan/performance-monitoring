/**
 * Integration test for staff classification functionality
 * Tests end-to-end staff classification using Sub-Jabatan field priority
 */

import { parseEmployeeCSV } from '../services/csvParser.js';
import { parseEmployeeData } from '../services/parser.js';
import fs from 'fs';
import path from 'path';

// Test fixture path
const testFixturePath = path.join(process.cwd(), 'test', 'fixtures', 'staff-classification-test.csv');

console.log('🧪 Staff Classification Integration Tests');
console.log('==========================================\n');

// Verify test fixture exists
if (!fs.existsSync(testFixturePath)) {
  console.error('❌ Test fixture not found:', testFixturePath);
  process.exit(1);
}

// Load test CSV data
const csvContent = fs.readFileSync(testFixturePath, 'utf-8');
console.log('✅ Test fixture loaded successfully\n');

// Expected results based on our test data
const expectedResults = {
  // These should be classified as Staff due to "STAFF" in Sub-Jabatan, overriding position-based logic
  'TEST STAFF OVERRIDE 1, S.Sos': 'Staff',        // Kepala Sub Bagian + STAFF Perencanaan
  'TEST STAFF OVERRIDE 2, SE': 'Staff',           // Kepala Seksi + Staff Jaminan Sosial
  'TEST STAF OVERRIDE 3, S.ST': 'Staff',          // Kepala Bidang + STAF Rehabilitasi
  'TEST STAFF MIXED CASE, S.Pd': 'Staff',         // Sekretaris Dinas + staff administrasi
  'TEST STAFF SIMPLE, S.Sos': 'Staff',            // Kepala Sub Bagian + Staff
  'TEST STAF SIMPLE, SE': 'Staff',                // Kepala Seksi + STAF
  
  // These should follow normal position-based logic (no STAFF in Sub-Jabatan)
  'TEST REGULAR ESELON IV, S.ST': 'Eselon IV',    // Kepala Sub Bagian + Perencanaan Regular
  'TEST REGULAR ESELON III, S.Pd': 'Eselon III',  // Kepala Bidang + Rehabilitasi Regular
  'TEST REGULAR STAFF, S.Sos': 'Staff',           // Analis + Sekretariat (normal staff)
  'TEST EDGE CASE EMPTY, SE': 'Other'             // Unknown Position + Some Department
};

let totalTests = 0;
let passedTests = 0;

// Test 1: parseEmployeeCSV function
console.log('🔍 Testing parseEmployeeCSV function...');
console.log('-----------------------------------');

try {
  const employees = parseEmployeeCSV(csvContent);
  
  console.log(`Parsed ${employees.length} employees from test fixture\n`);
  
  employees.forEach(employee => {
    const expected = expectedResults[employee.name];
    if (expected) {
      totalTests++;
      const actual = employee.organizational_level;
      
      if (actual === expected) {
        passedTests++;
        console.log(`✅ ${employee.name}`);
        console.log(`   Position: "${employee.position}" | Sub-Position: "${employee.subPosition}"`);
        console.log(`   Result: ${actual} (correct)\n`);
      } else {
        console.log(`❌ ${employee.name}`);
        console.log(`   Position: "${employee.position}" | Sub-Position: "${employee.subPosition}"`);
        console.log(`   Expected: "${expected}" | Got: "${actual}"\n`);
      }
    }
  });
  
  console.log(`📊 parseEmployeeCSV: ${passedTests}/${totalTests} tests passed\n`);
  
} catch (error) {
  console.error('❌ Error testing parseEmployeeCSV:', error.message);
}

// Test 2: parseEmployeeData function
console.log('🔍 Testing parseEmployeeData function...');
console.log('----------------------------------');

let parseDataPassedTests = 0;
let parseDataTotalTests = 0;

try {
  const employeeMapping = parseEmployeeData(csvContent);
  
  console.log(`Parsed ${Object.keys(employeeMapping).length} employees from test fixture\n`);
  
  Object.entries(expectedResults).forEach(([name, expected]) => {
    const actual = employeeMapping[name];
    if (actual !== undefined) {
      parseDataTotalTests++;
      
      // For parseEmployeeData, we need to map the detailed position back to organizational category
      let actualCategory = 'Other';
      if (actual === 'Eselon II' || actual === 'Eselon III' || actual === 'Eselon IV') {
        actualCategory = actual;
      } else if (actual.includes('Staff')) {
        actualCategory = 'Staff';
      }
      
      if (actualCategory === expected) {
        parseDataPassedTests++;
        console.log(`✅ ${name}`);
        console.log(`   Detailed Position: "${actual}"`);
        console.log(`   Category: ${actualCategory} (correct)\n`);
      } else {
        console.log(`❌ ${name}`);
        console.log(`   Detailed Position: "${actual}"`);
        console.log(`   Expected Category: "${expected}" | Got Category: "${actualCategory}"\n`);
      }
    }
  });
  
  console.log(`📊 parseEmployeeData: ${parseDataPassedTests}/${parseDataTotalTests} tests passed\n`);
  
} catch (error) {
  console.error('❌ Error testing parseEmployeeData:', error.message);
}

// Test 3: Consistency check between both parsing methods
console.log('🔍 Testing consistency between parsing methods...');
console.log('-----------------------------------------------');

let consistencyPassedTests = 0;
let consistencyTotalTests = 0;

try {
  const csvEmployees = parseEmployeeCSV(csvContent);
  const dataEmployees = parseEmployeeData(csvContent);
  
  csvEmployees.forEach(csvEmp => {
    const dataResult = dataEmployees[csvEmp.name];
    if (dataResult) {
      consistencyTotalTests++;
      
      // Map parseEmployeeData result to organizational category
      let dataCategory = 'Other';
      if (dataResult === 'Eselon II' || dataResult === 'Eselon III' || dataResult === 'Eselon IV') {
        dataCategory = dataResult;
      } else if (dataResult.includes('Staff')) {
        dataCategory = 'Staff';
      }
      
      if (csvEmp.organizational_level === dataCategory) {
        consistencyPassedTests++;
        console.log(`✅ ${csvEmp.name}: Both methods agree on "${csvEmp.organizational_level}"`);
      } else {
        console.log(`❌ ${csvEmp.name}: parseEmployeeCSV="${csvEmp.organizational_level}" vs parseEmployeeData="${dataCategory}"`);
      }
    }
  });
  
  console.log(`\n📊 Consistency check: ${consistencyPassedTests}/${consistencyTotalTests} tests passed\n`);
  
} catch (error) {
  console.error('❌ Error testing consistency:', error.message);
}

// Final summary
const overallPassed = passedTests + parseDataPassedTests + consistencyPassedTests;
const overallTotal = totalTests + parseDataTotalTests + consistencyTotalTests;

console.log('🎯 INTEGRATION TEST SUMMARY');
console.log('============================');
console.log(`parseEmployeeCSV: ${passedTests}/${totalTests}`);
console.log(`parseEmployeeData: ${parseDataPassedTests}/${parseDataTotalTests}`);
console.log(`Consistency check: ${consistencyPassedTests}/${consistencyTotalTests}`);
console.log(`Overall: ${overallPassed}/${overallTotal} tests passed`);

if (overallPassed === overallTotal) {
  console.log('\n🎉 All integration tests passed! Staff classification is working correctly.');
} else {
  console.log(`\n⚠️  ${overallTotal - overallPassed} integration tests failed. Please review the implementation.`);
  process.exit(1);
}