const [,, modPath, exp, fn, ...rest] = process.argv;
const m = await import(modPath); const M = m[exp] || m.default;
try { const r = await M[fn](JSON.parse(rest[0]||'{}')); console.log('OK', JSON.stringify(r).slice(0,200)); } catch (e) { console.log('THROWN', e?.constructor?.name, '| message=', JSON.stringify(e?.message), '| code=', e?.code, '| keys=', Object.getOwnPropertyNames(e||{}).join(','), '| details=', e?.details, '| hint=', e?.hint); }
process.exit(0);
