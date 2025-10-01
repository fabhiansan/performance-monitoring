#!/usr/bin/env node

/**
 * Claude Code Quality Hook for Hybrid React + Electron + Node.js TypeScript Projects
 * 
 * This hook provides quality checks for projects that combine:
 * - React frontend (components/, App.tsx, etc.)
 * - Electron main process (main.ts, electron-config.ts)
 * - Node.js backend (server/, services/, scripts/)
 * 
 * Features:
 * - Smart TypeScript config detection (tsconfig.json vs tsconfig.node.json)
 * - Console usage rules (allowed in components, server, scripts; warned in main process)
 * - JSX support for React components
 * - Auto-fixing with ESLint and Prettier
 * - Performance optimized with caching
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const CONFIG_FILE = path.join(__dirname, 'hook-config.json');
const CACHE_FILE = path.join(__dirname, 'tsconfig-cache.json');
const DEBUG = process.env.CLAUDE_HOOKS_DEBUG === 'true';

// Load configuration
let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
} catch (error) {
  console.error('[ERROR] Failed to load hook configuration:', error.message);
  process.exit(1);
}

// Debug logging
function debugLog(message) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

// Load or build TypeScript config cache
function loadTsConfigCache() {
  if (!fs.existsSync(CACHE_FILE)) {
    return buildTsConfigCache();
  }

  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    
    // Verify cache validity by checking file hashes
    const currentHashes = {};
    const configFiles = ['tsconfig.json', 'tsconfig.node.json'];
    
    for (const configFile of configFiles) {
      const configPath = path.join(process.cwd(), configFile);
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        currentHashes[configFile] = crypto.createHash('sha256').update(content).digest('hex');
      }
    }
    
    // Check if any config has changed
    const hashesMatch = Object.keys(currentHashes).every(
      key => cache.hashes && cache.hashes[key] === currentHashes[key]
    );
    
    if (hashesMatch && cache.mappings) {
      debugLog('Using cached TypeScript config mappings');
      return cache.mappings;
    } else {
      debugLog('TypeScript config changed, rebuilding cache');
      return buildTsConfigCache();
    }
  } catch (error) {
    debugLog(`Cache load error: ${error.message}, rebuilding`);
    return buildTsConfigCache();
  }
}

// Build TypeScript config cache
function buildTsConfigCache() {
  debugLog('Building TypeScript config cache');
  
  const mappings = {};
  const hashes = {};
  
  // Check for tsconfig.node.json (Node.js backend)
  const nodeConfigPath = path.join(process.cwd(), 'tsconfig.node.json');
  if (fs.existsSync(nodeConfigPath)) {
    const content = fs.readFileSync(nodeConfigPath, 'utf8');
    hashes['tsconfig.node.json'] = crypto.createHash('sha256').update(content).digest('hex');
    
    // Map server, services, scripts, middleware to Node.js config
    mappings['server/**/*'] = { configPath: 'tsconfig.node.json', excludes: ['node_modules', 'test'] };
    mappings['services/**/*'] = { configPath: 'tsconfig.node.json', excludes: ['node_modules', 'test'] };
    mappings['scripts/**/*'] = { configPath: 'tsconfig.node.json', excludes: ['node_modules', 'test'] };
    mappings['middleware/**/*'] = { configPath: 'tsconfig.node.json', excludes: ['node_modules', 'test'] };
    mappings['main.ts'] = { configPath: 'tsconfig.node.json', excludes: ['node_modules', 'test'] };
    mappings['electron-config.ts'] = { configPath: 'tsconfig.node.json', excludes: ['node_modules', 'test'] };
    mappings['start-server.ts'] = { configPath: 'tsconfig.node.json', excludes: ['node_modules', 'test'] };
  }
  
  // Check for tsconfig.json (React frontend)
  const frontendConfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (fs.existsSync(frontendConfigPath)) {
    const content = fs.readFileSync(frontendConfigPath, 'utf8');
    hashes['tsconfig.json'] = crypto.createHash('sha256').update(content).digest('hex');
    
    // Map components, contexts, utils, constants to frontend config
    mappings['components/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['contexts/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['utils/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['constants/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['App.tsx'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['index.tsx'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['types.ts'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
  }
  
  // Save cache
  const cache = { hashes, mappings };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  
  debugLog('TypeScript config cache built and saved');
  return mappings;
}

// Get appropriate TypeScript config for a file
function getTsConfigForFile(filePath) {
  const mappings = loadTsConfigCache();
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Find matching pattern
  for (const [pattern, config] of Object.entries(mappings)) {
    if (relativePath.match(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))) {
      return config.configPath;
    }
  }
  
  // Default to tsconfig.json for unmatched files
  return 'tsconfig.json';
}

// Run TypeScript check
function runTypeScriptCheck(filePath) {
  if (!config.typescript.enabled) {
    return { success: true, output: '' };
  }

  try {
    const tsConfig = getTsConfigForFile(filePath);
    debugLog(`Using TypeScript config: ${tsConfig}`);
    
    const command = `npx tsc --noEmit --project ${tsConfig} --skipLibCheck`;
    const output = execSync(command, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: config.typescript.showDependencyErrors ? 'pipe' : 'pipe'
    });
    
    return { success: true, output: output.trim() };
  } catch (error) {
    const output = error.stdout || error.stderr || error.message;
    
    // Filter out dependency errors if not showing them
    if (!config.typescript.showDependencyErrors) {
      const lines = output.split('\n');
      const filteredLines = lines.filter(line => 
        !line.includes('node_modules') && 
        !line.includes('Could not find declaration file')
      );
      const filteredOutput = filteredLines.join('\n').trim();
      
      if (filteredOutput) {
        return { success: false, output: filteredOutput };
      } else {
        return { success: true, output: '' };
      }
    }
    
    return { success: false, output: output.trim() };
  }
}

// Run ESLint check and auto-fix
function runESLintCheck(filePath) {
  if (!config.eslint.enabled) {
    return { success: true, output: '' };
  }

  try {
    // First try to auto-fix
    if (config.eslint.autofix) {
      try {
        execSync(`npx eslint --fix "${filePath}"`, { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          stdio: 'pipe'
        });
      } catch (fixError) {
        // Auto-fix might fail, continue with regular check
        debugLog(`ESLint auto-fix failed: ${fixError.message}`);
      }
    }
    
    // Run regular check
    const output = execSync(`npx eslint "${filePath}"`, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    return { success: true, output: output.trim() };
  } catch (error) {
    const output = error.stdout || error.stderr || error.message;
    return { success: false, output: output.trim() };
  }
}

// Run Prettier check and auto-fix
function runPrettierCheck(filePath) {
  if (!config.prettier.enabled) {
    return { success: true, output: '' };
  }

  try {
    // First try to auto-fix
    if (config.prettier.autofix) {
      try {
        execSync(`npx prettier --write "${filePath}"`, { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          stdio: 'pipe'
        });
        debugLog(`Prettier auto-fixed: ${filePath}`);
      } catch (fixError) {
        debugLog(`Prettier auto-fix failed: ${fixError.message}`);
      }
    }
    
    // Run check
    const output = execSync(`npx prettier --check "${filePath}"`, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    return { success: true, output: output.trim() };
  } catch (error) {
    const output = error.stdout || error.stderr || error.message;
    return { success: false, output: output.trim() };
  }
}

// Check for common issues
function checkCommonIssues(filePath, content) {
  const issues = [];
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Console usage rules
  if (config.rules.console.enabled) {
    const consoleMatches = content.match(/console\.(log|warn|error|info|debug)/g);
    if (consoleMatches) {
      const isAllowed = isConsoleAllowed(relativePath, filePath);
      if (!isAllowed) {
        issues.push({
          type: 'console',
          message: `Console usage detected: ${consoleMatches.join(', ')}`,
          severity: config.rules.console.severity
        });
      }
    }
  }
  
  // 'as any' usage
  if (config.rules.asAny.enabled) {
    const asAnyMatches = content.match(/as\s+any/gi);
    if (asAnyMatches) {
      issues.push({
        type: 'as-any',
        message: `'as any' usage detected: ${asAnyMatches.length} occurrence(s)`,
        severity: config.rules.asAny.severity
      });
    }
  }
  
  // TODO/FIXME comments
  if (config.rules.todo.enabled) {
    const todoMatches = content.match(/(TODO|FIXME|HACK|XXX):\s*(.+)/gi);
    if (todoMatches) {
      issues.push({
        type: 'todo',
        message: `TODO/FIXME comments found: ${todoMatches.length} occurrence(s)`,
        severity: 'info'
      });
    }
  }
  
  return issues;
}

// Check if console usage is allowed for this file
function isConsoleAllowed(relativePath, filePath) {
  const rules = config.rules.console;
  
  // Check path patterns
  if (rules.allowIn && rules.allowIn.paths) {
    for (const pattern of rules.allowIn.paths) {
      if (relativePath.includes(pattern)) {
        return true;
      }
    }
  }
  
  // Check file types
  if (rules.allowIn && rules.allowIn.fileTypes) {
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath);
    
    for (const fileType of rules.allowIn.fileTypes) {
      if (fileType === 'component' && (ext === '.tsx' || ext === '.jsx')) {
        return true;
      }
      if (fileType === 'test' && (fileName.includes('.test.') || fileName.includes('.spec.'))) {
        return true;
      }
      if (fileType === 'server' && relativePath.startsWith('server/')) {
        return true;
      }
      if (fileType === 'scripts' && relativePath.startsWith('scripts/')) {
        return true;
      }
    }
  }
  
  return false;
}

// Main execution
function main() {
  try {
    // Parse input from stdin
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    
    process.stdin.on('end', () => {
      try {
        const data = JSON.parse(input);
        const filePath = data.tool_input?.file_path;
        
        if (!filePath) {
          console.error('[ERROR] No file_path provided in tool input');
          process.exit(1);
        }
        
        debugLog(`Processing file: ${filePath}`);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.error(`[ERROR] File not found: ${filePath}`);
          process.exit(1);
        }
        
        // Read file content
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Run all checks
        const results = {
          typescript: runTypeScriptCheck(filePath),
          eslint: runESLintCheck(filePath),
          prettier: runPrettierCheck(filePath),
          commonIssues: checkCommonIssues(filePath, content)
        };
        
        // Collect all errors
        const errors = [];
        
        if (!results.typescript.success) {
          errors.push(`[TYPESCRIPT ERROR]\n${results.typescript.output}`);
        }
        
        if (!results.eslint.success) {
          errors.push(`[ESLINT ERROR]\n${results.eslint.output}`);
        }
        
        if (!results.prettier.success) {
          errors.push(`[PRETTIER ERROR]\n${results.prettier.output}`);
        }
        
        // Add common issues based on severity
        for (const issue of results.commonIssues) {
          if (issue.severity === 'error') {
            errors.push(`[${issue.type.toUpperCase()}] ${issue.message}`);
          } else if (issue.severity === 'warning') {
            console.log(`[WARN] ${issue.message}`);
          } else if (issue.severity === 'info') {
            console.log(`[INFO] ${issue.message}`);
          }
        }
        
        // Exit with appropriate code
        if (errors.length > 0) {
          console.error(errors.join('\n\n'));
          process.exit(2);
        } else {
          console.log('[OK] All quality checks passed');
          process.exit(0);
        }
        
      } catch (error) {
        console.error('[ERROR] Failed to process input:', error.message);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('[ERROR] Hook execution failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
