import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
const knownRoutes = readFileSync(new URL('../src/utils/knownRoutes.ts', import.meta.url), 'utf8');
const publicSweep = readFileSync(new URL('../src/__tests__/pages/PublicSweep1105.test.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(robots, /^Allow:\s*\/showroom\/?\s*$/m, 'robots.txt must not advertise the unimplemented /showroom route');
assert.doesNotMatch(knownRoutes, /['"]\/showroom['"]/, 'the route registry must continue treating /showroom as unknown until implemented');
assert.match(publicSweep, /['"]\/showroom['"].*is not found|is not found.*['"]\/showroom['"]/, 'the public route test must retain the 404 contract');
assert.match(publicSweep, /does not advertise the unimplemented showroom path to crawlers/, 'the public test must assert crawler/route alignment');
console.log('Showroom route/crawler alignment: 4/4 PASS');
