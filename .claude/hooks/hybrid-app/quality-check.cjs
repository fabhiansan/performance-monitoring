#!/usr/bin/env node

/**
 * Claude Code Quality Hook for Modern React + Electron + Node.js TypeScript Projects
 * 
 * This hook provides quality checks for projects that combine:
 * - React 19 frontend (components/, hooks/, design-system/, App.tsx, etc.)
 * - Electron main process (main.ts, electron-config.ts)
 * - Node.js backend (server/, services/, scripts/, middleware/)
 * - Modern tooling (Vite, Vitest, TanStack Query, Zustand, Fastify, Pino)
 * 
 * Features:
 * - Smart TypeScript config detection (tsconfig.json vs tsconfig.node.json)
 * - Console usage rules (allowed in components, server, scripts, hooks, design-system; warned in main process)
 * - JSX support for React components (React 19 JSX transform)
 * - Vitest test file detection and appropriate rules
 * - Auto-fixing with ESLint and Prettier
 * - Performance optimized with caching
 * - Support for new tech stack patterns and dependencies
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
    
    // Map frontend files to frontend config
    mappings['components/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['contexts/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['hooks/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['design-system/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['utils/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['constants/**/*'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['App.tsx'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['index.tsx'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['types.ts'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['vite.config.ts'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['vitest.config.ts'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
    mappings['tailwind.config.ts'] = { configPath: 'tsconfig.json', excludes: ['node_modules', 'test'] };
  }
  
  // Check for tsconfig.playwright.json (Playwright tests)
  const playwrightConfigPath = path.join(process.cwd(), 'tsconfig.playwright.json');
  if (fs.existsSync(playwrightConfigPath)) {
    const content = fs.readFileSync(playwrightConfigPath, 'utf8');
    hashes['tsconfig.playwright.json'] = crypto.createHash('sha256').update(content).digest('hex');
    
    // Map Playwright test files
    mappings['test/**/*'] = { configPath: 'tsconfig.playwright.json', excludes: ['node_modules'] };
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

// TypeScript result cache
const tsResultCache = new Map();

// Check if file should be skipped for TypeScript checking
function shouldSkipTypeScriptCheck(filePath) {
  if (!config.typescript.performance || !config.typescript.performance.enabled) {
    return false;
  }
  
  const relativePath = path.relative(process.cwd(), filePath);
  const ext = path.extname(filePath);
  
  // Skip non-TypeScript files
  if (!['.ts', '.tsx'].includes(ext)) {
    return true;
  }
  
  // Skip test files if they're not critical
  if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    return false; // Still check test files but with lower priority
  }
  
  // Skip config files that rarely change
  if (config.typescript.performance.skipConfigFiles && 
      (relativePath.includes('.config.') || relativePath.includes('tsconfig'))) {
    return true;
  }
  
  // Skip build output files
  if (config.typescript.performance.skipBuildFiles && 
      (relativePath.includes('dist/') || relativePath.includes('build/') || relativePath.includes('release/'))) {
    return true;
  }
  
  return false;
}

// Get cached TypeScript result
function getCachedTsResult(filePath) {
  if (!config.typescript.performance || !config.typescript.performance.enabled) {
    return null;
  }
  
  const cacheTimeout = config.typescript.performance.cacheTimeout || 30000;
  const cacheKey = filePath; // Use just the file path as key
  const cached = tsResultCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < cacheTimeout) {
    debugLog(`Using cached TypeScript result for ${filePath} (age: ${Date.now() - cached.timestamp}ms)`);
    return cached.result;
  }
  
  return null;
}

// Cache TypeScript result
function cacheTsResult(filePath, result) {
  if (!config.typescript.performance || !config.typescript.performance.enabled) {
    return;
  }
  
  const cacheTimeout = config.typescript.performance.cacheTimeout || 30000;
  const cacheKey = filePath; // Use just the file path as key
  tsResultCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  
  debugLog(`Cached TypeScript result for ${filePath}`);
  
  // Clean old cache entries
  if (tsResultCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of tsResultCache.entries()) {
      if (now - value.timestamp > cacheTimeout) {
        tsResultCache.delete(key);
      }
    }
  }
}

