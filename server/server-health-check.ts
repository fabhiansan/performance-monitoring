/**
 * Server Health Check Module for Employee Performance Analyzer
 * 
 * This module provides server readiness verification including database
 * connectivity, native module loading, and system requirements checking.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { platform, arch, tmpdir } from 'os';
import { createServer } from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CheckResult {
  healthy: boolean;
  error: string | null;
  details: Record<string, unknown>;
  recommendations: string[];
}

interface HealthDiagnostics {
  platform: NodeJS.Platform;
  arch: string;
  nodeVersion: string;
  processId: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

interface HealthCheckResult {
  timestamp: string;
  healthy: boolean;
  reason: string | null;
  details: string | Record<string, unknown> | null;
  checks: {
    nativeModules: CheckResult | null;
    database: CheckResult | null;
    filesystem: CheckResult | null;
    ports: CheckResult | null;
    environment: CheckResult | null;
  };
  recommendations: string[];
  diagnostics: HealthDiagnostics;
}

type BetterSqlite3Constructor = new (_filename: string) => {
  exec: (_sql: string) => unknown;
  prepare: (_sql: string) => {
    run: (..._params: unknown[]) => unknown;
    get: (..._params: unknown[]) => unknown;
  };
  close: () => void;
};

const createCheckResult = (): CheckResult => ({
  healthy: false,
  error: null,
  details: {},
  recommendations: []
});

const toErrorInfo = (error: unknown): { message: string; code?: string } => {
  if (error instanceof Error) {
    const err = error as NodeJS.ErrnoException;
    return {
      message: error.message,
      code: typeof err.code === 'string' ? err.code : undefined
    };
  }

  return {
    message: typeof error === 'string' ? error : JSON.stringify(error)
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * Comprehensive server health check
 * @returns {Promise<Object>} Health check result with detailed information
 */
export async function checkServerHealth(): Promise<HealthCheckResult> {
  const healthResult: HealthCheckResult = {
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
    const errorInfo = toErrorInfo(error);
    console.error('❌ Health check failed with error:', errorInfo.message);
    
    healthResult.healthy = false;
    healthResult.reason = 'health-check-error';
    healthResult.details = errorInfo.message;
    healthResult.recommendations.push('Health check system encountered an error');
    healthResult.recommendations.push('Check server logs for detailed error information');
    
    return healthResult;
  }
}

/**
 * Check native module loading and compatibility
 */
async function checkNativeModules(): Promise<CheckResult> {
  const result = createCheckResult();

  try {
    console.log('🔍 Checking native modules...');

    let DatabaseConstructor: BetterSqlite3Constructor | null = null;

    try {
      const betterSqlite3 = await import('better-sqlite3');
      const candidate = betterSqlite3.default;

      if (typeof candidate !== 'function') {
        throw new Error('better-sqlite3 imported but is not a constructor function');
      }

      DatabaseConstructor = candidate as BetterSqlite3Constructor;
      result.details.betterSqlite3 = {
        imported: true,
        isFunction: true
      };
    } catch (importError) {
      const errorInfo = toErrorInfo(importError);
      const message = errorInfo.message;
      result.error = `Failed to import better-sqlite3: ${message}`;
      result.details.betterSqlite3 = {
        imported: false,
        error: message
      };

      if (message.includes('Cannot resolve module') || message.includes('MODULE_NOT_FOUND')) {
        result.recommendations.push('Run "npm install" to install missing dependencies');
        result.recommendations.push('Verify better-sqlite3 is in package.json dependencies');
      } else if (message.includes('node-gyp') || message.includes('binding') || message.includes('rebuild')) {
        result.recommendations.push('Run "npm run rebuild:native" to rebuild native modules');
        result.recommendations.push('Ensure build tools are installed for your platform');
      } else if (message.includes('electron') || message.includes('version')) {
        result.recommendations.push('Run "npm run rebuild:electron" for Electron compatibility');
        result.recommendations.push('Verify Electron and Node.js versions match');
      }

      return result;
    }

    if (!DatabaseConstructor) {
      result.error = 'better-sqlite3 constructor not available after import';
      return result;
    }

    try {
      const testDb = new DatabaseConstructor(':memory:');
      testDb.exec('CREATE TABLE health_check (id INTEGER PRIMARY KEY, test TEXT)');
      const stmt = testDb.prepare('INSERT INTO health_check (test) VALUES (?)');
      stmt.run('health-check-test');

      const countRow = testDb.prepare('SELECT COUNT(*) as count FROM health_check').get();
      const total = isRecord(countRow) && typeof countRow.count === 'number' ? countRow.count : 0;
      if (total !== 1) {
        throw new Error('Database operation test failed');
      }

      testDb.close();

      result.details.databaseTest = {
        canInstantiate: true,
        canPerformOperations: true
      };
    } catch (dbError) {
      const errorInfo = toErrorInfo(dbError);
      result.error = `Database functionality test failed: ${errorInfo.message}`;
      result.details.databaseTest = {
        canInstantiate: false,
        error: errorInfo.message
      };
      result.recommendations.push('better-sqlite3 module needs rebuilding');
      result.recommendations.push('Run "npm run rebuild:native" to fix native module issues');
      return result;
    }

    result.healthy = true;
    console.log('✅ Native modules check passed');
  } catch (error) {
    const errorInfo = toErrorInfo(error);
    result.error = `Native module check failed: ${errorInfo.message}`;
    result.recommendations.push('Check that all native modules are properly compiled');
    result.recommendations.push('Run "npm run check:native" for detailed diagnostics');
  }

  return result;
}

