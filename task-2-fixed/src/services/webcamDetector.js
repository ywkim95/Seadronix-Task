const fs = require('fs');
const { execSync } = require('child_process');

function executeFfmpegListCommand(command) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    return (error.stdout || error.stderr || '').toString();
  }
}

function findWindowsCamera() {
  const output = executeFfmpegListCommand('ffmpeg -list_devices true -f dshow -i dummy 2>&1');
  const lines = output.split('\n');
  const devices = [];

  lines.forEach((line) => {
    if (!line.includes('(video)') || !line.includes('"')) {
      return;
    }

    const match = line.match(/"([^"]+)"/);
    if (match) {
      devices.push(match[1]);
    }
  });

  const preferred = devices.find((name) => {
    const lowered = name.toLowerCase();
    return lowered.includes('integrated') || lowered.includes('built-in') || lowered.includes('webcam');
  });

  if (preferred) {
    return `video=${preferred}`;
  }

  if (devices.length > 0) {
    return `video=${devices[0]}`;
  }

  throw new Error('No webcam detected on Windows.');
}

function findMacCamera() {
  const output = executeFfmpegListCommand('ffmpeg -f avfoundation -list_devices true -i "" 2>&1');
  const lines = output.split('\n');
  const devices = [];

  lines.forEach((line) => {
    const match = line.match(/\[(\d+)\]\s+(.+)/);
    if (!match) {
      return;
    }

    if (line.toLowerCase().includes('audio')) {
      return;
    }

    devices.push({ index: match[1], name: match[2] });
  });

  const preferred = devices.find((device) => {
    const lowered = device.name.toLowerCase();
    return lowered.includes('facetime') || lowered.includes('built-in') || lowered.includes('isight');
  });

  if (preferred) {
    return preferred.index;
  }

  if (devices.length > 0) {
    return devices[0].index;
  }

  throw new Error('No webcam detected on macOS.');
}

function findLinuxCamera() {
  const deviceNames = fs.readdirSync('/dev').filter((fileName) => fileName.startsWith('video'));

  if (deviceNames.length === 0) {
    throw new Error('No webcam detected on Linux.');
  }

  return `/dev/${deviceNames[0]}`;
}

function defaultCameraByPlatform(platform) {
  if (platform === 'win32') {
    return 'video=Integrated Camera';
  }

  if (platform === 'darwin') {
    return '0';
  }

  return '/dev/video0';
}

function detectWebcamSource(platform = process.platform) {
  try {
    if (platform === 'win32') {
      return findWindowsCamera();
    }

    if (platform === 'darwin') {
      return findMacCamera();
    }

    return findLinuxCamera();
  } catch (error) {
    console.warn(`[webcam] ${error.message}. Falling back to a default camera source.`);
    return defaultCameraByPlatform(platform);
  }
}

module.exports = {
  detectWebcamSource,
};
