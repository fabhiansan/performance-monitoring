#!/usr/bin/env node
/**
 * Cleanup Deprecated Files and Configs
 * 
 * Removes old files that are no longer needed after migration to TypeScript backend
 */

const fs = require('fs');
const path = require('path');

class DeprecatedCleanup {
  constructor() {
    this.removedFiles = [];
    this.archivedFiles = [];
    this.errors = [];
    this.dryRun = process.argv.includes('--dry-run');
  }

  log(message, level = 'info') {
    const prefix = this.dryRun ? '[DRY RUN] ' : '';
    const symbols = { info: '✅', warn: '⚠️', error: '❌', archive: '📦' };
    console.log(`${symbols[level] || 'ℹ️'} ${prefix}${message}`);
  }

  safeRemove(filePath, reason) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    try {
      if (fs.existsSync(filePath)) {
        if (!this.dryRun) {
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
        this.removedFiles.push({ path: relativePath, reason });
        this.log(`Removed: ${relativePath} (${reason})`, 'info');
      } else {
        this.log(`Not found (already removed): ${relativePath}`, 'warn');
      }
    } catch (error) {
      this.errors.push({ path: relativePath, error: error.message });
      this.log(`Failed to remove: ${relativePath} - ${error.message}`, 'error');
    }
  }

