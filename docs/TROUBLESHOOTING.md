# Troubleshooting Guide

This guide helps resolve common issues with the Employee Performance Analyzer, particularly the "server exit code 1" issue and other native module compilation problems.

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Server Exit Code 1 Issue](#server-exit-code-1-issue)
- [Native Module Issues](#native-module-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Database Issues](#database-issues)
- [Build and Deployment Issues](#build-and-deployment-issues)
- [Development Issues](#development-issues)
- [Advanced Troubleshooting](#advanced-troubleshooting)

## Quick Diagnosis

### Run Diagnostic Tools

Before troubleshooting, run our diagnostic tools to identify the issue:

```bash
# Check native module status
npm run check:native

# Check with verbose output
npm run check:native -- --verbose

# Get JSON output for detailed analysis
npm run check:native -- --json
```

### Common Quick Fixes

1. **Rebuild native modules:**
   ```bash
   npm run rebuild:native
   ```

2. **Clean installation:**
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

3. **Electron-specific rebuild:**
   ```bash
   npm run rebuild:electron
   ```

## Server Exit Code 1 Issue

This is the most common issue, typically caused by native module compilation problems.

### Symptoms

- Application shows "server exit code 1" after build
- Server process starts but immediately crashes
- Database connection errors
- Error messages mentioning `better-sqlite3`

### Root Cause

The `better-sqlite3` native module is not properly compiled for the target environment (Node.js vs Electron).

### Solutions

#### 1. Quick Fix (Recommended)

```bash
# Comprehensive native module rebuild
npm run rebuild:native

# Then rebuild your application
npm run build
npm run electron:build
```

#### 2. Step-by-Step Fix

```bash
# 1. Clean everything
rm -rf node_modules package-lock.json dist

# 2. Fresh install
npm install

# 3. Rebuild for target environment
npm run rebuild:electron  # For Electron app
# OR
npm run rebuild:node      # For Node.js web app

# 4. Build application
npm run build

# 5. Test
npm run electron:build    # For Electron
# OR
npm run dev:full          # For web app
```

#### 3. Manual Rebuild

If automatic rebuilding fails:

```bash
# Navigate to better-sqlite3 directory
cd node_modules/better-sqlite3

# Manual rebuild with node-gyp
npx node-gyp rebuild --target=XX.X.X --runtime=electron --dist-url=https://electronjs.org/headers

# Replace XX.X.X with your Electron version from package.json
```

## Native Module Issues

### better-sqlite3 Compilation Errors

#### Symptoms
- `Module did not self-register`
- `Cannot find module 'better-sqlite3'`
- `The specified procedure could not be found`

#### Solutions

1. **Install build tools:**

   **Windows:**
   ```bash
   npm install -g windows-build-tools
   # OR install Visual Studio Build Tools manually
   ```

   **macOS:**
   ```bash
   xcode-select --install
   ```

   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt-get install build-essential python3
   ```

   **Linux (RHEL/CentOS):**
   ```bash
   sudo yum install gcc gcc-c++ make python3
   ```

2. **Rebuild with force:**
   ```bash
   npm run rebuild:native -- --force
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   npm --version
   ```
   Ensure you're using Node.js 16 or later.

### Architecture Mismatch

#### Symptoms
- Works in development but fails in production build
- Error messages about architecture incompatibility

#### Solutions

1. **Check current architecture:**
   ```bash
   node -e "console.log(process.arch, process.platform)"
   ```

2. **Rebuild for correct architecture:**
   ```bash
   npm run rebuild:native
   ```

3. **For cross-compilation issues:**
   ```bash
   # Clean and rebuild specifically for target platform
   rm -rf node_modules/better-sqlite3/build
   npm rebuild better-sqlite3
   ```

## Platform-Specific Issues

### Windows Issues

#### Visual Studio Build Tools Missing

**Symptoms:**
- `error MSB8003: Could not find WindowsSDKDir variable`
- `MSBUILD : error MSB3428: Could not load the Visual C++ component`

**Solutions:**
1. Install Visual Studio Build Tools:
   - Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio
   - Or use: `npm install -g windows-build-tools`

2. Set Python path:
   ```bash
   npm config set python python3
   ```

#### Windows Defender / Antivirus

**Symptoms:**
- Build process hangs or fails intermittently
- Files disappear during build

**Solutions:**
1. Add project directory to antivirus exclusions
2. Temporarily disable real-time protection during build

### macOS Issues

#### Xcode Command Line Tools

**Symptoms:**
- `gyp: No Xcode or CLT version detected!`
- `xcrun: error: invalid active developer path`

**Solutions:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# If already installed, reset the path
sudo xcode-select --reset
```

#### Apple Silicon (M1/M2) Issues

**Symptoms:**
- Architecture mismatch errors
- Native modules fail to load

**Solutions:**
```bash
# Ensure correct architecture
arch -x86_64 npm install  # For x86_64 compatibility
# OR
arch -arm64 npm install   # For native ARM64

# Rebuild for current architecture
npm run rebuild:native
```

### Linux Issues

#### Missing Build Dependencies

**Symptoms:**
- `make: command not found`
- `gcc: command not found`
- `Python not found`

**Solutions:**

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install build-essential python3 python3-pip
```

**RHEL/CentOS/Fedora:**
```bash
sudo yum install gcc gcc-c++ make python3
# OR (newer versions)
sudo dnf install gcc gcc-c++ make python3
```

#### GLIBC Version Issues

**Symptoms:**
- `/lib64/libc.so.6: version GLIBC_X.XX not found`

**Solutions:**
1. Update system packages:
   ```bash
   sudo apt-get update && sudo apt-get upgrade  # Ubuntu/Debian
   sudo yum update                               # RHEL/CentOS
   ```

2. Rebuild on target system:
   ```bash
   npm run rebuild:native
   ```

## Database Issues

### Database File Permissions

**Symptoms:**
- `SQLITE_CANTOPEN` errors
- `permission denied` when accessing database

**Solutions:**

1. **Check directory permissions:**
   ```bash
   # Make userData directory writable
   chmod 755 ~/.config/Employee\ Performance\ Analyzer/
   ```

2. **For web development:**
   ```bash
   # Ensure server directory is writable
   chmod 755 server/
   ```

### Database Corruption

**Symptoms:**
- `database disk image is malformed`
- Application starts but data is missing

**Solutions:**

1. **Backup and recreate:**
   ```bash
   # Backup existing database
   cp server/performance_analyzer.db server/performance_analyzer.db.backup

   # Remove corrupted database (will be recreated automatically)
   rm server/performance_analyzer.db
   ```

2. **For Electron app:**
   - Find the userData directory:
     - **Windows:** `%APPDATA%\Employee Performance Analyzer\`
     - **macOS:** `~/Library/Application Support/Employee Performance Analyzer/`
     - **Linux:** `~/.config/Employee Performance Analyzer/`
   - Backup and remove the database file

## Build and Deployment Issues

### Electron Build Failures

**Symptoms:**
- Build succeeds but packaged app won't start
- Missing native modules in packaged app

**Solutions:**

1. **Ensure proper asar unpacking:**
   Check `package.json` build configuration includes:
   ```json
   {
     "build": {
       "asarUnpack": [
         "server/**/*",
         "scripts/**/*",
         "node_modules/better-sqlite3/**/*"
       ]
     }
   }
   ```

2. **Rebuild before packaging:**
   ```bash
   npm run rebuild:native
   npm run build
   npm run dist
   ```

### Missing Files in Build

**Symptoms:**
- Build completes but files are missing in output
- Server files not found in packaged app

**Solutions:**

1. **Check build configuration:**
   Ensure all necessary files are included in `package.json`:
   ```json
   {
     "build": {
       "files": [
         "dist/**/*",
         "main.js",
         "server/**/*",
         "scripts/**/*"
       ]
     }
   }
   ```

2. **Verify file paths:**
   ```bash
   # Check what files are actually built
   ls -la dist/
   ```

## Development Issues

### Development Server Issues

**Symptoms:**
- `npm run dev` fails to start
- Frontend and backend connection issues

**Solutions:**

1. **Port conflicts:**
   ```bash
   # Check what's using the ports
   lsof -i :3002  # Backend port
   lsof -i :5173  # Frontend port (Vite)

   # Kill conflicting processes
   kill -9 <PID>
   ```

2. **Environment setup:**
   ```bash
   # Ensure proper environment setup
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

### Hot Reload Issues

**Symptoms:**
- Changes not reflected in development
- Vite server restarts frequently

**Solutions:**

1. **Increase file watcher limits (Linux):**
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev:vite
   ```

## Advanced Troubleshooting

### Enable Debug Logging

1. **Set environment variables:**
   ```bash
   export DEBUG=*
   export NODE_ENV=development
   npm run electron:build
   ```

2. **Check detailed logs:**
   - Electron: Developer Tools → Console
   - Node.js: Terminal output with `--verbose` flags

### Analyze Native Module Loading

1. **Check module loading:**
   ```bash
   node -e "console.log(require('better-sqlite3'))"
   ```

2. **Inspect binary compatibility:**
   ```bash
   file node_modules/better-sqlite3/build/Release/*.node
   ldd node_modules/better-sqlite3/build/Release/*.node  # Linux
   otool -L node_modules/better-sqlite3/build/Release/*.node  # macOS
   ```

### Memory and Performance Issues

1. **Monitor memory usage:**
   ```bash
   node --max-old-space-size=4096 main.js
   ```

2. **Profile performance:**
   ```bash
   node --prof main.js
   node --prof-process isolate-*.log
   ```

### Clean Slate Rebuild

If all else fails, perform a complete clean rebuild:

```bash
# 1. Remove all generated files
rm -rf node_modules
rm -rf dist
rm -rf release
rm -f package-lock.json
rm -f .vite

# 2. Clear all caches
npm cache clean --force
npx electron-builder clean

# 3. Fresh install
npm install

# 4. Rebuild native modules
npm run rebuild:native

# 5. Test in development first
npm run dev:full

# 6. Build for production
npm run build
npm run electron:build
```

## Getting Help

If you're still experiencing issues:

1. **Run diagnostics and save output:**
   ```bash
   npm run check:native --verbose > diagnostic-output.txt
   ```

2. **Check application logs:**
   - Development: Terminal output
   - Electron: Developer Tools → Console
   - Packaged app: Look for log files in userData directory

3. **Provide system information:**
   ```bash
   node --version
   npm --version
   npx electron --version
   uname -a  # Linux/macOS
   systeminfo  # Windows
   ```

4. **Create a GitHub issue with:**
   - System information
   - Complete error message
   - Steps to reproduce
   - Diagnostic output

## Common Error Messages and Solutions

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| `server exit code 1` | Native module compilation | `npm run rebuild:native` |
| `Module did not self-register` | Version mismatch | Rebuild for correct runtime |
| `Cannot find module 'better-sqlite3'` | Missing installation | `npm install` |
| `SQLITE_CANTOPEN` | File permissions | Check database directory permissions |
| `gyp ERR!` | Missing build tools | Install platform-specific build tools |
| `Python not found` | Missing Python | Install Python 3.x |
| `EADDRINUSE` | Port conflict | Change port or kill conflicting process |
| `Permission denied` | File permissions | Fix file/directory permissions |

---

**Last Updated:** January 2025

For the most up-to-date troubleshooting information, check the project repository and issues page.