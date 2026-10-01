const { toQR } = require('toqr');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || process.env.EXPO_URL || (process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace(/^http:\/\//, 'exp://').replace(/:[0-9]+$/, ':8081')
  : 'exp://192.168.1.216:8081');
const data = toQR(url);
const extent = Math.sqrt(data.length) | 0;
const quiet = 4;
const totalSize = extent + quiet * 2;
const scale = 12;
const svgSize = totalSize * scale;

// SVG
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">\n`;
svg += `  <rect width="100%" height="100%" fill="#ffffff"/>\n`;
for (let r = 0; r < extent; r++) {
  for (let c = 0; c < extent; c++) {
    if (data[r * extent + c] === 0) {
      const x = (c + quiet) * scale;
      const y = (r + quiet) * scale;
      svg += `  <rect x="${x}" y="${y}" width="${scale}" height="${scale}" fill="#000000"/>\n`;
    }
  }
}
svg += '</svg>\n';
fs.writeFileSync(path.join(__dirname, '..', 'expo-qr.svg'), svg);

// HTML preview
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ClassAssist - Scan on Expo Go</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #F2F2F7;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      color: #1C1C1E;
    }
    .card {
      background: #ffffff;
      border-radius: 24px;
      padding: 36px 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      text-align: center;
      max-width: 440px;
      width: 100%;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 26px;
      letter-spacing: -0.5px;
    }
    p {
      color: #68686F;
      margin: 0 0 24px 0;
      font-size: 15px;
      line-height: 1.4;
    }
    .qr-box {
      background: #fff;
      padding: 16px;
      border-radius: 16px;
      display: inline-block;
      border: 1px solid #E7E7ED;
      margin-bottom: 24px;
    }
    .url {
      background: #F6F6F9;
      padding: 12px 16px;
      border-radius: 12px;
      font-family: monospace;
      font-size: 14px;
      word-break: break-all;
      margin-bottom: 20px;
      color: #0064D9;
      font-weight: 600;
    }
    .accounts {
      text-align: left;
      background: #FAFAFC;
      border-radius: 14px;
      padding: 16px;
      font-size: 13px;
      border: 1px solid #EAEAEE;
    }
    .accounts h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #1C1C1E;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: #E9EFEC;
      color: #24754B;
      margin-left: 6px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Scan with Expo Go</h1>
    <p>Open <strong>Expo Go</strong> on your phone (or Camera app on iOS) and scan the QR code below.</p>
    <div class="qr-box">
      ${svg}
    </div>
    <div class="url">
      ${url}
    </div>
    <div class="accounts">
      <h3>Quick Demo Accounts</h3>
      <div><strong>Teacher:</strong> teacher@classassist.demo <span class="badge">Teacher</span></div>
      <div><strong>Student:</strong> student@classassist.demo <span class="badge">Student</span></div>
      <div style="margin-top: 6px;"><strong>Password:</strong> ClassAssist-demo-2026!</div>
      <div style="margin-top: 8px; color: #8E8E93; font-size: 12px;">* Also available via one-tap "Demo Teacher" / "Demo Student" buttons on the app sign-in screen.</div>
    </div>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(__dirname, '..', 'expo-qr.html'), html);

// Text output (Half block)
const CHAR_00 = '\u2588'; // Full block (both black)
const CHAR_10 = '\u2584'; // Lower block
const CHAR_01 = '\u2580'; // Upper block
const CHAR_11 = ' ';      // Space (both white)

let textQR = CHAR_10.repeat(extent + 2);
for (let row = 0; row < extent; row += 2) {
  textQR += '\n' + CHAR_00;
  for (let col = 0; col < extent; col++) {
    const top = data[row * extent + col] === 0 ? 0 : 1;
    const btm = (row + 1 < extent) ? (data[(row + 1) * extent + col] === 0 ? 0 : 1) : 1;
    const val = (top << 1) | btm;
    switch (val) {
      case 0: textQR += CHAR_00; break;
      case 1: textQR += CHAR_01; break;
      case 2: textQR += CHAR_10; break;
      case 3: textQR += CHAR_11; break;
    }
  }
  textQR += CHAR_00;
}
if (extent % 2 === 0) {
  textQR += '\n' + CHAR_01.repeat(extent + 2);
}
fs.writeFileSync(path.join(__dirname, '..', 'expo-qr.txt'), textQR);
console.log('Generated expo-qr.svg, expo-qr.html, and expo-qr.txt');
