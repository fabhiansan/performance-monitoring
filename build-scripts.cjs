
const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const { appOutDir, packager } = context;
  const isWin = packager.platform.name === 'windows';

  if (isWin) {
    const ffmpegPath = path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'ffmpeg.dll');
    const destPath = path.join(appOutDir, 'ffmpeg.dll');

    if (fs.existsSync(ffmpegPath)) {
      console.log('Copying ffmpeg.dll to build output...');
      fs.copyFileSync(ffmpegPath, destPath);
      console.log('ffmpeg.dll copied successfully.');
    } else {
      console.error('ffmpeg.dll not found in electron distribution. Please check your electron installation.');
      throw new Error('ffmpeg.dll not found');
    }
  }
};
