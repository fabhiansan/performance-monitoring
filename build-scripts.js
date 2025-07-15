const { copyFileSync, existsSync } = require('fs');
const { join } = require('path');

exports.default = async function(context) {
  console.log('Running afterPack hook...');
  
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName === 'win32') {
    const electronDist = join(__dirname, 'node_modules', 'electron', 'dist');
    const ffmpegSource = join(electronDist, 'ffmpeg.dll');
    const ffmpegTarget = join(appOutDir, 'ffmpeg.dll');
    
    console.log('Windows build detected, copying ffmpeg.dll...');
    console.log('Source:', ffmpegSource);
    console.log('Target:', ffmpegTarget);
    console.log('Source exists:', existsSync(ffmpegSource));
    
    if (existsSync(ffmpegSource)) {
      copyFileSync(ffmpegSource, ffmpegTarget);
      console.log('ffmpeg.dll copied successfully');
    } else {
      console.warn('ffmpeg.dll not found in electron dist, build may fail');
    }
  }
};