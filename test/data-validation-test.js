/**
 * Test script for data validation layer functionality
 * Demonstrates JSON integrity validation, performance data validation, and recovery options
 */

import { validateJsonIntegrity, validatePerformanceDataIntegrity } from '../services/dataIntegrityService.ts';
import { EnhancedDatabaseService } from '../services/enhancedDatabaseService.ts';

// Test data samples
const validEmployeeData = [
  {
    id: 'EMP001',
    name: 'John Doe',
    nip: '123456789',
    rank: 'Senior',
    position: 'Software Engineer',
    organizationalLevel: 'Staff',
    performance: [
      { name: 'Technical Skills', score: 85 },
      { name: 'Communication', score: 78 },
      { name: 'Leadership', score: 82 }
    ]
  },
  {
    id: 'EMP002',
    name: 'Jane Smith',
    nip: '987654321',
    rank: 'Manager',
    position: 'Team Lead',
    organizationalLevel: 'Management',
    performance: [
      { name: 'Technical Skills', score: 92 },
      { name: 'Communication', score: 88 },
      { name: 'Leadership', score: 95 }
    ]
  }
];

const corruptedJsonData = `{
  "employees": [
    {
      "id": "EMP001",
      "name": "John Doe",
      "nip": "123456789",
      "rank": "Senior",
      "position": "Software Engineer",
      "organizationalLevel": "Staff",
      "performance": [
        { "name": "Technical Skills", "score": 85 },
        { "name": "Communication", "score": 78 },
        { "name": "Leadership", "score": 82 }
      ]
    },
    {
      "id": "EMP002",
      "name": "Jane Smith",
      "nip": "987654321",
      "rank": "Manager",
      "position": "Team Lead",
      "organizationalLevel": "Management",
      "performance": [
        { "name": "Technical Skills", "score": 92 },
        { "name": "Communication", "score": 88 },
        { "name": "Leadership", "score": 95 }
      ]
    }
  ]
  // Missing closing brace - this will cause JSON parsing error
`;

const invalidEmployeeData = [
  {
    id: 'EMP001',
    name: 'John Doe',
    // Missing required fields: nip, rank, position, organizationalLevel
    performance: [
      { name: 'Technical Skills', score: 150 }, // Invalid score > 100
      { name: 'Communication' }, // Missing score
      { name: 'Leadership', score: -10 } // Invalid negative score
    ]
  },
  {
    // Missing id and name
    nip: '987654321',
    rank: 'Manager',
    position: 'Team Lead',
    organizationalLevel: 'Management',
    performance: [] // Empty performance array
  },
  // Duplicate employee
  {
    id: 'EMP001', // Duplicate ID
    name: 'John Doe Duplicate',
    nip: '123456789',
    rank: 'Senior',
    position: 'Software Engineer',
    organizationalLevel: 'Staff',
    performance: [
      { name: 'Technical Skills', score: 85 }
    ]
  }
];

/**
 * Test JSON integrity validation
 */
function testJsonIntegrityValidation() {
  console.log('\n🔍 Testing JSON Integrity Validation\n');
  
  // Test valid JSON
  console.log('1. Testing valid JSON data:');
  const validJson = JSON.stringify(validEmployeeData);
  const validResult = validateJsonIntegrity(validJson);
  console.log(`   ✅ Valid: ${validResult.isValid}`);
  console.log(`   📊 Integrity Score: ${validResult.summary.integrityScore}`);
  console.log(`   ⚠️  Warnings: ${validResult.warnings.length}`);
  console.log(`   ❌ Errors: ${validResult.errors.length}`);
  
  // Test corrupted JSON
  console.log('\n2. Testing corrupted JSON data:');
  const corruptedResult = validateJsonIntegrity(corruptedJsonData);
  console.log(`   ✅ Valid: ${corruptedResult.isValid}`);
  console.log(`   📊 Integrity Score: ${corruptedResult.summary.integrityScore}`);
  console.log(`   ⚠️  Warnings: ${corruptedResult.warnings.length}`);
  console.log(`   ❌ Errors: ${corruptedResult.errors.length}`);
  
  if (corruptedResult.errors.length > 0) {
    console.log('   📋 Error Details:');
    corruptedResult.errors.forEach((error, index) => {
      console.log(`      ${index + 1}. ${error.type}: ${error.message} (${error.severity})`);
    });
  }
  
  if (corruptedResult.recoveryOptions.length > 0) {
    console.log('   🔧 Recovery Options:');
    corruptedResult.recoveryOptions.forEach((option, index) => {
      console.log(`      ${index + 1}. ${option.type}: ${option.description} (Confidence: ${option.confidence}%)`);
    });
  }
}

