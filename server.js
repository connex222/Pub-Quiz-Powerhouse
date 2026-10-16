'use strict';
/**
 * Pub Quiz Powerhouse — server.
 *
 * The quiz itself runs in the quizmaster's browser (public/index.html). This server:
 *   - serves the quiz page, its fonts and the Socket.io client, so nothing loads from the internet
 *   - relays messages between the quizmaster, team phones and TV screens (see relay.js)
 *   - tells the page which address phones should use for the QR code
 *
 * Start:  node server.js        (or double-click start.bat on Windows)
 * Quizmaster:  http://localhost:3000/
 * TV:          <address>/tv
 * Phones:      scan the QR code
 *
 * Works on a laptop (phones join over the same Wi-Fi) or hosted online (e.g. Render) with
 * no settings to change. Optional: set PUBLIC_URL to force the address used in QR codes.
 */
const path = require('path');
const os = require('os');
const http = require('http');
const { exec } = require('child_process');
const express = require('express');
const { Server } = require('socket.io');
const relay = require('./relay');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const HOSTED = !!(process.env.RENDER || process.env.PUBLIC_URL || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME);

/** This computer's Wi-Fi address, so phones on the same network can reach it. */
function lanAddress() {
  if (process.env.HOST_IP) return process.env.HOST_IP;
  const skip = /(vethernet|virtualbox|vmware|docker|wsl|hyper-v|loopback|tailscale|zerotier|vpn)/i;
  const found = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (skip.test(name)) continue;
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      let score = 0;
      if (a.address.startsWith('192.168.')) score = 3;
      else if (a.address.startsWith('10.')) score = 2;
      else if (/^172\.(1[6-9]|2\d|3[01])\./.test(a.address)) score = 1;
      if (/wi-?fi|wlan|wireless/i.test(name)) score += 1;
      found.push({ address: a.address, score });
    }
  }
  found.sort((x, y) => y.score - x.score);
  return found.length ? found[0].address : null;
}

/**
 * The address phones should use, worked out from the address the page was opened on.
 * "localhost" means this laptop, so swap in its Wi-Fi address; anything else is used as-is.
 */
function publicBase(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.trim().replace(/\/+$/, '');
  const h = req.headers || {};
  const host = String(h['x-forwarded-host'] || h.host || '').split(',')[0].trim();
  const hostname = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    const ip = lanAddress();
    return ip ? `http://${ip}:${PORT}` : null;
  }
  const proto = String(h['x-forwarded-proto'] || (req.secure ? 'https' : 'http')).split(',')[0].trim();
  return `${proto === 'https' ? 'https' : 'http'}://${host}`;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 8000, maxHttpBufferSize: 1e6 });

app.disable('x-powered-by');
app.use(express.static(PUBLIC, { extensions: ['html'], maxAge: '1h', setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('/healthz', (_req, res) => res.type('text').send('ok'));
app.get('/api/base', (req, res) => res.set('Cache-Control', 'no-store').json({ base: publicBase(req) }));
// One page does everything: quizmaster at "/", phones at "/#buzz=ROOM", TV screens at "/tv"
app.get(['/tv', '/tv/'], (_req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

relay.attach(io);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use. Is the quiz already running in another window?\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  if (HOSTED) {
    console.log(`Pub Quiz Powerhouse is running online on port ${PORT}. Quizmaster: your address. TV: your address + /tv`);
    return;
  }
  const ip = lanAddress();
  const home = `http://localhost:${PORT}/`;
  console.log('\n  PUB QUIZ POWERHOUSE is running.\n');
  console.log(`  Quizmaster:  ${home}`);
  console.log(ip ? `  Smart TV:    http://${ip}:${PORT}/tv` : '  Warning: this computer is not on a network, so phones and TVs cannot join.');
  console.log('  Phones:      scan the QR code on screen');
  console.log('\n  Keep this window open while you play. Close it to stop the quiz.\n');
  if (!process.env.NO_OPEN) {
    const cmd = process.platform === 'win32' ? `start "" "${home}"` : process.platform === 'darwin' ? `open "${home}"` : `xdg-open "${home}"`;
    exec(cmd, () => {});
  }
});

module.exports = { server, publicBase };