// Run TypeScript check with optimizations
function runTypeScriptCheck(filePath) {
  if (!config.typescript.enabled) {
    return { success: true, output: '' };
  }

  const startTime = Date.now();

  // Check if we should skip this file
  if (shouldSkipTypeScriptCheck(filePath)) {
    debugLog(`Skipping TypeScript check for ${filePath}`);
    return { success: true, output: 'Skipped (non-critical file)' };
  }

  // Check cache first
  const cached = getCachedTsResult(filePath);
  if (cached) {
    const duration = Date.now() - startTime;
    debugLog(`TypeScript check completed in ${duration}ms (cached)`);
    return cached;
  }

  try {
    const tsConfig = getTsConfigForFile(filePath);
    debugLog(`Using TypeScript config: ${tsConfig}`);
    
    // Use incremental compilation if available and enabled
    const useIncremental = config.typescript.performance?.useIncremental !== false;
    const incrementalFlag = useIncremental && fs.existsSync(path.join(process.cwd(), 'tsconfig.tsbuildinfo')) ? '--incremental' : '';
    
    // Build TypeScript command based on configuration
    let command;
    if (config.typescript.checkBothConfigs && tsConfig === 'tsconfig.json') {
      // Check both frontend and backend configs for frontend files
      command = `npx tsc --noEmit && npx tsc --project tsconfig.node.json --noEmit`;
    } else {
      // Use single config approach
      command = `npx tsc --noEmit --project ${tsConfig} --skipLibCheck ${incrementalFlag} --pretty false`;
    }
    
    const timeout = config.typescript.performance?.timeout || 10000;
    const output = execSync(command, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: timeout
    });
    
    const duration = Date.now() - startTime;
    debugLog(`TypeScript check completed in ${duration}ms`);
    const result = { success: true, output: output.trim() };
    cacheTsResult(filePath, result);
    return result;
  } catch (error) {
    const output = error.stdout || error.stderr || error.message;
    
    // Filter out dependency errors if not showing them
    if (!config.typescript.showDependencyErrors) {
      const lines = output.split('\n');
      const filteredLines = lines.filter(line => 
        !line.includes('node_modules') && 
        !line.includes('Could not find declaration file') &&
        !line.includes('TS2307') && // Module not found errors
        !line.includes('TS7016') && // Could not find declaration file
        line.includes(filePath) // Only show errors for the specific file
      );
      const filteredOutput = filteredLines.join('\n').trim();
      
      const duration = Date.now() - startTime;
      debugLog(`TypeScript check completed in ${duration}ms (with errors)`);
      
      if (filteredOutput) {
        const result = { success: false, output: filteredOutput };
        cacheTsResult(filePath, result);
        return result;
      } else {
        const result = { success: true, output: '' };
        cacheTsResult(filePath, result);
        return result;
      }
    }
    
    // Filter to only show errors for the specific file
    const lines = output.split('\n');
    const filteredLines = lines.filter(line => line.includes(filePath));
    const filteredOutput = filteredLines.join('\n').trim();
    
    const duration = Date.now() - startTime;
    debugLog(`TypeScript check completed in ${duration}ms (with errors)`);
    
    if (filteredOutput) {
      const result = { success: false, output: filteredOutput };
      cacheTsResult(filePath, result);
      return result;
    } else {
      const result = { success: true, output: '' };
      cacheTsResult(filePath, result);
      return result;
    }
  }
}

