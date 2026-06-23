#!/usr/bin/env node

// Performance budget checker for bundle sizes
const fs = require('fs');
const path = require('path');

const BUDGETS = {
  'index-': 200000, // 200KB for main entry
  'react-vendor': 250000, // 250KB for React vendor
  'vendor': 300000, // 300KB for other vendors
  default: 100000, // 100KB for other chunks
};

const distDir = path.join(__dirname, '../dist/assets/js');
const files = fs.readdirSync(distDir);

let violations = [];

files.forEach(file => {
  if (!file.endsWith('.js')) return;
  
  const filePath = path.join(distDir, file);
  const stats = fs.statSync(filePath);
  const size = stats.size;
  
  let budget = BUDGETS.default;
  for (const [key, value] of Object.entries(BUDGETS)) {
    if (file.includes(key)) {
      budget = value;
      break;
    }
  }
  
  if (size > budget) {
    violations.push({
      file,
      size: (size / 1024).toFixed(2) + 'KB',
      budget: (budget / 1024).toFixed(2) + 'KB',
      exceeded: ((size - budget) / 1024).toFixed(2) + 'KB'
    });
  }
});

if (violations.length > 0) {
  console.error('❌ Performance budget violations:');
  violations.forEach(v => {
    console.error(`  ${v.file}: ${v.size} (budget: ${v.budget}, exceeded by ${v.exceeded})`);
  });
  process.exit(1);
} else {
  console.log('✅ All bundles within performance budgets');
  process.exit(0);
}
