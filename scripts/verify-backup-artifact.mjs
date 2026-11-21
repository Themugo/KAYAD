#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/verify-backup-artifact.mjs <backup.sql|backup.dump>');
  process.exit(2);
}
const file = path.resolve(process.cwd(), target);
if (!fs.existsSync(file)) {
  console.error(`BACKUP VERIFY FAIL: file not found: ${file}`);
  process.exit(1);
}
const stat = fs.statSync(file);
if (!stat.isFile() || stat.size < 128) {
  console.error(`BACKUP VERIFY FAIL: backup is missing or implausibly small: ${stat.size} bytes`);
  process.exit(1);
}
const sample = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' }).slice(0, 4096);
const looksSql = file.endsWith('.sql') && /(PostgreSQL database dump|CREATE TABLE|SET statement_timeout|BEGIN;)/i.test(sample);
if (file.endsWith('.sql') && !looksSql) {
  console.error('BACKUP VERIFY FAIL: SQL backup does not contain expected PostgreSQL dump markers.');
  process.exit(1);
}
if (/\.dump$/i.test(file)) {
  try {
    execFileSync('pg_restore', ['--list', file], { stdio: 'ignore' });
  } catch {
    console.error('BACKUP VERIFY FAIL: pg_restore --list could not validate the custom-format backup.');
    process.exit(1);
  }
}
console.log(`BACKUP VERIFY PASS | ${file} | ${stat.size} bytes`);
