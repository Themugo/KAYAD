#!/usr/bin/env node
// Generates src/styles/dark-theme.generated.css: a semantic dark-theme layer for the existing Tailwind arbitrary-value colour classes
// (e.g. bg-[#F6FAF9], text-[#0A3340], border-[#D7E7E4], hover:bg-[#EEF7F5]) without editing 364 component files.
// Rules (deterministic, by property role, in HSL so hue/brand identity is preserved):
//   surfaces  bg/from/via/to  light fills (L >= .55) -> deep navy-teal surfaces (L .08-.20); saturated mid/dark brand fills are KEPT (white text stays valid)
//   text      dark text (L <= .55) -> light text (L .72-.90); light text kept
//   border    light borders -> L .22-.28 low-chroma;  dark borders -> L .55 (visible)
// The layer is INERT unless <html data-dark-ready="true"> is set (nothing sets it in production yet): public pages (inline styles, CSS files) are not
// fully covered, and a half-dark page is worse than none. See reports/FINAL-COMPLETION/16-DARK-MODE-IMPLEMENTATION.md.
// Usage: node scripts/generate-dark-theme.mjs  (re-run after adding new colours; the guard test fails if the output is stale)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');
const OUT = path.join(SRC, 'styles', 'dark-theme.generated.css');

const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === '__tests__' || e.name === 'node_modules') continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : /\.(tsx|jsx)$/.test(e.name) && out.push(p); } return out; };
const RE = /((?:[a-z0-9-]+:)*)(bg|text|border|ring|fill|stroke|divide|from|via|to|placeholder|outline|accent|decoration)-\[(#[0-9a-fA-F]{3,8})\](?:\/(\d{1,3}))?/g;
const found = new Map();
for (const f of walk(SRC)) { const s = fs.readFileSync(f, 'utf8'); for (const m of s.matchAll(RE)) { const cls = m[0]; if (!found.has(cls)) found.set(cls, { variants: m[1], prop: m[2], hex: m[3], alpha: m[4] }); } }

const hexToRgb = (h) => { h = h.slice(1); if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const rgbToHsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const TEAL = 190; // KAYARD KE teal/navy hue family
function map(prop, hex) {
  const rgb = hexToRgb(hex); const [h, s, l] = rgbToHsl(rgb); const hue = s < .12 ? TEAL : h; // neutrals take the brand hue
  if (['bg', 'from', 'via', 'to'].includes(prop)) {
    if (l >= .55) return hsl(hue, clamp(s * .55, .18, .45), clamp(.07 + (1 - l) * .9, .08, .2));
    if (l < .2) return hsl(hue, clamp(s * .8, .3, .6), .27); // deep navy fill would vanish on a dark surface: lift to the brand teal (white text stays >= 4.5:1)
    return null; // saturated/dark brand fill: keep (text on it is unchanged)
  }
  if (['text', 'placeholder', 'decoration', 'fill', 'stroke', 'accent', 'outline', 'ring'].includes(prop)) {
    if (l <= .62) return hsl(hue, clamp(s, .25, .75), clamp(.97 - l * .62, .72, .9));
    return null;
  }
  if (['border', 'divide'].includes(prop)) {
    if (l >= .55) return hsl(hue, clamp(s * .5, .15, .35), clamp(.34 - (l - .55) * .25, .22, .3));
    return hsl(hue, clamp(s, .3, .7), .55);
  }
  return null;
}
const esc = (c) => c.replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch);
const VAR = { hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', active: ':active', disabled: ':disabled', 'focus-within': ':focus-within', 'group-hover': null, 'dark': '' };
const decl = (prop, val) => ({ bg: `background-color:${val}`, text: `color:${val}`, border: `border-color:${val}`, ring: `--tw-ring-color:${val}`, fill: `fill:${val}`, stroke: `stroke:${val}`, divide: `border-color:${val}`, placeholder: `color:${val}`, outline: `outline-color:${val}`, accent: `accent-color:${val}`, decoration: `text-decoration-color:${val}`, from: `--tw-gradient-from:${val} var(--tw-gradient-from-position);--tw-gradient-to:transparent var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)`, via: `--tw-gradient-to:transparent var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),${val} var(--tw-gradient-via-position),var(--tw-gradient-to)`, to: `--tw-gradient-to:${val} var(--tw-gradient-to-position)` })[prop];
const lines = []; let n = 0, skipped = 0;
for (const [cls, { variants, prop, hex, alpha }] of [...found].sort((a, b) => a[0].localeCompare(b[0]))) {
  const vs = variants.split(':').filter(Boolean);
  if (vs.some((v) => v === 'dark' || !(v in VAR || /^(max-|min-)?(sm|md|lg|xl|2xl)$/.test(v) || v === 'file' || v === 'placeholder'))) { skipped++; continue; } // explicit dark: variants win; unknown variants skipped
  if (vs.some((v) => /^(max-|min-)?(sm|md|lg|xl|2xl)$/.test(v) || v === 'file' || v === 'group-hover')) { skipped++; continue; }
  let val = map(prop, hex); if (!val) continue;
  if (alpha) { const m = val.match(/hsl\((\d+) (\d+)% (\d+)%\)/); val = `hsl(${m[1]} ${m[2]}% ${m[3]}% / ${Number(alpha) / 100})`; }
  const pseudo = vs.map((v) => VAR[v]).join('');
  const base = `:root[data-theme='dark'][data-dark-ready='true'] .${esc(cls)}${pseudo}`;
  lines.push(prop === 'divide' ? `${base} > :not([hidden]) ~ :not([hidden]){${decl(prop, val)}}` : `${base}{${decl(prop, val)}}`); n++;
}
// Tailwind palette classes used alongside the arbitrary colours
const named = `
:root[data-theme='dark'][data-dark-ready='true'] .bg-white{background-color:hsl(190 32% 12%)}
:root[data-theme='dark'][data-dark-ready='true'] .bg-slate-50,:root[data-theme='dark'][data-dark-ready='true'] .bg-gray-50{background-color:hsl(190 30% 10%)}
:root[data-theme='dark'][data-dark-ready='true'] .bg-slate-100,:root[data-theme='dark'][data-dark-ready='true'] .bg-gray-100{background-color:hsl(190 28% 15%)}
:root[data-theme='dark'][data-dark-ready='true'] .border-slate-200,:root[data-theme='dark'][data-dark-ready='true'] .border-slate-300,:root[data-theme='dark'][data-dark-ready='true'] .border-gray-200{border-color:hsl(190 22% 26%)}
:root[data-theme='dark'][data-dark-ready='true'] .text-slate-500,:root[data-theme='dark'][data-dark-ready='true'] .text-slate-600,:root[data-theme='dark'][data-dark-ready='true'] .text-slate-700{color:hsl(190 18% 72%)}
:root[data-theme='dark'][data-dark-ready='true'] .text-slate-800,:root[data-theme='dark'][data-dark-ready='true'] .text-slate-900{color:hsl(170 25% 92%)}
:root[data-theme='dark'][data-dark-ready='true'] body{background-color:hsl(192 55% 7%);color:hsl(170 25% 92%)}
`;
const css = `/* GENERATED by scripts/generate-dark-theme.mjs - do not edit by hand. ${n} rules from ${found.size} colour classes (${skipped} skipped: responsive/group/explicit dark: variants). */\n:root[data-theme='dark'][data-dark-ready='true']{color-scheme:dark}\n${named.trim()}\n${lines.join('\n')}\n`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, css);
console.log(`dark-theme: ${n} rules, ${found.size} classes scanned, ${skipped} skipped, ${(css.length / 1024).toFixed(0)} KiB -> ${path.relative(root, OUT)}`);