/**
 * Check database connectivity and basic operations
 */
async function checkDatabaseConnectivity(): Promise<CheckResult> {
  const result = createCheckResult();
  let testDbService: { initialize: () => Promise<unknown>; isReady: () => boolean; close: () => void } | null = null;

  try {
    console.log('🔍 Checking database connectivity...');

    const { default: SQLiteService } = await import('./database');
    testDbService = new SQLiteService(':memory:');

    await testDbService.initialize();
    const ready = testDbService.isReady();

    result.details.service = {
      dbPath: ':memory:',
      initialized: ready
    };

    if (!ready) {
      result.error = 'Database service did not report ready state after initialization';
      result.recommendations.push('Check database service initialization logs');
      result.recommendations.push('Verify write permissions to database directory');
      return result;
    }

    result.details.operations = {
      tablesCreated: true,
      serviceReady: true
    };

    result.healthy = true;
    console.log('✅ Database connectivity check passed');
  } catch (error) {
    const errorInfo = toErrorInfo(error);
    result.error = `Database connectivity check failed: ${errorInfo.message}`;
    result.recommendations.push('Check database service module');
    result.recommendations.push('Verify database dependencies are installed');
  } finally {
    testDbService?.close();
  }

  return result;
}

/**
 * Check filesystem access and permissions
 */
async function checkFilesystemAccess(): Promise<CheckResult> {
  const result = createCheckResult();

  try {
    console.log('🔍 Checking filesystem access...');

    const serverDir = __dirname;
    const serverDirExists = existsSync(serverDir);
    result.details.serverDirectory = {
      path: serverDir,
      exists: serverDirExists
    };

    if (!serverDirExists) {
      result.error = `Server directory not found: ${serverDir}`;
      result.recommendations.push('Verify application files are properly installed');
      return result;
    }

    const criticalFiles = ['server.js', 'database.js'];
    const missingFiles: string[] = [];

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

    try {
      const testFile = join(tmpdir(), `health-check-${Date.now()}.tmp`);
      writeFileSync(testFile, 'health-check-test');
      unlinkSync(testFile);

      result.details.writeAccess = {
        canWrite: true,
        testPath: tmpdir()
      };
    } catch (writeError) {
      const errorInfo = toErrorInfo(writeError);
      result.error = `Write access test failed: ${errorInfo.message}`;
      result.details.writeAccess = {
        canWrite: false,
        error: errorInfo.message
      };
      result.recommendations.push('Check file system permissions');
      result.recommendations.push('Ensure application has write access to temp directory');
      return result;
    }

    result.healthy = true;
    console.log('✅ Filesystem access check passed');
  } catch (error) {
    const errorInfo = toErrorInfo(error);
    result.error = `Filesystem access check failed: ${errorInfo.message}`;
    result.recommendations.push('Check file system permissions and disk space');
  }

  return result;
}