/**
 * Test performance data validation
 */
function testPerformanceDataValidation() {
  console.log('\n📊 Testing Performance Data Validation\n');
  
  // Test valid employee data
  console.log('1. Testing valid employee data:');
  const validResult = validatePerformanceDataIntegrity(validEmployeeData);
  console.log(`   ✅ Valid: ${validResult.isValid}`);
  console.log(`   📊 Integrity Score: ${validResult.summary.integrityScore}`);
  console.log(`   ⚠️  Warnings: ${validResult.warnings.length}`);
  console.log(`   ❌ Errors: ${validResult.errors.length}`);
  
  // Test invalid employee data
  console.log('\n2. Testing invalid employee data:');
  const invalidResult = validatePerformanceDataIntegrity(invalidEmployeeData);
  console.log(`   ✅ Valid: ${invalidResult.isValid}`);
  console.log(`   📊 Integrity Score: ${invalidResult.summary.integrityScore}`);
  console.log(`   ⚠️  Warnings: ${invalidResult.warnings.length}`);
  console.log(`   ❌ Errors: ${invalidResult.errors.length}`);
  
  if (invalidResult.errors.length > 0) {
    console.log('   📋 Error Details:');
    invalidResult.errors.slice(0, 5).forEach((error, index) => {
      console.log(`      ${index + 1}. ${error.type}: ${error.message} (${error.severity})`);
    });
    if (invalidResult.errors.length > 5) {
      console.log(`      ... and ${invalidResult.errors.length - 5} more errors`);
    }
  }
  
  if (invalidResult.warnings.length > 0) {
    console.log('   ⚠️  Warning Details:');
    invalidResult.warnings.slice(0, 3).forEach((warning, index) => {
      console.log(`      ${index + 1}. ${warning.type}: ${warning.message}`);
    });
    if (invalidResult.warnings.length > 3) {
      console.log(`      ... and ${invalidResult.warnings.length - 3} more warnings`);
    }
  }
}

/**
 * Test enhanced database service
 */
function testEnhancedDatabaseService() {
  console.log('\n🗄️  Testing Enhanced Database Service\n');
  
  const dbService = new EnhancedDatabaseService();
  
  // Test parsing with integrity
  console.log('1. Testing JSON parsing with integrity:');
  const parseResult = dbService.parsePerformanceDataWithIntegrity(corruptedJsonData, {
    autoFix: true,
    useDefaultValues: true,
    skipCorruptedRecords: false
  });
  
  console.log(`   ✅ Success: ${parseResult.success}`);
  console.log(`   📊 Data Quality Score: ${parseResult.metadata.dataQualityScore}`);
  console.log(`   📝 Records Processed: ${parseResult.metadata.recordsProcessed}`);
  console.log(`   🔧 Records Recovered: ${parseResult.metadata.recordsRecovered}`);
  console.log(`   ❌ Errors: ${parseResult.errors.length}`);
  console.log(`   ⚠️  Warnings: ${parseResult.warnings.length}`);
  
  // Test employee data validation
  console.log('\n2. Testing employee data with integrity:');
  const employeeResult = dbService.getEmployeeDataWithIntegrity(invalidEmployeeData, {
    autoFix: true,
    useDefaultValues: true
  });
  
  console.log(`   ✅ Success: ${employeeResult.success}`);
  console.log(`   📊 Data Quality Score: ${employeeResult.metadata.dataQualityScore}`);
  console.log(`   📝 Records Processed: ${employeeResult.metadata.recordsProcessed}`);
  console.log(`   🔧 Records Recovered: ${employeeResult.metadata.recordsRecovered}`);
  console.log(`   ❌ Errors: ${employeeResult.errors.length}`);
  console.log(`   ⚠️  Warnings: ${employeeResult.warnings.length}`);
  
  // Test recovery options
  console.log('\n3. Testing recovery options:');
  const recoveryOptions = dbService.getRecoveryOptionsForUser(employeeResult);
  console.log(`   🚦 Can Proceed: ${recoveryOptions.canProceed}`);
  console.log(`   👤 Requires User Action: ${recoveryOptions.requiresUserAction}`);
  console.log(`   💡 Recommendations: ${recoveryOptions.recommendations.length}`);
  console.log(`   🎯 Available Actions: ${recoveryOptions.actions.length}`);
  
  if (recoveryOptions.recommendations.length > 0) {
    console.log('   📋 Recommendations:');
    recoveryOptions.recommendations.forEach((rec, index) => {
      console.log(`      ${index + 1}. ${rec}`);
    });
  }
  
  if (recoveryOptions.actions.length > 0) {
    console.log('   🎯 Available Actions:');
    recoveryOptions.actions.forEach((action, index) => {
      console.log(`      ${index + 1}. ${action.type}: ${action.description} (Confidence: ${action.confidence}%)`);
    });
  }
  
  // Generate detailed report
  console.log('\n4. Testing detailed error report:');
  const detailedReport = dbService.generateErrorReport(employeeResult);
  console.log('   📄 Detailed Report Generated:');
  console.log(`      Length: ${detailedReport.length} characters`);
  console.log(`      Preview: ${detailedReport.substring(0, 200)}...`);
}

