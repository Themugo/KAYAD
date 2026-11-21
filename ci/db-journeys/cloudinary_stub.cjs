// Minimal Cloudinary-compatible stub for DISPOSABLE journeys only (loopback). It lets the REAL upload/destroy code path run
// without internet access and records every call so a journey can prove ordering (e.g. nothing is destroyed before the database confirms).
// It is NOT Cloudinary: a pass against it proves our code's behaviour, not Cloudinary's.
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');
const PORT = Number(process.env.CLOUDINARY_STUB_PORT || 9443);
const LOG = process.env.CLOUDINARY_STUB_LOG || '/tmp/cloudinary-stub.log';
const FAIL_FILE = process.env.CLOUDINARY_STUB_FAIL_FILE || '/tmp/cloudinary-stub.fail'; // while this file exists, uploads fail with HTTP 500
fs.writeFileSync(LOG, '');
const IMG = process.env.CLOUDINARY_STUB_IMAGE || '';
http.createServer((req, res) => {
  // Optional: serve a real picture for uploaded assets so screenshots render (GET /img/...). Journeys do not need it.
  if (req.method === 'GET' && (req.url || '').startsWith('/img/') && IMG && fs.existsSync(IMG)) { res.setHeader('content-type', 'image/png'); return res.end(fs.readFileSync(IMG)); }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const m = /\/v1_1\/[^/]+\/(image|raw)\/(upload|destroy)/.exec(req.url || '');
    const action = m?.[2] || 'other';
    const text = body.toString('latin1');
    const publicId = /name="public_id"\r\n\r\n([^\r]+)/.exec(text)?.[1] || null;
    const log = (a, extra = {}) => fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), action: a, url: req.url, bytes: body.length, publicId, ...extra }) + '\n');
    if (action !== 'upload') log(action);
    res.setHeader('content-type', 'application/json');
    if (action === 'upload') {
      // FAIL_FILE present: empty = every upload fails; a number N = the next N uploads succeed, then every upload fails (tests part-way failure cleanup).
      if (fs.existsSync(FAIL_FILE)) {
        const budget = fs.readFileSync(FAIL_FILE, 'utf8').trim();
        if (budget !== '' && Number(budget) > 0) fs.writeFileSync(FAIL_FILE, String(Number(budget) - 1));
        else { log('upload_failed'); res.statusCode = 500; return res.end(JSON.stringify({ error: { message: 'stub: forced upload failure' } })); }
      }
      const id = `stub/${crypto.randomBytes(6).toString('hex')}`;
      log('upload', { assigned: id });
      return res.end(JSON.stringify({ asset_id: crypto.randomBytes(8).toString('hex'), public_id: id, version: 1, signature: 'stub', width: 1400, height: 900, format: 'jpg', resource_type: 'image', created_at: new Date().toISOString(), bytes: body.length, type: 'upload', url: `http://127.0.0.1:${PORT}/img/${id}.jpg`, secure_url: `http://127.0.0.1:${PORT}/img/${id}.jpg` }));
    }
    if (action === 'destroy') return res.end(JSON.stringify({ result: 'ok' }));
    res.end('{}');
  });
}).listen(PORT, '127.0.0.1', () => console.log(`cloudinary stub on ${PORT}`));
