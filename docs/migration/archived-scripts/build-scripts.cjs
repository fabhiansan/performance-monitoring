
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function(context) {
  const { appOutDir, packager } = context;
  const isWin = packager.platform.name === 'windows';
  const isMac = packager.platform.name === 'mac';
  const isLinux = packager.platform.name === 'linux';
  
  console.log(`Starting build post-processing for ${packager.platform.name}...`);
  
  // Native module handling
  await handleNativeModules(context);
  
  // FFmpeg handling (existing logic)

  if (isWin) {
    // Try multiple possible locations for ffmpeg.dll
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'ffmpeg.dll'),
      path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'resources', 'ffmpeg.dll'),
      path.join(process.cwd(), 'node_modules', 'electron', 'ffmpeg.dll')
    ];

    const destPath = path.join(appOutDir, 'ffmpeg.dll');
    let ffmpegPath = null;

    // Find the first existing ffmpeg.dll
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        ffmpegPath = possiblePath;
        break;
      }
    }

    if (ffmpegPath) {
      console.log(`Found ffmpeg.dll at: ${ffmpegPath}`);
      console.log('Copying ffmpeg.dll to build output...');
      fs.copyFileSync(ffmpegPath, destPath);
      console.log('ffmpeg.dll copied successfully.');
    } else {
      console.warn('ffmpeg.dll not found in any expected locations:');
      possiblePaths.forEach(p => console.warn(`  - ${p}`));
      
      // List actual contents of electron dist directory for debugging
      const electronDistPath = path.join(process.cwd(), 'node_modules', 'electron', 'dist');
      if (fs.existsSync(electronDistPath)) {
        console.warn('Contents of electron/dist:');
        fs.readdirSync(electronDistPath).forEach(file => {
          console.warn(`  - ${file}`);
        });
      }
      
      console.warn('Warning: ffmpeg.dll not found - this may be expected when cross-compiling from Linux to Windows');
      console.warn('The application should still work without it for basic functionality');
    }
  }
};

// Native module handling function
async function handleNativeModules(context) {
  const { appOutDir, packager } = context;
  const isWin = packager.platform.name === 'windows';
  const isMac = packager.platform.name === 'mac';
  const isLinux = packager.platform.name === 'linux';
  
  console.log('Handling native modules for Electron build...');
  
  try {
    // Verify better-sqlite3 is properly built for Electron
    await verifyBetterSqlite3Build(context);
    
    // Ensure native modules are in the correct location
    await ensureNativeModulesLocation(context);
    
    // Platform-specific native module handling
    if (isWin) {
      await handleWindowsNativeModules(context);
    } else if (isMac) {
      await handleMacNativeModules(context);
    } else if (isLinux) {
      await handleLinuxNativeModules(context);
    }
    
    console.log('✅ Native module handling completed successfully');
  } catch (error) {
    console.error('❌ Native module handling failed:', error.message);
    
    // Provide helpful error messages but don't fail the build
    console.warn('🔧 To fix native module issues:');
    console.warn('  1. Run: npm run rebuild:native');
    console.warn('  2. Clean build: rm -rf dist && npm run build');
    console.warn('  3. Check that build tools are installed');
    
    if (isWin) {
      console.warn('  4. Windows: Install Visual Studio Build Tools');
    } else if (isMac) {
      console.warn('  4. macOS: Install Xcode Command Line Tools');
    } else {
      console.warn('  4. Linux: Install build-essential package');
    }
  }
}