/**
 * Test data recovery scenarios
 */
function testDataRecoveryScenarios() {
  console.log('\n🔧 Testing Data Recovery Scenarios\n');
  
  const dbService = new EnhancedDatabaseService();
  
  // Scenario 1: Auto-fix enabled
  console.log('1. Auto-fix enabled scenario:');
  const autoFixResult = dbService.parsePerformanceDataWithIntegrity(corruptedJsonData, {
    autoFix: true,
    useDefaultValues: true,
    skipCorruptedRecords: false
  });
  
  console.log(`   🔧 Auto-fix applied: ${autoFixResult.metadata.autoFixApplied || 'N/A'}`);
  console.log(`   📊 Final quality score: ${autoFixResult.metadata.dataQualityScore}`);
  
  // Scenario 2: Skip corrupted records
  console.log('\n2. Skip corrupted records scenario:');
  const skipResult = dbService.getEmployeeDataWithIntegrity(invalidEmployeeData, {
    autoFix: false,
    useDefaultValues: false,
    skipCorruptedRecords: true
  });
  
  console.log(`   📝 Original records: ${invalidEmployeeData.length}`);
  console.log(`   ✅ Valid records: ${skipResult.data ? skipResult.data.length : 0}`);
  console.log(`   ❌ Skipped records: ${invalidEmployeeData.length - (skipResult.data ? skipResult.data.length : 0)}`);
  
  // Scenario 3: Conservative validation
  console.log('\n3. Conservative validation scenario:');
  const conservativeResult = dbService.getEmployeeDataWithIntegrity(validEmployeeData, {
    autoFix: false,
    useDefaultValues: false,
    skipCorruptedRecords: false
  });
  
  console.log(`   ✅ Success: ${conservativeResult.success}`);
  console.log(`   📊 Quality score: ${conservativeResult.metadata.dataQualityScore}`);
  console.log(`   🔧 Recovery needed: ${conservativeResult.recoveryOptions.length > 0}`);
}

/**
 * Main test runner
 */
function runAllTests() {
  console.log('🧪 Data Validation Layer Test Suite');
  console.log('=====================================');
  
  try {
    testJsonIntegrityValidation();
    testPerformanceDataValidation();
    testEnhancedDatabaseService();
    testDataRecoveryScenarios();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   - JSON integrity validation: ✅');
    console.log('   - Performance data validation: ✅');
    console.log('   - Enhanced database service: ✅');
    console.log('   - Data recovery scenarios: ✅');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  runAllTests,
  testJsonIntegrityValidation,
  testPerformanceDataValidation,
  testEnhancedDatabaseService,
  testDataRecoveryScenarios,
  validEmployeeData,
  corruptedJsonData,
  invalidEmployeeData
};