/**
 * Check port availability
 */
async function checkPortAvailability(): Promise<CheckResult> {
  const result = createCheckResult();

  try {
    console.log('🔍 Checking port availability...');

    const defaultPort = 3002;
    const testPort = Number(process.env.PORT ?? defaultPort);

    const server = createServer();

    await new Promise<void>((resolve, reject) => {
      server.once('error', (error: NodeJS.ErrnoException) => {
        const errorInfo = toErrorInfo(error);
        if (errorInfo.code === 'EADDRINUSE') {
          result.error = `Port ${testPort} is already in use`;
          result.details.port = {
            number: testPort,
            available: false,
            error: 'EADDRINUSE'
          };
          result.recommendations.push(`Change PORT environment variable or stop other service using port ${testPort}`);
          result.recommendations.push('Check if another instance of the application is running');
        } else {
          result.error = `Port check failed: ${errorInfo.message}`;
          result.details.port = {
            number: testPort,
            available: false,
            error: errorInfo.code ?? errorInfo.message
          };
        }
        server.close();
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
    if (!result.error) {
      const errorInfo = toErrorInfo(error);
      result.error = `Port availability check failed: ${errorInfo.message}`;
      result.recommendations.push('Check network configuration and port permissions');
    }
  }

  return result;
}

/**
 * Check environment and system requirements
 */
async function checkEnvironment(): Promise<CheckResult> {
  const result = createCheckResult();
  result.healthy = true; // informational by default

  try {
    console.log('🔍 Checking environment...');

    const nodeVersion = process.version;
    const nodeMajor = Number.parseInt(nodeVersion.slice(1).split('.')[0] ?? '0', 10);

    result.details.nodejs = {
      version: nodeVersion,
      majorVersion: nodeMajor,
      supported: nodeMajor >= 16
    };

    if (nodeMajor < 16) {
      result.recommendations.push(`Node.js ${nodeVersion} is outdated. Upgrade to Node.js 16 or later`);
    }

    const platformInfo = platform();
    result.details.platform = {
      type: platformInfo,
      architecture: arch(),
      supported: ['win32', 'darwin', 'linux'].includes(platformInfo)
    };

    if (!((result.details.platform as { supported: boolean }).supported)) {
      result.recommendations.push(`Platform ${platformInfo} may not be fully supported`);
    }

    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024);

    result.details.memory = {
      usage: memoryUsage,
      rssInMB: memoryMB,
      sufficient: memoryMB < 1000
    };

    if (!(result.details.memory as { sufficient: boolean }).sufficient) {
      result.recommendations.push(`High memory usage detected (${memoryMB}MB). Monitor for memory leaks`);
    }

    const importantEnvVars = ['NODE_ENV', 'PORT', 'DB_PATH'] as const;
    const envDetails: Record<string, { set: boolean; value: string | null }> = {};

    for (const envVar of importantEnvVars) {
      envDetails[envVar] = {
        set: typeof process.env[envVar] === 'string' && process.env[envVar] !== '',
        value: process.env[envVar] ?? null
      };
    }

    result.details.environment = envDetails;

    console.log('✅ Environment check completed');
  } catch (error) {
    const errorInfo = toErrorInfo(error);
    result.error = `Environment check failed: ${errorInfo.message}`;
    result.recommendations.push('Check system configuration and environment variables');
    result.healthy = false;
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
    const errorInfo = toErrorInfo(error);
    console.error('Quick health check failed:', errorInfo.message);
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
      const detailSummary = typeof result.details === 'string' ? result.details : 'Ready to start';
      return `✅ Server health check PASSED - ${detailSummary}`;
    } else {
      const detailSummary = typeof result.details === 'string' ? result.details : JSON.stringify(result.details ?? {});
      return `❌ Server health check FAILED - ${result.reason}: ${detailSummary}`;
    }
  } catch (error) {
    const errorInfo = toErrorInfo(error);
    return `❌ Health check error: ${errorInfo.message}`;
  }
}
