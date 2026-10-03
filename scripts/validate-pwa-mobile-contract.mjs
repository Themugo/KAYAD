import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const index = read('index.html');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
const sw = read('public/sw.js');

check('viewport prevents browser width drift', /name="viewport"[^>]+width=device-width/.test(index));
check('manifest is linked', index.includes('href="/manifest.webmanifest"'));
check('Apple touch icon exists in HTML', index.includes('href="/icons/icon-192.png"') && fs.existsSync('public/icons/icon-192.png'));
check('192px maskable PNG exists', fs.existsSync('public/icons/icon-192.png'));
check('512px maskable PNG exists', fs.existsSync('public/icons/icon-512.png'));
check('push badge asset exists', fs.existsSync('public/icons/badge-72.png'));
check('manifest has exactly two canonical PNG icons', manifest.icons?.length === 2 && manifest.icons.every(i => /icon-(192|512)\.png$/.test(i.src) && i.type === 'image/png'));
check('manifest shortcuts target App state navigation',
  manifest.shortcuts?.some(s => s.url.includes('nav=marketplace')) &&
  manifest.shortcuts?.some(s => s.url.includes('nav=auctions')) &&
  manifest.shortcuts?.some(s => s.url.includes('nav=sell'))
);
check('PWA theme matches Slate Teal chrome', manifest.theme_color === '#0B716F');
check('notification panel is viewport-safe', ['src/components/NotificationCenter.tsx','src/components/features/common/NotificationCenter.tsx'].every(p => read(p).includes('w-[min(370px,calc(100vw-1.5rem))]')));
check('service worker does not cache API responses', !sw.includes('API_CACHE') && !sw.includes("cache.put(request, networkResponse.clone())") || !/isApiRequest\(request\)[\s\S]*handleApiRequest/.test(sw));
check('service worker skips auth endpoints', sw.includes('auth/'));
check('service worker uses current cache version', sw.includes('kayad-mobile-v2') && sw.includes('kayad-static-v2'));

const failed = checks.filter(c => !c.ok);
if (failed.length) process.exit(1);
console.log(`\nPWA/mobile contract: ${checks.length}/${checks.length} PASS`);
