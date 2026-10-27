// Standalone server for hosts like Jetder: serves the page and runs the same
// api/*.js handlers Vercel would, behind a tiny req/res shim.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/groups.js': ['groups.js', 'text/javascript; charset=utf-8'],
  '/engine.js': ['engine.js', 'text/javascript; charset=utf-8'],
  '/strategies.js': ['strategies.js', 'text/javascript; charset=utf-8'],
};
const API = { auth: require('./api/auth'), play: require('./api/play'), admin: require('./api/admin') };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 1e6) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function shim(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); return res; };
  return res;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (url.pathname === '/health') { res.setHeader('Content-Type', 'text/plain'); return res.end('ok'); }

  const api = url.pathname.match(/^\/api\/(auth|play|admin)\/?$/);
  if (api) {
    shim(res);
    try { req.body = req.method === 'POST' ? await readBody(req) : {}; }
    catch { return res.status(413).json({ error: 'คำขอใหญ่เกินไป' }); }
    try { return await API[api[1]](req, res); }
    catch (e) { console.error(e); if (!res.writableEnded) res.status(500).json({ error: 'เซิร์ฟเวอร์ขัดข้อง' }); return; }
  }

  const file = STATIC[url.pathname];
  if (!file || req.method !== 'GET') { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); return res.end('not found'); }
  res.setHeader('Content-Type', file[1]);
  res.setHeader('Cache-Control', file[0] === 'index.html' ? 'no-cache' : 'public, max-age=300');
  fs.createReadStream(path.join(ROOT, file[0])).pipe(res);
}).listen(PORT, () => console.log(`sales-roleplay listening on :${PORT}`));
