const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8088;
const APK_PATH = path.resolve(__dirname, '../android/app/build/outputs/apk/release/app-release.apk');

function getLocalIP() {
  const nets = os.networkInterfaces();
  // First pass: look for typical 192.168.x.x LAN IPs
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
        return net.address;
      }
    }
  }
  // Second pass: any valid non-link-local, non-VPN IP
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('10.') && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  // Fallback if none found
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/IslamicPlanner.apk' || url === '/download' || url === '/app-release.apk') {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('APK file not found.');
      return;
    }

    const stat = fs.statSync(APK_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="IslamicPlanner.apk"',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const readStream = fs.createReadStream(APK_PATH);
    readStream.pipe(res);
    return;
  }

  // Serve landing page with download button & instructions
  const ip = getLocalIP();
  const downloadUrl = `http://${ip}:${PORT}/IslamicPlanner.apk`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(downloadUrl)}`;

  const apkExists = fs.existsSync(APK_PATH);
  const sizeMb = apkExists ? (fs.statSync(APK_PATH).size / (1024 * 1024)).toFixed(1) : 'Unknown';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Islamic Planner - Direct APK Download</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0D1B1E;
      color: #E6ECEF;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #15272B;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .badge {
      display: inline-block;
      background: rgba(30, 142, 110, 0.2);
      color: #3CD070;
      font-weight: 600;
      font-size: 13px;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #FFFFFF;
    }
    p.sub {
      font-size: 14px;
      color: #8E9BAE;
      margin-bottom: 24px;
    }
    .qr-container {
      background: #FFFFFF;
      padding: 12px;
      border-radius: 16px;
      display: inline-block;
      margin-bottom: 24px;
    }
    .qr-container img {
      display: block;
      width: 200px;
      height: 200px;
    }
    .btn {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #1E8E6E 0%, #177258 100%);
      color: #FFFFFF;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 4px 14px rgba(30, 142, 110, 0.4);
      transition: transform 0.15s ease;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .meta {
      margin-top: 16px;
      font-size: 12px;
      color: #6C7D8F;
    }
    .steps {
      margin-top: 24px;
      text-align: left;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 14px;
      padding: 16px;
      font-size: 13px;
      color: #A0B0C0;
      line-height: 1.6;
    }
    .steps ol { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">APK Ready to Install</div>
    <h1>Islamic Planner</h1>
    <p class="sub">Release Build (${sizeMb} MB) &bull; Hermes Engine &bull; Offline</p>
    
    <div class="qr-container">
      <img src="${qrApiUrl}" alt="Scan QR Code to Download" />
    </div>

    <a href="/IslamicPlanner.apk" class="btn">
      Direct Download (.apk)
    </a>

    <p class="meta">Download URL: <code>${downloadUrl}</code></p>

    <div class="steps">
      <strong>Installation Steps:</strong>
      <ol>
        <li>Tap <strong>Direct Download</strong> above or scan the QR code with your phone camera.</li>
        <li>Once downloaded, open the notification or file manager.</li>
        <li>Tap <strong>Install</strong> (Allow <em>Install unknown apps</em> for your browser if prompted).</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`[APK Server] Running!`);
  console.log(`[APK Server] Local URL:    http://localhost:${PORT}`);
  console.log(`[APK Server] Phone/LAN URL: http://${ip}:${PORT}`);
  console.log(`[APK Server] Direct File:  http://${ip}:${PORT}/IslamicPlanner.apk`);
});
