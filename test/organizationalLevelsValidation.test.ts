/**
 * Test file for organizational level validation functionality
 * Demonstrates the data inconsistency detection feature
 */

import {
  categorizeOrganizationalLevel,
  validateOrganizationalDataConsistency,
  DataInconsistencyWarning
} from '../utils/organizationalLevels';

// Test cases for data inconsistency validation
const testCases = [
  {
    description: 'High inconsistency: Golongan IV/d (Eselon II) with Staff position',
    level: 'Staff ASN Sekretariat',
    golongan: 'IV/d',
    expectedWarning: true,
    expectedSeverity: 'medium'
  },
  {
    description: 'Very high inconsistency: Golongan IV/e (Eselon II) with Staff position',
    level: 'Staff ASN Bidang Hukum',
    golongan: 'IV/e',
    expectedWarning: true,
    expectedSeverity: 'medium'
  },
  {
    description: 'Medium inconsistency: Golongan IV/a (Eselon III) with Staff position',
    level: 'Staff Non ASN Sekretariat',
    golongan: 'IV/a',
    expectedWarning: true,
    expectedSeverity: 'medium'
  },
  {
    description: 'No inconsistency: Golongan III/c (Eselon IV) with Eselon IV position',
    level: 'Eselon IV',
    golongan: 'III/c',
    expectedWarning: false,
    expectedSeverity: null
  },
  {
    description: 'No inconsistency: Golongan III/a (Staff) with Staff position',
    level: 'Staff ASN Sekretariat',
    golongan: 'III/a',
    expectedWarning: false,
    expectedSeverity: null
  },
  {
    description: 'High inconsistency: Golongan IV/c (Eselon II) with Other position',
    level: 'Unknown Position',
    golongan: 'IV/c',
    expectedWarning: true,
    expectedSeverity: 'high'
  }
];

// Run tests
console.log('=== Organizational Level Data Consistency Validation Tests ===\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`Input: Level="${testCase.level}", Golongan="${testCase.golongan}"`);
  
  // Test the validation function
  const warning = validateOrganizationalDataConsistency(testCase.level, testCase.golongan);
  
  if (testCase.expectedWarning) {
    if (warning) {
      console.log(`✅ Warning detected as expected`);
      console.log(`   Severity: ${warning.severity} (expected: ${testCase.expectedSeverity})`);
      console.log(`   Message: ${warning.message}`);
      
      if (warning.severity === testCase.expectedSeverity) {
        console.log(`✅ Severity matches expected level`);
      } else {
        console.log(`❌ Severity mismatch: got ${warning.severity}, expected ${testCase.expectedSeverity}`);
      }
    } else {
      console.log(`❌ Expected warning but none was generated`);
    }
  } else {
    if (warning) {
      console.log(`❌ Unexpected warning generated: ${warning.message}`);
    } else {
      console.log(`✅ No warning generated as expected`);
    }
  }
  
  // Test the main categorization function (this will also log warnings)
  console.log(`\nTesting categorizeOrganizationalLevel function:`);
  const result = categorizeOrganizationalLevel(testCase.level, testCase.golongan);
  console.log(`Result: ${result}`);
  
  console.log('\n' + '='.repeat(80) + '\n');
});

console.log('Tests completed. Check console output for any logged warnings from categorizeOrganizationalLevel.');