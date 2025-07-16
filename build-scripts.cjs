
const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const { appOutDir, packager } = context;
  const isWin = packager.platform.name === 'windows';

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
      console.error('ffmpeg.dll not found in any expected locations:');
      possiblePaths.forEach(p => console.error(`  - ${p}`));
      
      // List actual contents of electron dist directory for debugging
      const electronDistPath = path.join(process.cwd(), 'node_modules', 'electron', 'dist');
      if (fs.existsSync(electronDistPath)) {
        console.error('Contents of electron/dist:');
        fs.readdirSync(electronDistPath).forEach(file => {
          console.error(`  - ${file}`);
        });
      }
      
      throw new Error('ffmpeg.dll not found in electron distribution');
    }
  }
};
