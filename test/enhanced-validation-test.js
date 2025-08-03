/**
 * Test script for enhanced validation system edge cases
 * Tests circular references, array size limits, competency name sanitization, and duplicate merging
 * Run with: node test/enhanced-validation-test.js
 */

import { validatePerformanceData, VALIDATION_LIMITS } from '../services/validationService.ts';

// Test case 1: Array size limits
const testArraySizeLimits = () => {
  console.log('\n🔍 Testing Array Size Limits\n');
  
  // Create employee with too many competencies
  const employeeWithTooManyCompetencies = {
    id: 1,
    name: 'Test Employee',
    nip: '123456789',
    gol: 'III/a',
    pangkat: 'Penata Muda',
    position: 'Staff',
    sub_position: 'Admin',
    organizational_level: 'Staff ASN',
    performance: []
  };
  
  // Add more competencies than allowed
  for (let i = 0; i < VALIDATION_LIMITS.MAX_COMPETENCY_COUNT + 5; i++) {
    employeeWithTooManyCompetencies.performance.push({
      name: `Competency ${i + 1}`,
      score: 85
    });
  }
  
  const result = validatePerformanceData([employeeWithTooManyCompetencies]);
  console.log(`   ❌ Errors found: ${result.errors.length}`);
  console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
  
  const arraySizeErrors = result.errors.filter(err => err.type === 'array_size_exceeded');
  console.log(`   📊 Array size errors: ${arraySizeErrors.length}`);
  if (arraySizeErrors.length > 0) {
    console.log(`   📝 Details: ${arraySizeErrors[0].details}`);
  }
};

// Test case 2: Circular reference detection
const testCircularReferences = () => {
  console.log('\n🔄 Testing Circular Reference Detection\n');
  
  const employeesWithDuplicateIds = [
    {
      id: 1,
      name: 'John Doe',
      nip: '123456789',
      gol: 'III/a',
      pangkat: 'Penata Muda',
      position: 'Staff',
      sub_position: 'Admin',
      organizational_level: 'Staff ASN',
      performance: [
        { name: 'kualitas kinerja', score: 85 },
        { name: 'kualitas kinerja', score: 90 } // Duplicate competency
      ]
    },
    {
      id: 1, // Same ID as above
      name: 'John Doe', // Same name as above
      nip: '987654321',
      gol: 'III/b',
      pangkat: 'Penata Muda Tingkat I',
      position: 'Senior Staff',
      sub_position: 'Supervisor',
      organizational_level: 'Staff ASN',
      performance: [
        { name: 'kepemimpinan', score: 88 }
      ]
    }
  ];
  
  const result = validatePerformanceData(employeesWithDuplicateIds);
  console.log(`   ❌ Errors found: ${result.errors.length}`);
  console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
  
  const circularErrors = result.errors.filter(err => err.type === 'circular_reference');
  console.log(`   🔄 Circular reference errors: ${circularErrors.length}`);
  if (circularErrors.length > 0) {
    console.log(`   📝 Details: ${circularErrors[0].details}`);
  }
};

// Test case 3: Competency name sanitization
const testCompetencyNameSanitization = () => {
  console.log('\n🧹 Testing Competency Name Sanitization\n');
  
  const employeeWithBadNames = {
    id: 1,
    name: 'Test Employee',
    nip: '123456789',
    gol: 'III/a',
    pangkat: 'Penata Muda',
    position: 'Staff',
    sub_position: 'Admin',
    organizational_level: 'Staff ASN',
    performance: [
      { name: '  kualitas@#$%kinerja!!!  ', score: 85 }, // Needs sanitization
      { name: 'a', score: 90 }, // Too short
      { name: 'x'.repeat(150), score: 75 }, // Too long
      { name: '', score: 80 }, // Empty name
      { name: null, score: 85 }, // Null name
      { name: 'kepemimpinan   dan   komunikasi', score: 88 } // Multiple spaces
    ]
  };
  
  const result = validatePerformanceData([employeeWithBadNames]);
  console.log(`   ❌ Errors found: ${result.errors.length}`);
  console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
  
  const nameErrors = result.errors.filter(err => err.type === 'invalid_competency_name');
  const sanitizedWarnings = result.warnings.filter(warn => warn.type === 'competency_sanitized');
  
  console.log(`   🚫 Invalid name errors: ${nameErrors.length}`);
  console.log(`   🧹 Sanitized warnings: ${sanitizedWarnings.length}`);
  
  if (sanitizedWarnings.length > 0) {
    console.log(`   📝 Sanitization example: ${sanitizedWarnings[0].details}`);
  }
};

