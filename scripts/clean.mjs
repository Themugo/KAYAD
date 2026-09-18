#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
for (const name of ['dist', 'build', 'coverage']) {
  fs.rmSync(path.join(root, name), { recursive: true, force: true });
}
for (const name of ['server.js', 'api-governance-report.json']) {
  fs.rmSync(path.join(root, name), { force: true });
}
console.log('KAYAD clean: generated build/test artifacts removed');
