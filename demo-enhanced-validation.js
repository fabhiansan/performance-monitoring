/**
 * Demo script for enhanced validation system
 * Shows the new edge case handling capabilities
 */

import { validatePerformanceData, VALIDATION_LIMITS } from './services/validationService.ts';

console.log('🔍 Enhanced Performance Data Validation Demo\n');
console.log('Validation Limits:', VALIDATION_LIMITS);
console.log('\n' + '='.repeat(60) + '\n');

// Test data with various edge cases
const testEmployees = [
  {
    id: 1,
    name: "John Doe",
    nip: "123456",
    organizational_level: "Staff",
    performance: [
      { name: "  leadership@#$  ", score: 85 },
      { name: "LEADERSHIP", score: 90 }, // Duplicate (different case/format)
      { name: "communication skills", score: 78 },
      { name: "teamwork", score: 82 },
      { name: "problem solving", score: 88 }
    ]
  },
  {
    id: 2,
    name: "Jane Smith",
    nip: "789012",
    organizational_level: "Manager",
    performance: [
      { name: "strategic thinking!!!", score: 92 },
      { name: "   strategic_thinking   ", score: 88 }, // Another duplicate
      { name: "decision making", score: 85 },
      { name: "a", score: 70 }, // Too short name
      { name: "x".repeat(101), score: 75 } // Too long name
    ]
  }
];

// Test with large array (if needed)
const largeTestData = [];
for (let i = 0; i < 15; i++) {
  largeTestData.push({
    id: i + 100,
    name: `Employee ${i}`,
    nip: `${100000 + i}`,
    organizational_level: "Staff",
    performance: Array.from({ length: 12 }, (_, j) => ({
      name: `competency_${j}`,
      score: Math.floor(Math.random() * 40) + 60
    }))
  });
}

console.log('📊 Testing Enhanced Validation Features:\n');

// Test 1: Basic edge cases
console.log('1. Testing competency name sanitization and duplicate merging:');
const result1 = validatePerformanceData(testEmployees);
console.log(`   Validation Result: ${result1.isValid ? '✅ Valid' : '❌ Invalid'}`);
console.log(`   Errors: ${result1.errors.length}`);
console.log(`   Warnings: ${result1.warnings.length}`);

if (result1.warnings.length > 0) {
  console.log('   Warning Details:');
  result1.warnings.forEach(warning => {
    console.log(`   - ${warning.type}: ${warning.message}`);
  });
}

if (result1.errors.length > 0) {
  console.log('   Error Details:');
  result1.errors.forEach(error => {
    console.log(`   - ${error.type}: ${error.message}`);
  });
}

console.log('\n' + '-'.repeat(40) + '\n');

// Test 2: Array size limits
console.log('2. Testing array size limits:');
const result2 = validatePerformanceData(largeTestData);
console.log(`   Validation Result: ${result2.isValid ? '✅ Valid' : '❌ Invalid'}`);
console.log(`   Total Employees: ${largeTestData.length}`);
console.log(`   Errors: ${result2.errors.length}`);
console.log(`   Warnings: ${result2.warnings.length}`);

if (result2.errors.length > 0) {
  console.log('   Error Details:');
  result2.errors.forEach(error => {
    console.log(`   - ${error.type}: ${error.message}`);
  });
}

console.log('\n' + '-'.repeat(40) + '\n');

// Test 3: Circular reference detection
console.log('3. Testing circular reference detection:');
const circularTestData = [
  {
    id: 1,
    name: "Self Reference Test",
    nip: "999999",
    organizational_level: "Staff",
    performance: [
      { name: "Self Reference Test", score: 85 }, // References own name
      { name: "normal competency", score: 78 }
    ]
  }
];

const result3 = validatePerformanceData(circularTestData);
console.log(`   Validation Result: ${result3.isValid ? '✅ Valid' : '❌ Invalid'}`);
console.log(`   Errors: ${result3.errors.length}`);
console.log(`   Warnings: ${result3.warnings.length}`);

if (result3.errors.length > 0 || result3.warnings.length > 0) {
  console.log('   Issue Details:');
  [...result3.errors, ...result3.warnings].forEach(issue => {
    console.log(`   - ${issue.type}: ${issue.message}`);
  });
}

console.log('\n' + '='.repeat(60));
console.log('✨ Enhanced validation demo completed!');
console.log('\nNew features demonstrated:');
console.log('• Circular reference detection');
console.log('• Array size limit enforcement');
console.log('• Competency name sanitization');
console.log('• Duplicate competency detection and merging');
console.log('• Enhanced error reporting and warnings');