async function verifyBetterSqlite3Build(context) {
  const { appOutDir } = context;
  
  console.log('Verifying better-sqlite3 build...');
  
  // Check if better-sqlite3 exists in node_modules
  const betterSqlite3Path = path.join(process.cwd(), 'node_modules', 'better-sqlite3');
  if (!fs.existsSync(betterSqlite3Path)) {
    throw new Error('better-sqlite3 not found in node_modules');
  }
  
  // Check for build artifacts
  const buildPath = path.join(betterSqlite3Path, 'build');
  const prebuildPath = path.join(betterSqlite3Path, 'prebuilds');
  
  if (!fs.existsSync(buildPath) && !fs.existsSync(prebuildPath)) {
    console.warn('⚠️ No build artifacts found for better-sqlite3');
    console.warn('Attempting to rebuild...');
    
    try {
      // Try to rebuild better-sqlite3 for Electron
      const electronVersion = getElectronVersion();
      if (electronVersion) {
        console.log(`Rebuilding better-sqlite3 for Electron ${electronVersion}...`);
        execSync(`npx @electron/rebuild --module-dir="${betterSqlite3Path}" --which better-sqlite3`, {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } else {
        console.log('Rebuilding better-sqlite3 with node-gyp...');
        execSync('npx node-gyp rebuild', {
          stdio: 'inherit',
          cwd: betterSqlite3Path
        });
      }
      
      console.log('✅ better-sqlite3 rebuilt successfully');
    } catch (rebuildError) {
      console.warn('⚠️ Failed to rebuild better-sqlite3:', rebuildError.message);
      console.warn('The build will continue, but the application may not work properly');
    }
  } else {
    console.log('✅ better-sqlite3 build artifacts found');
  }
}

async function ensureNativeModulesLocation(context) {
  const { appOutDir } = context;
  
  console.log('Ensuring native modules are in correct location...');
  
  const sourceNodeModules = path.join(process.cwd(), 'node_modules');
  const targetNodeModules = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules');
  
  // Ensure the target directory exists
  if (!fs.existsSync(path.dirname(targetNodeModules))) {
    fs.mkdirSync(path.dirname(targetNodeModules), { recursive: true });
  }
  
  // Copy better-sqlite3 to unpacked location if not already there
  const sourceBetterSqlite3 = path.join(sourceNodeModules, 'better-sqlite3');
  const targetBetterSqlite3 = path.join(targetNodeModules, 'better-sqlite3');
  
  if (fs.existsSync(sourceBetterSqlite3) && !fs.existsSync(targetBetterSqlite3)) {
    console.log('Copying better-sqlite3 to unpacked location...');
    
    try {
      // Copy the entire better-sqlite3 directory
      copyDirectoryRecursive(sourceBetterSqlite3, targetBetterSqlite3);
      console.log('✅ better-sqlite3 copied to unpacked location');
    } catch (copyError) {
      console.warn('⚠️ Failed to copy better-sqlite3:', copyError.message);
    }
  }
}

async function handleWindowsNativeModules(context) {
  console.log('Handling Windows-specific native modules...');
  
  // Check for common Windows native module issues
  const { appOutDir } = context;
  const betterSqlite3Path = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3');
  
  if (fs.existsSync(betterSqlite3Path)) {
    const buildPath = path.join(betterSqlite3Path, 'build', 'Release');
    if (fs.existsSync(buildPath)) {
      // Check for .node files
      const nodeFiles = fs.readdirSync(buildPath).filter(file => file.endsWith('.node'));
      console.log(`Found ${nodeFiles.length} .node files in better-sqlite3 build`);
      
      if (nodeFiles.length === 0) {
        console.warn('⚠️ No .node files found in better-sqlite3 build for Windows');
      }
    }
  }
}

async function handleMacNativeModules(context) {
  console.log('Handling macOS-specific native modules...');
  
  // Check code signing for native modules
  const { appOutDir } = context;
  const betterSqlite3Path = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3');
  
  if (fs.existsSync(betterSqlite3Path)) {
    console.log('✅ better-sqlite3 found in macOS build');
    
    // Check for universal binary compatibility
    const buildPath = path.join(betterSqlite3Path, 'build', 'Release');
    if (fs.existsSync(buildPath)) {
      try {
        const nodeFiles = fs.readdirSync(buildPath).filter(file => file.endsWith('.node'));
        for (const nodeFile of nodeFiles) {
          const filePath = path.join(buildPath, nodeFile);
          try {
            const fileOutput = execSync(`file "${filePath}"`, { encoding: 'utf8' });
            console.log(`Architecture info for ${nodeFile}: ${fileOutput.trim()}`);
          } catch (error) {
            console.warn(`Could not check architecture for ${nodeFile}`);
          }
        }
      } catch (error) {
        console.warn('Could not analyze native module architecture');
      }
    }
  }
}

async function handleLinuxNativeModules(context) {
  console.log('Handling Linux-specific native modules...');
  
  // Check for GLIBC compatibility and other Linux-specific issues
  const { appOutDir } = context;
  const betterSqlite3Path = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3');
  
  if (fs.existsSync(betterSqlite3Path)) {
    console.log('✅ better-sqlite3 found in Linux build');
    
    // Check dependencies
    const buildPath = path.join(betterSqlite3Path, 'build', 'Release');
    if (fs.existsSync(buildPath)) {
      try {
        const nodeFiles = fs.readdirSync(buildPath).filter(file => file.endsWith('.node'));
        for (const nodeFile of nodeFiles) {
          const filePath = path.join(buildPath, nodeFile);
          try {
            const lddOutput = execSync(`ldd "${filePath}" 2>/dev/null || echo "ldd not available"`, { encoding: 'utf8' });
            if (!lddOutput.includes('ldd not available')) {
              console.log(`Dependencies for ${nodeFile}:`);
              console.log(lddOutput);
            }
          } catch (error) {
            console.warn(`Could not check dependencies for ${nodeFile}`);
          }
        }
      } catch (error) {
        console.warn('Could not analyze native module dependencies');
      }
    }
  }
}

function getElectronVersion() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) return null;
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const electronVersion = packageJson.devDependencies?.electron || packageJson.dependencies?.electron;
    
    if (electronVersion) {
      return electronVersion.replace(/^[\^~]/, '');
    }
    
    return null;
  } catch (error) {
    console.warn('Error detecting Electron version:', error.message);
    return null;
  }
}

function copyDirectoryRecursive(source, target) {
  if (!fs.existsSync(source)) return;
  
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  const files = fs.readdirSync(source);
  
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}
