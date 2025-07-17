# Windows Build Testing Guide

## Summary of Changes Made

### 1. Updated package.json electron-builder configuration:
- Added `portable` target alongside `nsis` for Windows
- Added consistent `artifactName` patterns for predictable file naming
- Files will now be generated as:
  - Installer: `Dashboard Penilaian Kinerja Pegawai Dinas Sosial-Setup-{version}.exe`
  - Portable: `Dashboard Penilaian Kinerja Pegawai Dinas Sosial-{version}-portable.exe`

### 2. Updated GitHub Actions workflow:
- Improved file discovery using `find` command to locate all .exe files
- Enhanced logging to show exactly what files are generated
- More robust upload process that finds files regardless of exact naming

## To Test Windows Build Locally:

Since you're on macOS, you can't build Windows executables directly. However, you can:

1. **Use Windows Virtual Machine or Windows PC:**
   ```bash
   npm install
   npm run dist:win
   ```

2. **Check what would be generated:**
   ```bash
   # This will show you the electron-builder configuration
   npx electron-builder --help
   
   # This will do a dry run (won't actually build but shows what would happen)
   npx electron-builder --win --publish=never --dry-run
   ```

## To Trigger a New Release:

1. **Create and push a new tag:**
   ```bash
   git add .
   git commit -m "fix: update Windows build configuration for proper .exe generation"
   git tag v1.0.12
   git push origin v1.0.12
   ```

2. **Or trigger manually from GitHub Actions:**
   - Go to your repository on GitHub
   - Navigate to Actions → Release Windows
   - Click "Run workflow"
   - Enter version like `v1.0.12`

## Expected Output Files:

After the build, you should see in the `release/` directory:
- `Dashboard Penilaian Kinerja Pegawai Dinas Sosial-Setup-1.0.12.exe` (NSIS installer)
- `Dashboard Penilaian Kinerja Pegawai Dinas Sosial-1.0.12-portable.exe` (Portable executable)
- Various other files and directories

## If Issues Persist:

The workflow now includes comprehensive logging, so check the GitHub Actions logs to see:
1. What files are actually generated
2. Which upload attempts succeed/fail
3. Any error messages during the build process