// Test case 4: Duplicate competency detection and merging
const testDuplicateCompetencyMerging = () => {
  console.log('\n🔀 Testing Duplicate Competency Detection and Merging\n');
  
  const employeeWithDuplicates = {
    id: 1,
    name: 'Test Employee',
    nip: '123456789',
    gol: 'III/a',
    pangkat: 'Penata Muda',
    position: 'Staff',
    sub_position: 'Admin',
    organizational_level: 'Staff ASN',
    performance: [
      { name: 'kualitas kinerja', score: 85 },
      { name: 'Kualitas Kinerja', score: 90 }, // Duplicate with different case
      { name: 'KUALITAS KINERJA', score: 88 }, // Another duplicate
      { name: 'kepemimpinan', score: 92 },
      { name: 'kepemimpinan dan komunikasi', score: 87 }, // Similar but different
      { name: 'komunikasi', score: 89 },
      { name: 'kemampuan berkomunikasi', score: 91 } // Similar to komunikasi
    ]
  };
  
  console.log(`   📊 Original competency count: ${employeeWithDuplicates.performance.length}`);
  
  const result = validatePerformanceData([employeeWithDuplicates]);
  console.log(`   ❌ Errors found: ${result.errors.length}`);
  console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
  
  const mergedWarnings = result.warnings.filter(warn => warn.type === 'competency_merged');
  console.log(`   🔀 Merged competencies: ${mergedWarnings.length}`);
  
  if (mergedWarnings.length > 0) {
    mergedWarnings.forEach(warning => {
      console.log(`   📝 Merged: ${warning.competencyName} - ${warning.details}`);
    });
  }
  
  // Check final competency count after merging
  console.log(`   📊 Final competency count: ${employeeWithDuplicates.performance.length}`);
};

// Test case 5: Combined edge cases
const testCombinedEdgeCases = () => {
  console.log('\n🎯 Testing Combined Edge Cases\n');
  
  const complexTestData = [
    {
      id: 1,
      name: 'Complex Employee 1',
      nip: '123456789',
      gol: 'III/a',
      pangkat: 'Penata Muda',
      position: 'Staff',
      sub_position: 'Admin',
      organizational_level: 'Staff ASN',
      performance: [
        { name: '  kualitas@kinerja  ', score: 85 }, // Needs sanitization
        { name: 'kualitas kinerja', score: 90 }, // Duplicate after sanitization
        { name: 'a', score: 75 }, // Too short
        { name: 'kepemimpinan', score: 88 },
        { name: 'KEPEMIMPINAN', score: 92 } // Duplicate with different case
      ]
    },
    {
      id: 2,
      name: 'Complex Employee 2',
      nip: '987654321',
      gol: 'III/b',
      pangkat: 'Penata Muda Tingkat I',
      position: 'Senior Staff',
      sub_position: 'Supervisor',
      organizational_level: 'Staff ASN',
      performance: []
    }
  ];
  
  // Add many competencies to test array limits
  for (let i = 0; i < 30; i++) {
    complexTestData[1].performance.push({
      name: `Competency ${i + 1}`,
      score: 80 + (i % 20)
    });
  }
  
  const result = validatePerformanceData(complexTestData);
  console.log(`   ❌ Total errors: ${result.errors.length}`);
  console.log(`   ⚠️  Total warnings: ${result.warnings.length}`);
  console.log(`   📊 Data completeness: ${result.summary.dataCompleteness}%`);
  console.log(`   🎯 Score quality: ${result.summary.scoreQuality}`);
  
  // Breakdown by error type
  const errorTypes = {};
  result.errors.forEach(error => {
    errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
  });
  
  console.log('   📋 Error breakdown:');
  Object.entries(errorTypes).forEach(([type, count]) => {
    console.log(`      - ${type}: ${count}`);
  });
  
  // Breakdown by warning type
  const warningTypes = {};
  result.warnings.forEach(warning => {
    warningTypes[warning.type] = (warningTypes[warning.type] || 0) + 1;
  });
  
  console.log('   📋 Warning breakdown:');
  Object.entries(warningTypes).forEach(([type, count]) => {
    console.log(`      - ${type}: ${count}`);
  });
};

// Run all tests
console.log('🚀 Enhanced Validation System Edge Case Tests');
console.log('=' .repeat(50));

testArraySizeLimits();
testCircularReferences();
testCompetencyNameSanitization();
testDuplicateCompetencyMerging();
testCombinedEdgeCases();

console.log('\n✅ All edge case tests completed!');
console.log('=' .repeat(50));