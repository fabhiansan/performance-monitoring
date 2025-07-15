const { copyFileSync, existsSync } = require('fs');
const { join } = require('path');

exports.default = async function(context) {
  console.log('Running afterPack hook...');
  
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName === 'win32') {
    // Try multiple possible locations for ffmpeg.dll
    const electronDist = join(__dirname, 'node_modules', 'electron', 'dist');
    const possibleSources = [
      join(electronDist, 'ffmpeg.dll'),
      join(electronDist, 'resources', 'ffmpeg.dll'),
      join(__dirname, 'node_modules', 'electron', 'dist', 'ffmpeg.dll')
    ];
    
    const ffmpegTarget = join(appOutDir, 'ffmpeg.dll');
    
    console.log('Windows build detected, looking for ffmpeg.dll...');
    console.log('Target:', ffmpegTarget);
    
    let ffmpegSource = null;
    for (const source of possibleSources) {
      console.log('Checking:', source);
      if (existsSync(source)) {
        ffmpegSource = source;
        break;
      }
    }
    
    if (ffmpegSource) {
      console.log('Found ffmpeg.dll at:', ffmpegSource);
      copyFileSync(ffmpegSource, ffmpegTarget);
      console.log('ffmpeg.dll copied successfully to:', ffmpegTarget);
    } else {
      console.warn('ffmpeg.dll not found in any expected location:');
      possibleSources.forEach(source => console.warn('  -', source));
      console.warn('The application may fail to start on Windows due to missing ffmpeg.dll');
    }
  }
};