// Run ESLint check and auto-fix
function runESLintCheck(filePath) {
  if (!config.eslint.enabled) {
    return { success: true, output: '' };
  }

  // Check if ESLint is available
  try {
    execSync('npx eslint --version', { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
  } catch (error) {
    debugLog('ESLint not available, skipping ESLint checks');
    return { success: true, output: 'ESLint not configured' };
  }

  try {
    // Build ESLint command with config file if specified
    const configFile = config.eslint.configFile ? `--config ${config.eslint.configFile}` : '';
    const extensions = config.eslint.extensions ? `--ext ${config.eslint.extensions.join(',')}` : '';
    
    // First try to auto-fix
    if (config.eslint.autofix) {
      try {
        execSync(`npx eslint ${configFile} ${extensions} --fix "${filePath}"`, { 
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
    const output = execSync(`npx eslint ${configFile} ${extensions} "${filePath}"`, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    return { success: true, output: output.trim() };
  } catch (error) {
    const output = error.stdout || error.stderr || error.message;
    
    // If ESLint config is missing, treat as warning not error
    if (output.includes('ESLint couldn\'t find an eslint.config') || 
        output.includes('Could not find a config file')) {
      debugLog('ESLint config missing, treating as warning');
      return { success: true, output: 'ESLint config missing' };
    }
    
    return { success: false, output: output.trim() };
  }
}

// Run Prettier check and auto-fix
function runPrettierCheck(filePath) {
  if (!config.prettier.enabled) {
    return { success: true, output: '' };
  }

  // Check if Prettier is available
  try {
    execSync('npx prettier --version', { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
  } catch (error) {
    debugLog('Prettier not available, skipping Prettier checks');
    return { success: true, output: 'Prettier not configured' };
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
  
  // Unused imports check
  if (config.rules.unusedImports.enabled) {
    const importMatches = content.match(/^import\s+.*from\s+['"][^'"]+['"];?$/gm);
    if (importMatches) {
      // Basic check for potentially unused imports (simplified)
      const importLines = importMatches.map(line => line.trim());
      const usedImports = [];
      
      for (const importLine of importLines) {
        const importMatch = importLine.match(/import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          const moduleName = importMatch[1];
          const isUsed = content.includes(moduleName.split('/').pop()) || 
                        content.includes(moduleName.split('/').slice(-2).join('/'));
          if (!isUsed && !relativePath.includes('.test.') && !relativePath.includes('.spec.')) {
            usedImports.push(importLine);
          }
        }
      }
      
      if (usedImports.length > 0) {
        issues.push({
          type: 'unused-imports',
          message: `Potentially unused imports detected: ${usedImports.length} occurrence(s)`,
          severity: config.rules.unusedImports.severity
        });
      }
    }
  }
  
  // React Hooks rules
  if (config.rules.reactHooks.enabled && (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))) {
    // Check for missing dependencies in useEffect
    const useEffectMatches = content.match(/useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{[^}]*\},\s*\[[^\]]*\]/g);
    if (useEffectMatches) {
      for (const match of useEffectMatches) {
        if (!match.includes('eslint-disable-next-line') && !match.includes('// eslint-disable')) {
          // This is a simplified check - ESLint will catch the actual issues
          issues.push({
            type: 'react-hooks',
            message: 'useEffect detected - ensure dependencies are correctly specified',
            severity: 'info'
          });
        }
      }
    }
  }
  
  // Vitest test file detection
  if (config.vitest && config.vitest.enabled) {
    const isTestFile = config.vitest.testPatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(relativePath);
    });
    
    if (isTestFile) {
      // Check for common test patterns
      if (!content.includes('describe') && !content.includes('it') && !content.includes('test') && !content.includes('expect')) {
        issues.push({
          type: 'test-patterns',
          message: 'Test file detected but no test patterns found (describe, it, test, expect)',
          severity: 'warning'
        });
      }
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
      if (fileType === 'test' && (fileName.includes('.test.') || fileName.includes('.spec.') || relativePath.startsWith('test/') || relativePath.startsWith('src/__tests__/'))) {
        return true;
      }
      if (fileType === 'server' && (relativePath.startsWith('server/') || relativePath.startsWith('services/') || relativePath.startsWith('middleware/'))) {
        return true;
      }
      if (fileType === 'scripts' && relativePath.startsWith('scripts/')) {
        return true;
      }
      if (fileType === 'hooks' && relativePath.startsWith('hooks/')) {
        return true;
      }
      if (fileType === 'design-system' && relativePath.startsWith('design-system/')) {
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
        
        // Check for cognitive complexity if enabled
        if (config.rules.cognitiveComplexity && config.rules.cognitiveComplexity.enabled) {
          // This is a simplified check - ESLint with SonarJS will catch the actual issues
          const complexPatterns = [
            /if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{/g, // Nested ifs
            /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)\s*\{/g, // Nested fors
            /while\s*\([^)]+\)\s*\{[^}]*while\s*\([^)]+\)\s*\{[^}]*while\s*\([^)]+\)\s*\{/g // Nested whiles
          ];
          
          let complexityScore = 0;
          for (const pattern of complexPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              complexityScore += matches.length * 3; // Each nested structure adds complexity
            }
          }
          
          if (complexityScore > config.rules.cognitiveComplexity.maxComplexity) {
            errors.push(`[COGNITIVE_COMPLEXITY] Function complexity may exceed ${config.rules.cognitiveComplexity.maxComplexity} (estimated: ${complexityScore})`);
          }
        }
        
        // Show ESLint warnings as well
        if (results.eslint.success && results.eslint.output && results.eslint.output !== 'ESLint not configured' && results.eslint.output !== 'ESLint config missing') {
          console.log(`[ESLINT] ${results.eslint.output}`);
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
