/**
 * Server Health Check Module for Employee Performance Analyzer
 * 
 * This module provides server readiness verification including database
 * connectivity, native module loading, and system requirements checking.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { platform, arch } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Comprehensive server health check
 * @returns {Promise<Object>} Health check result with detailed information
 */
export async function checkServerHealth() {
  const healthResult = {
    timestamp: new Date().toISOString(),
    healthy: false,
    reason: null,
    details: null,
    checks: {
      nativeModules: null,
      database: null,
      filesystem: null,
      ports: null,
      environment: null
    },
    recommendations: [],
    diagnostics: {
      platform: platform(),
      arch: arch(),
      nodeVersion: process.version,
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  try {
    console.log('🔍 Starting server health check...');
    
    // Check 1: Native modules (critical)
    const nativeModuleCheck = await checkNativeModules();
    healthResult.checks.nativeModules = nativeModuleCheck;
    
    if (!nativeModuleCheck.healthy) {
      healthResult.healthy = false;
      healthResult.reason = 'native-module-error';
      healthResult.details = nativeModuleCheck.error;
      healthResult.recommendations.push(...nativeModuleCheck.recommendations);
      
      // If native modules fail, don't continue with database check
      console.log('❌ Native module check failed, skipping database check');
      return healthResult;
    }
    
    // Check 2: Database connectivity (critical)
    const databaseCheck = await checkDatabaseConnectivity();
    healthResult.checks.database = databaseCheck;
    
    if (!databaseCheck.healthy) {
      healthResult.healthy = false;
      healthResult.reason = 'database-error';
      healthResult.details = databaseCheck.error;
      healthResult.recommendations.push(...databaseCheck.recommendations);
      return healthResult;
    }
    
    // Check 3: Filesystem access (important)
    const filesystemCheck = await checkFilesystemAccess();
    healthResult.checks.filesystem = filesystemCheck;
    
    // Check 4: Port availability (important)
    const portCheck = await checkPortAvailability();
    healthResult.checks.ports = portCheck;
    
    // Check 5: Environment validation (informational)
    const environmentCheck = await checkEnvironment();
    healthResult.checks.environment = environmentCheck;
    
    // Determine overall health
    const criticalChecks = [nativeModuleCheck, databaseCheck];
    const importantChecks = [filesystemCheck, portCheck];
    
    const criticalPass = criticalChecks.every(check => check.healthy);
    const importantPass = importantChecks.every(check => check.healthy);
    
    if (criticalPass && importantPass) {
      healthResult.healthy = true;
      healthResult.reason = 'all-checks-passed';
      healthResult.details = 'Server is ready to start';
    } else if (criticalPass) {
      healthResult.healthy = true;
      healthResult.reason = 'critical-checks-passed';
      healthResult.details = 'Server can start with minor issues';
      
      // Add recommendations for non-critical issues
      importantChecks.forEach(check => {
        if (!check.healthy) {
          healthResult.recommendations.push(...check.recommendations);
        }
      });
    } else {
      healthResult.healthy = false;
      healthResult.reason = 'critical-checks-failed';
      healthResult.details = 'Server cannot start safely';
    }
    
    console.log(`✅ Health check completed: ${healthResult.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    return healthResult;
    
  } catch (error) {
    console.error('❌ Health check failed with error:', error.message);
    
    healthResult.healthy = false;
    healthResult.reason = 'health-check-error';
    healthResult.details = error.message;
    healthResult.recommendations.push('Health check system encountered an error');
    healthResult.recommendations.push('Check server logs for detailed error information');
    
    return healthResult;
  }
}

/**
 * Check native module loading and compatibility
 */
async function checkNativeModules() {
  const result = {
    healthy: false,
    error: null,
    details: {},
    recommendations: []
  };

  try {
    console.log('🔍 Checking native modules...');
    
    // Test better-sqlite3 import
    let Database;
    try {
      const betterSqlite3 = await import('better-sqlite3');
      Database = betterSqlite3.default;
      
      if (typeof Database !== 'function') {
        throw new Error('better-sqlite3 imported but is not a constructor function');
      }
      
      result.details.betterSqlite3 = {
        imported: true,
        isFunction: true
      };
      
    } catch (importError) {
      result.error = `Failed to import better-sqlite3: ${importError.message}`;
      result.details.betterSqlite3 = {
        imported: false,
        error: importError.message
      };
      
      // Analyze the error for specific recommendations
      if (importError.message.includes('Cannot resolve module') || importError.message.includes('MODULE_NOT_FOUND')) {
        result.recommendations.push('Run "npm install" to install missing dependencies');
        result.recommendations.push('Verify better-sqlite3 is in package.json dependencies');
      } else if (importError.message.includes('node-gyp') || importError.message.includes('binding') || importError.message.includes('rebuild')) {
        result.recommendations.push('Run "npm run rebuild:native" to rebuild native modules');
        result.recommendations.push('Ensure build tools are installed for your platform');
      } else if (importError.message.includes('electron') || importError.message.includes('version')) {
        result.recommendations.push('Run "npm run rebuild:electron" for Electron compatibility');
        result.recommendations.push('Verify Electron and Node.js versions match');
      }
      
      return result;
    }
    
    // Test database instantiation
    try {
      const testDb = new Database(':memory:');
      
      // Test basic operations
      testDb.exec('CREATE TABLE health_check (id INTEGER PRIMARY KEY, test TEXT)');
      const stmt = testDb.prepare('INSERT INTO health_check (test) VALUES (?)');
      stmt.run('health-check-test');
      
      const count = testDb.prepare('SELECT COUNT(*) as count FROM health_check').get();
      if (count.count !== 1) {
        throw new Error('Database operation test failed');
      }
      
      testDb.close();
      
      result.details.databaseTest = {
        canInstantiate: true,
        canPerformOperations: true
      };
      
    } catch (dbError) {
      result.error = `Database functionality test failed: ${dbError.message}`;
      result.details.databaseTest = {
        canInstantiate: false,
        error: dbError.message
      };
      
      result.recommendations.push('better-sqlite3 module needs rebuilding');
      result.recommendations.push('Run "npm run rebuild:native" to fix native module issues');
      
      return result;
    }
    
    result.healthy = true;
    console.log('✅ Native modules check passed');
    
  } catch (error) {
    result.error = `Native module check failed: ${error.message}`;
    result.recommendations.push('Check that all native modules are properly compiled');
    result.recommendations.push('Run "npm run check:native" for detailed diagnostics');
  }

  return result;
}

/**
 * Check database connectivity and basic operations
 */
async function checkDatabaseConnectivity() {
  const result = {
    healthy: false,
    error: null,
    details: {},
    recommendations: []
  };

  try {
    console.log('🔍 Checking database connectivity...');
    
    // Import database service
    const { default: SQLiteService } = await import('./database.js');
    
    // Create a test database service instance
    const dbPath = ':memory:'; // Use in-memory database for health check
    const testDbService = new SQLiteService(dbPath);
    
    // Check if database service initialized properly
    if (!testDbService.isReady()) {
      const initError = testDbService.getInitError();
      result.error = `Database service initialization failed: ${initError?.message || 'Unknown error'}`;
      result.details.initialization = {
        ready: false,
        error: initError?.message
      };
      
      if (initError?.type) {
        result.details.errorType = initError.type;
        result.recommendations.push(...(initError.suggestions || []));
      }
      
      result.recommendations.push('Check database service initialization logs');
      result.recommendations.push('Verify write permissions to database directory');
      
      return result;
    }
    
    // Test basic database operations
    try {
      // The database service should have created tables automatically
      const diagnosticInfo = testDbService.getDiagnosticInfo();
      result.details.diagnostics = diagnosticInfo;
      
      // Clean up
      testDbService.close();
      
      result.details.operations = {
        tablesCreated: true,
        serviceReady: true
      };
      
    } catch (operationError) {
      result.error = `Database operations test failed: ${operationError.message}`;
      result.details.operations = {
        error: operationError.message
      };
      
      result.recommendations.push('Database operations are failing');
      result.recommendations.push('Check database service implementation');
    }
    
    result.healthy = true;
    console.log('✅ Database connectivity check passed');
    
  } catch (error) {
    result.error = `Database connectivity check failed: ${error.message}`;
    result.recommendations.push('Check database service module');
    result.recommendations.push('Verify database dependencies are installed');
  }

  return result;
}

/**
 * Check filesystem access and permissions
 */
async function checkFilesystemAccess() {
  const result = {
    healthy: false,
    error: null,
    details: {},
    recommendations: []
  };

  try {
    console.log('🔍 Checking filesystem access...');
    
    // Check server directory exists
    const serverDir = __dirname;
    result.details.serverDirectory = {
      path: serverDir,
      exists: existsSync(serverDir)
    };
    
    if (!existsSync(serverDir)) {
      result.error = `Server directory not found: ${serverDir}`;
      result.recommendations.push('Verify application files are properly installed');
      return result;
    }
    
    // Check critical files exist
    const criticalFiles = [
      'server.js',
      'database.js'
    ];
    
    const missingFiles = [];
    for (const file of criticalFiles) {
      const filePath = join(serverDir, file);
      if (!existsSync(filePath)) {
        missingFiles.push(file);
      }
    }
    
    result.details.criticalFiles = {
      required: criticalFiles,
      missing: missingFiles
    };
    
    if (missingFiles.length > 0) {
      result.error = `Missing critical server files: ${missingFiles.join(', ')}`;
      result.recommendations.push('Reinstall the application to restore missing files');
      result.recommendations.push('Check if files were deleted or corrupted');
      return result;
    }
    
    // Test write access to temp directory
    try {
      const { writeFileSync, unlinkSync } = await import('fs');
      const { tmpdir } = await import('os');
      const testFile = join(tmpdir(), `health-check-${Date.now()}.tmp`);
      
      writeFileSync(testFile, 'health-check-test');
      unlinkSync(testFile);
      
      result.details.writeAccess = {
        canWrite: true,
        testPath: tmpdir()
      };
      
    } catch (writeError) {
      result.error = `Write access test failed: ${writeError.message}`;
      result.details.writeAccess = {
        canWrite: false,
        error: writeError.message
      };
      
      result.recommendations.push('Check file system permissions');
      result.recommendations.push('Ensure application has write access to temp directory');
      return result;
    }
    
    result.healthy = true;
    console.log('✅ Filesystem access check passed');
    
  } catch (error) {
    result.error = `Filesystem access check failed: ${error.message}`;
    result.recommendations.push('Check file system permissions and disk space');
  }

  return result;
}

/**
 * Check port availability
 */
async function checkPortAvailability() {
  const result = {
    healthy: false,
    error: null,
    details: {},
    recommendations: []
  };

  try {
    console.log('🔍 Checking port availability...');
    
    const { createServer } = await import('net');
    const defaultPort = 3002;
    const testPort = process.env.PORT || defaultPort;
    
    // Test if port is available
    const server = createServer();
    
    await new Promise((resolve, reject) => {
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          result.error = `Port ${testPort} is already in use`;
          result.details.port = {
            number: testPort,
            available: false,
            error: 'EADDRINUSE'
          };
          result.recommendations.push(`Change PORT environment variable or stop other service using port ${testPort}`);
          result.recommendations.push('Check if another instance of the application is running');
        } else {
          result.error = `Port check failed: ${error.message}`;
          result.details.port = {
            number: testPort,
            available: false,
            error: error.code || error.message
          };
        }
        reject(error);
      });
      
      server.listen(testPort, 'localhost', () => {
        result.details.port = {
          number: testPort,
          available: true
        };
        server.close(() => resolve());
      });
    });
    
    result.healthy = true;
    console.log(`✅ Port ${testPort} is available`);
    
  } catch (error) {
    // Error details already set in the promise handler
    if (!result.error) {
      result.error = `Port availability check failed: ${error.message}`;
      result.recommendations.push('Check network configuration and port permissions');
    }
  }

  return result;
}

/**
 * Check environment and system requirements
 */
async function checkEnvironment() {
  const result = {
    healthy: true, // Environment check is informational, not critical
    error: null,
    details: {},
    recommendations: []
  };

  try {
    console.log('🔍 Checking environment...');
    
    // Node.js version check
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    result.details.nodejs = {
      version: nodeVersion,
      majorVersion: nodeMajor,
      supported: nodeMajor >= 16 // Minimum supported version
    };
    
    if (nodeMajor < 16) {
      result.recommendations.push(`Node.js ${nodeVersion} is outdated. Upgrade to Node.js 16 or later`);
    }
    
    // Platform information
    result.details.platform = {
      type: platform(),
      architecture: arch(),
      supported: ['win32', 'darwin', 'linux'].includes(platform())
    };
    
    if (!result.details.platform.supported) {
      result.recommendations.push(`Platform ${platform()} may not be fully supported`);
    }
    
    // Memory check
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
    
    result.details.memory = {
      usage: memoryUsage,
      rssInMB: memoryMB,
      sufficient: memoryMB < 1000 // Alert if using more than 1GB
    };
    
    if (!result.details.memory.sufficient) {
      result.recommendations.push(`High memory usage detected (${memoryMB}MB). Monitor for memory leaks`);
    }
    
    // Environment variables
    const importantEnvVars = ['NODE_ENV', 'PORT', 'DB_PATH'];
    result.details.environment = {};
    
    for (const envVar of importantEnvVars) {
      result.details.environment[envVar] = {
        set: !!process.env[envVar],
        value: process.env[envVar] || null
      };
    }
    
    console.log('✅ Environment check completed');
    
  } catch (error) {
    result.error = `Environment check failed: ${error.message}`;
    result.recommendations.push('Check system configuration and environment variables');
  }

  return result;
}

/**
 * Quick health check for basic server readiness
 * @returns {Promise<boolean>} True if server can start, false otherwise
 */
export async function quickHealthCheck() {
  try {
    const result = await checkServerHealth();
    return result.healthy;
  } catch (error) {
    console.error('Quick health check failed:', error.message);
    return false;
  }
}

/**
 * Get health check summary for logging
 * @returns {Promise<string>} Health check summary
 */
export async function getHealthSummary() {
  try {
    const result = await checkServerHealth();
    
    if (result.healthy) {
      return `✅ Server health check PASSED - ${result.details || 'Ready to start'}`;
    } else {
      return `❌ Server health check FAILED - ${result.reason}: ${result.details}`;
    }
  } catch (error) {
    return `❌ Health check error: ${error.message}`;
  }
}