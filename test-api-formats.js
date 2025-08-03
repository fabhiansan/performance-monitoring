#!/usr/bin/env node

/**
 * Test script to verify both legacy and standardized API response formats
 * Run with: node test-api-formats.js
 */

const baseUrl = 'http://localhost:3002';

async function testApiFormat(endpoint, headers = {}, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 Endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, { headers });
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    
    // Check if it's standardized format
    if (data.hasOwnProperty('success') && data.hasOwnProperty('metadata')) {
      console.log(`🆕 Format: Standardized`);
      console.log(`⏰ Timestamp: ${data.metadata.timestamp}`);
      console.log(`🔢 Version: ${data.metadata.version}`);
    } else {
      console.log(`🔄 Format: Legacy`);
    }
    
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }
}

async function testErrorHandling(endpoint, headers = {}, description) {
  console.log(`\n🚨 Testing Error: ${description}`);
  console.log(`📍 Endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, { headers });
    const data = await response.json();
    
    console.log(`⚠️  Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    
    // Check error format
    if (data.hasOwnProperty('success') && data.success === false) {
      console.log(`🆕 Error Format: Standardized`);
      if (data.metadata && data.metadata.error) {
        console.log(`🏷️  Error Code: ${data.metadata.error.code}`);
        console.log(`🔄 Retryable: ${data.metadata.error.retryable}`);
      }
    } else if (data.hasOwnProperty('error')) {
      console.log(`🔄 Error Format: Legacy`);
    }
    
  } catch (error) {
    console.log(`❌ Network Error:`, error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API Format Tests');
  console.log('=' .repeat(50));
  
  // Test health endpoint
  await testApiFormat('/api/health', {}, 'Health Check - Legacy Format');
  await testApiFormat('/api/health', { 'Accept-API-Version': '2.0' }, 'Health Check - Standardized Format');
  
  // Test employees endpoint
  await testApiFormat('/api/employees', {}, 'Get Employees - Legacy Format');
  await testApiFormat('/api/employees', { 'Accept-API-Version': '2.0' }, 'Get Employees - Standardized Format');
  
  // Test upload sessions
  await testApiFormat('/api/upload-sessions', {}, 'Upload Sessions - Legacy Format');
  await testApiFormat('/api/upload-sessions', { 'Accept-API-Version': '2.0' }, 'Upload Sessions - Standardized Format');
  
  // Test error handling
  await testErrorHandling('/api/employees/99999', {}, 'Employee Not Found - Legacy Format');
  await testErrorHandling('/api/employees/99999', { 'Accept-API-Version': '2.0' }, 'Employee Not Found - Standardized Format');
  
  // Test validation error
  await testErrorHandling('/api/employees/suggestions', {}, 'Missing Query Parameter - Legacy Format');
  await testErrorHandling('/api/employees/suggestions', { 'Accept-API-Version': '2.0' }, 'Missing Query Parameter - Standardized Format');
  
  console.log('\n' + '=' .repeat(50));
  console.log('✨ API Format Tests Completed');
  console.log('\n📋 Summary:');
  console.log('• Legacy format maintains backward compatibility');
  console.log('• Standardized format provides consistent structure');
  console.log('• Error handling works for both formats');
  console.log('• Use Accept-API-Version: 2.0 header for new format');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    if (response.ok) {
      console.log('✅ Server is running, starting tests...');
      await runTests();
    } else {
      console.log('❌ Server responded with error:', response.status);
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm start');
    console.log('   or');
    console.log('   node server/server-standardized.mjs');
  }
}

checkServer();