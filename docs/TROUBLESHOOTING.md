# Troubleshooting Guide

## Server Exit Error (Code 1)

This error typically occurs when native modules like `better-sqlite3` fail to load due to compilation issues.

### Quick Fixes

1. **Automatic Rebuild**
   ```bash
   npm run rebuild:native
   ```

2. **Clean Rebuild**
   ```bash
   npm run build:clean
   npm install
   npm run rebuild:native
   ```

3. **Electron-Specific Rebuild**
   ```bash
   npm run rebuild:electron
   ```

### Diagnostic Tools

- **Check Native Module Status**
  ```bash
  npm run check:native
  ```

- **Verbose Diagnostics**
  ```bash
  npm run check:native -- --verbose
  ```

### Common Error Types

#### Version Mismatch
**Error**: `was compiled against a different Node.js version`
**Solution**: Run `npm run rebuild:native`

#### Missing Build Tools
**Error**: `gyp ERR! find VS`
**Solution**: Install platform-specific build tools

**Windows:**
```bash
npm install -g windows-build-tools
```

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install build-essential python3
```

#### Permission Issues
**Error**: `EACCES` or permission denied
**Solution**: Check file permissions and run with appropriate privileges

### Manual Rebuild Process

If automatic rebuilding fails:

1. **Navigate to module directory**
   ```bash
   cd node_modules/better-sqlite3
   ```

2. **Manual rebuild with Electron headers**
   ```bash
   npx node-gyp rebuild --target=30.0.6 --runtime=electron --dist-url=https://electronjs.org/headers
   ```

3. **Verify installation**
   ```bash
   node -e "console.log(require('better-sqlite3'))"
   ```

### Environment Setup

#### Required Versions
- Node.js: >= 18.0.0
- npm: >= 8.0.0
- Python: 3.x (for node-gyp)

#### Development Environment
```bash
# Check versions
node --version
npm --version
python --version

# Verify build tools
npx node-gyp --version
```

### Platform-Specific Issues

#### Windows
- Install Visual Studio Build Tools
- Ensure Python is in PATH
- Use PowerShell as Administrator if needed

#### macOS
- Install Xcode Command Line Tools
- Update to latest macOS if possible
- Check for Rosetta 2 on Apple Silicon

#### Linux
- Install build-essential package
- Ensure Python 3 is available
- Check for missing system libraries

### Advanced Troubleshooting

#### Clean Installation
```bash
# Remove all dependencies
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Fresh install
npm install

# Rebuild native modules
npm run rebuild:native
```

#### Electron Rebuild with Specific Version
```bash
npx electron-rebuild --version=30.0.6 --force
```

#### Check Module Loading
```javascript
// Test script to verify better-sqlite3 loading
try {
  const Database = require('better-sqlite3');
  console.log('✅ better-sqlite3 loaded successfully');
  const db = new Database(':memory:');
  db.exec('SELECT 1');
  db.close();
  console.log('✅ Database operations working');
} catch (error) {
  console.error('❌ Error:', error.message);
}
```

### Getting Help

If issues persist:

1. Run diagnostics: `npm run check:native -- --verbose`
2. Check the [better-sqlite3 documentation](https://github.com/WiseLibs/better-sqlite3)
3. Review [Electron native modules guide](https://www.electronjs.org/docs/tutorial/using-native-node-modules)
4. File an issue with diagnostic output

### Prevention

- Use consistent Node.js versions across team
- Include rebuild scripts in CI/CD pipeline
- Document environment setup requirements
- Regular dependency updates with testing