  archiveFile(sourcePath, archiveDir, reason) {
    const relativePath = path.relative(process.cwd(), sourcePath);
    
    try {
      if (fs.existsSync(sourcePath)) {
        if (!this.dryRun) {
          // Create archive directory
          const archivePath = path.join(archiveDir, path.basename(sourcePath));
          if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
          }
          fs.renameSync(sourcePath, archivePath);
        }
        this.archivedFiles.push({ path: relativePath, reason, archived_to: archiveDir });
        this.log(`Archived: ${relativePath} to ${archiveDir} (${reason})`, 'archive');
      }
    } catch (error) {
      this.errors.push({ path: relativePath, error: error.message });
      this.log(`Failed to archive: ${relativePath} - ${error.message}`, 'error');
    }
  }

  cleanupDeprecatedServerFiles() {
    this.log('\n🗂️ Cleaning up deprecated server files...');
    
    const _serverDir = './server';
    const archiveDir = './docs/migration/archived-server-files';
    
    // Server files that are replaced by the new TypeScript structure
    const deprecatedServerFiles = [
      // These files exist but may be deprecated
      { file: 'server/server-wrapper.ts', reason: 'Replaced by server-entry.cjs' },
      { file: 'server/server-unified.ts', reason: 'Consolidated into fastifyServer.ts' },
      { file: 'server/server-standardized.ts', reason: 'Replaced by fastify.ts' },
      { file: 'server/serverFactory.ts', reason: 'Functionality moved to fastifyServer.ts' },
      { file: 'server/index.ts', reason: 'Replaced by fastify.ts entry point' },
    ];
    
    deprecatedServerFiles.forEach(({ file, reason }) => {
      if (fs.existsSync(file)) {
        // Archive instead of delete for safety
        this.archiveFile(file, archiveDir, reason);
      }
    });
  }

  cleanupDeprecatedScripts() {
    this.log('\n📜 Cleaning up deprecated scripts...');
    
    // Root level scripts that might be deprecated
    const potentiallyDeprecated = [
      { file: './start-server.ts', reason: 'Replaced by server/fastify.ts', action: 'archive' },
      { file: './demo-enhanced-validation.ts', reason: 'Demo file no longer needed', action: 'remove' },
      { file: './build-scripts.cjs', reason: 'Functionality moved to package.json scripts', action: 'archive' }
    ];
    
    const archiveDir = './docs/migration/archived-scripts';
    
    potentiallyDeprecated.forEach(({ file, reason, action }) => {
      if (fs.existsSync(file)) {
        if (action === 'archive') {
          this.archiveFile(file, archiveDir, reason);
        } else {
          this.safeRemove(file, reason);
        }
      }
    });
  }

  cleanupTestFiles() {
    this.log('\n🧪 Reviewing test files...');
    
    // Old test data that might be stale
    const testCleanup = [
      { file: './test-data', reason: 'Temporary test data from validation scripts', action: 'remove' },
      { file: './test.db', reason: 'Test database file', action: 'remove' }
    ];
    
    testCleanup.forEach(({ file, reason, action: _action }) => {
      if (fs.existsSync(file)) {
        this.safeRemove(file, reason);
      }
    });
  }

  cleanupLegacyDocs() {
    this.log('\n📄 Organizing legacy documentation...');
    
    const archiveDir = './docs/migration/archived-docs';
    
    const legacyDocs = [
      { file: './COMPREHENSIVE_CODE_SMELL_REPORT.md', reason: 'Pre-migration analysis document' },
      { file: './REFACTORING_HANDOFF.md', reason: 'Historical refactoring notes' },
      { file: './CRUSH.md', reason: 'Legacy documentation' },
      { file: './GEMINI.md', reason: 'Legacy documentation' },
      { file: './AGENTS.md', reason: 'Development process documentation' },
      { file: './TASK.md', reason: 'Task-specific documentation' },
      { file: './knowledge.md', reason: 'Legacy knowledge base' },
      { file: './tdd-guard-doc.md', reason: 'TDD process documentation' }
    ];
    
    legacyDocs.forEach(({ file, reason }) => {
      if (fs.existsSync(file)) {
        this.archiveFile(file, archiveDir, reason);
      }
    });
  }

  cleanupSampleData() {
    this.log('\n📊 Cleaning up sample data...');
    
    // Move sample data to a better location
    const sampleFiles = [
      { file: './sample-data', reason: 'Reorganize sample data' },
    ];
    
    const archiveDir = './docs/sample-data';
    
    sampleFiles.forEach(({ file, reason }) => {
      if (fs.existsSync(file)) {
        this.archiveFile(file, archiveDir, reason);
      }
    });
  }

  validateCriticalFiles() {
    this.log('\n🔍 Validating critical files are preserved...');
    
    const criticalFiles = [
      './package.json',
      './tsconfig.json',
      './vite.config.ts',
      './server/fastifyServer.ts',
      './server/fastify.ts',
      './main.ts',
      './server-entry.cjs',
      './README.md',
      './CLAUDE.md',
      './MIGRATION_PLAN.md'
    ];
    
    let allCriticalPresent = true;
    
    criticalFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        this.log(`Critical file missing: ${file}`, 'error');
        allCriticalPresent = false;
      }
    });
    
    if (allCriticalPresent) {
      this.log('All critical files preserved ✅');
    } else {
      this.log('Some critical files are missing!', 'error');
    }
    
    return allCriticalPresent;
  }

  generateReport() {
    this.log('\n📋 Cleanup Summary');
    this.log('==================');
    
    const report = {
      timestamp: new Date().toISOString(),
      dry_run: this.dryRun,
      summary: {
        files_removed: this.removedFiles.length,
        files_archived: this.archivedFiles.length,
        errors: this.errors.length
      },
      removed_files: this.removedFiles,
      archived_files: this.archivedFiles,
      errors: this.errors
    };
    
    const reportPath = './docs/migration/cleanup-report.json';
    if (!this.dryRun) {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.log(`Detailed report saved to: ${reportPath}`);
    }
    
    this.log(`Files removed: ${this.removedFiles.length}`);
    this.log(`Files archived: ${this.archivedFiles.length}`);
    this.log(`Errors: ${this.errors.length}`);
    
    return report;
  }

  async run() {
    try {
      this.log(`🚀 Starting cleanup of deprecated files... ${this.dryRun ? '(DRY RUN)' : ''}`);
      
      // Run all cleanup operations
      this.cleanupDeprecatedServerFiles();
      this.cleanupDeprecatedScripts();
      this.cleanupTestFiles();
      this.cleanupLegacyDocs();
      this.cleanupSampleData();
      
      // Validate critical files
      const criticalFilesOk = this.validateCriticalFiles();
      
      // Generate report
      const report = this.generateReport();
      
      if (!criticalFilesOk) {
        throw new Error('Critical files validation failed');
      }
      
      this.log('\n🎉 Cleanup completed successfully!');
      
      if (this.dryRun) {
        this.log('\n💡 This was a dry run. Run without --dry-run to execute changes.');
      }
      
      return report;
      
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const cleanup = new DeprecatedCleanup();
  
  cleanup.run()
    .then(() => {
      console.log('\n✅ Deprecated file cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Deprecated file cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = DeprecatedCleanup;