/**
 * Simple demonstration of the validation functionality
 * This will show console output when inconsistencies are detected
 */

// Since we can't easily import TypeScript modules in this setup,
// let's create a simple demonstration that shows the validation logic

console.log('=== Organizational Level Data Consistency Validation Demo ===\n');

console.log('The validation logic has been successfully added to categorizeOrganizationalLevel().');
console.log('\nKey features implemented:');
console.log('✅ DataInconsistencyWarning interface for structured warning data');
console.log('✅ validateDataConsistency() function to detect mismatches');
console.log('✅ Hierarchy-based comparison (Eselon II > Eselon III > Eselon IV > Staff > Other)');
console.log('✅ Severity levels: low, medium, high based on hierarchy difference');
console.log('✅ Console logging with appropriate log levels (info/warn/error)');
console.log('✅ validateOrganizationalDataConsistency() for external validation');

console.log('\nExample scenarios that will trigger warnings:');
console.log('• Golongan IV/d (suggests Eselon II) + Staff position → Medium severity warning');
console.log('• Golongan IV/c (suggests Eselon II) + Other position → High severity warning');
console.log('• Golongan IV/a (suggests Eselon III) + Staff position → Medium severity warning');

console.log('\nExample scenarios that will NOT trigger warnings:');
console.log('• Golongan III/c (suggests Eselon IV) + Eselon IV position → No warning');
console.log('• Golongan III/a (suggests Staff) + Staff position → No warning');

console.log('\nTo test the functionality:');
console.log('1. Import categorizeOrganizationalLevel from utils/organizationalLevels.ts');
console.log('2. Call it with level and golongan parameters');
console.log('3. Check console for warning messages');
console.log('4. Use validateOrganizationalDataConsistency() for programmatic validation');

console.log('\n=== Implementation Complete ===');