/**
 * Deployment Validation Script
 * Validates environment, configuration, and health before deployment
 * 
 * Usage: node scripts/deployment-validation.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Required environment variables for frontend
const FRONTEND_REQUIRED_VARS = [
  'VITE_PLATFORM_NAME',
  'VITE_DOMAIN',
  'VITE_SOCKET_URL',
  'VITE_APP_NAME',
  'VITE_APP_VERSION',
];

// Required environment variables for backend
const BACKEND_REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'FRONTEND_URL',
];

// Critical environment variables (will fail deployment if missing)
const CRITICAL_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
];

/**
 * Validate environment variables
 */
function validateEnvironmentVariables() {
  logSection('Environment Variables Validation');
  
  const errors = [];
  const warnings = [];
  
  // Check frontend variables
  log('\nFrontend Variables:', 'blue');
  FRONTEND_REQUIRED_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      errors.push(`Missing frontend variable: ${varName}`);
      log(`  ✗ ${varName} - MISSING`, 'red');
    } else {
      log(`  ✓ ${varName} - ${maskSensitive(varName, value)}`, 'green');
    }
  });
  
  // Check backend variables
  log('\nBackend Variables:', 'blue');
  BACKEND_REQUIRED_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      if (CRITICAL_VARS.includes(varName)) {
        errors.push(`Missing critical backend variable: ${varName}`);
        log(`  ✗ ${varName} - CRITICAL MISSING`, 'red');
      } else {
        warnings.push(`Missing backend variable: ${varName}`);
        log(`  ⚠ ${varName} - MISSING (WARNING)`, 'yellow');
      }
    } else {
      log(`  ✓ ${varName} - ${maskSensitive(varName, value)}`, 'green');
    }
  });
  
  return { errors, warnings };
}

/**
 * Mask sensitive values for logging
 */
function maskSensitive(varName, value) {
  const sensitiveVars = ['SECRET', 'KEY', 'TOKEN', 'PASSWORD', 'URI'];
  const isSensitive = sensitiveVars.some(s => varName.includes(s));
  return isSensitive ? '***MASKED***' : value;
}

/**
 * Validate configuration files
 */
function validateConfigurationFiles() {
  logSection('Configuration Files Validation');
  
  const errors = [];
  const warnings = [];
  
  const requiredFiles = [
    { path: 'package.json', description: 'Package configuration' },
    { path: 'vite.config.ts', description: 'Vite build configuration' },
    { path: 'index.html', description: 'HTML entry point' },
    { path: 'src/main.tsx', description: 'Application entry point' },
  ];
  
  requiredFiles.forEach(({ path: filePath, description }) => {
    if (fs.existsSync(filePath)) {
      log(`  ✓ ${filePath} - ${description}`, 'green');
    } else {
      errors.push(`Missing required file: ${filePath}`);
      log(`  ✗ ${filePath} - ${description} - MISSING`, 'red');
    }
  });
  
  // Check for vercel.json if deploying to Vercel
  if (fs.existsSync('vercel.json')) {
    log(`  ✓ vercel.json - Vercel configuration`, 'green');
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      if (!vercelConfig.env || Object.keys(vercelConfig.env).length < 5) {
        warnings.push('vercel.json may be missing environment variables');
        log(`  ⚠ vercel.json - Environment variables may be incomplete`, 'yellow');
      }
    } catch (e) {
      errors.push('vercel.json is not valid JSON');
      log(`  ✗ vercel.json - Invalid JSON`, 'red');
    }
  } else {
    warnings.push('vercel.json not found (required for Vercel deployment)');
    log(`  ⚠ vercel.json - Not found (required for Vercel)`, 'yellow');
  }
  
  return { errors, warnings };
}

/**
 * Validate build configuration
 */
function validateBuildConfiguration() {
  logSection('Build Configuration Validation');
  
  const errors = [];
  const warnings = [];
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check build script
    if (packageJson.scripts && packageJson.scripts.build) {
      log(`  ✓ Build script: ${packageJson.scripts.build}`, 'green');
    } else {
      errors.push('Missing build script in package.json');
      log(`  ✗ Build script - MISSING`, 'red');
    }
    
    // Check dependencies
    if (packageJson.dependencies) {
      const criticalDeps = ['react', 'react-dom', 'react-router-dom'];
      criticalDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
          log(`  ✓ Dependency: ${dep}@${packageJson.dependencies[dep]}`, 'green');
        } else {
          errors.push(`Missing critical dependency: ${dep}`);
          log(`  ✗ Dependency: ${dep} - MISSING`, 'red');
        }
      });
    }
    
    // Check vite config
    if (fs.existsSync('vite.config.ts')) {
      log(`  ✓ Vite configuration exists`, 'green');
    } else {
      errors.push('Missing vite.config.ts');
      log(`  ✗ vite.config.ts - MISSING`, 'red');
    }
    
  } catch (e) {
    errors.push('Failed to parse package.json');
    log(`  ✗ package.json - Parse error`, 'red');
  }
  
  return { errors, warnings };
}

/**
 * Check API health (if API URL is configured)
 */
async function checkAPIHealth() {
  logSection('API Health Check');
  
  const apiUrl = process.env.VITE_API_URL || process.env.API_URL;
  if (!apiUrl) {
    log('  ⚠ API URL not configured - skipping health check', 'yellow');
    return { errors: [], warnings: ['API URL not configured'] };
  }
  
  return new Promise((resolve) => {
    const healthUrl = `${apiUrl}/health`;
    log(`  Checking: ${healthUrl}`, 'blue');
    
    const req = https.get(healthUrl, (res) => {
      if (res.statusCode === 200) {
        log(`  ✓ API is healthy (status: ${res.statusCode})`, 'green');
        resolve({ errors: [], warnings: [] });
      } else {
        const warning = `API health check failed with status: ${res.statusCode}`;
        log(`  ⚠ ${warning}`, 'yellow');
        resolve({ errors: [], warnings: [warning] });
      }
    });
    
    req.on('error', (error) => {
      const err = `API health check failed: ${error.message}`;
      log(`  ✗ ${err}`, 'red');
      resolve({ errors: [err], warnings: [] });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      const warning = 'API health check timed out';
      log(`  ⚠ ${warning}`, 'yellow');
      resolve({ errors: [], warnings: [warning] });
    });
  });
}

/**
 * Validate git status
 */
function validateGitStatus() {
  logSection('Git Status Validation');
  
  const errors = [];
  const warnings = [];
  
  try {
    // Check if .git directory exists
    if (fs.existsSync('.git')) {
      log(`  ✓ Git repository detected`, 'green');
      
      // Check for uncommitted changes (simplified check)
      if (fs.existsSync('.git/index')) {
        log(`  ⚠ Uncommitted changes may exist - consider committing`, 'yellow');
        warnings.push('Uncommitted changes detected');
      }
    } else {
      warnings.push('Not a git repository');
      log(`  ⚠ Not a git repository`, 'yellow');
    }
  } catch (e) {
    warnings.push('Could not check git status');
    log(`  ⚠ Could not check git status`, 'yellow');
  }
  
  return { errors, warnings };
}

/**
 * Generate deployment confidence score
 */
function calculateConfidenceScore(allErrors, allWarnings) {
  const totalIssues = allErrors.length + allWarnings.length;
  const criticalErrors = allErrors.filter(e => e.includes('CRITICAL')).length;
  
  if (criticalErrors > 0) return 0;
  if (allErrors.length > 0) return Math.max(0, 50 - (allErrors.length * 10));
  if (totalIssues === 0) return 100;
  
  return Math.max(50, 100 - (totalIssues * 5));
}

/**
 * Main validation function
 */
async function main() {
  log('KAYAD Deployment Validation', 'magenta');
  log('========================================', 'magenta');
  
  const allErrors = [];
  const allWarnings = [];
  
  // Run validations
  const envResults = validateEnvironmentVariables();
  allErrors.push(...envResults.errors);
  allWarnings.push(...envResults.warnings);
  
  const configResults = validateConfigurationFiles();
  allErrors.push(...configResults.errors);
  allWarnings.push(...configResults.warnings);
  
  const buildResults = validateBuildConfiguration();
  allErrors.push(...buildResults.errors);
  allWarnings.push(...buildResults.warnings);
  
  const gitResults = validateGitStatus();
  allErrors.push(...gitResults.errors);
  allWarnings.push(...gitResults.warnings);
  
  const healthResults = await checkAPIHealth();
  allErrors.push(...healthResults.errors);
  allWarnings.push(...healthResults.warnings);
  
  // Calculate confidence score
  const confidence = calculateConfidenceScore(allErrors, allWarnings);
  
  // Print summary
  logSection('Validation Summary');
  log(`Total Errors: ${allErrors.length}`, allErrors.length > 0 ? 'red' : 'green');
  log(`Total Warnings: ${allWarnings.length}`, allWarnings.length > 0 ? 'yellow' : 'green');
  log(`Deployment Confidence: ${confidence}%`, confidence >= 80 ? 'green' : confidence >= 50 ? 'yellow' : 'red');
  
  if (allErrors.length > 0) {
    log('\nErrors:', 'red');
    allErrors.forEach(err => log(`  - ${err}`, 'red'));
  }
  
  if (allWarnings.length > 0) {
    log('\nWarnings:', 'yellow');
    allWarnings.forEach(warn => log(`  - ${warn}`, 'yellow'));
  }
  
  // Exit with appropriate code
  logSection('Deployment Decision');
  if (allErrors.some(e => e.includes('CRITICAL'))) {
    log('❌ DEPLOYMENT BLOCKED - Critical errors detected', 'red');
    process.exit(1);
  } else if (allErrors.length > 0) {
    log('⚠️  DEPLOYMENT NOT RECOMMENDED - Errors detected', 'yellow');
    process.exit(1);
  } else if (confidence < 50) {
    log('⚠️  DEPLOYMENT NOT RECOMMENDED - Low confidence score', 'yellow');
    process.exit(1);
  } else if (allWarnings.length > 0) {
    log('✅ DEPLOYMENT PROCEED WITH CAUTION - Warnings detected', 'yellow');
    process.exit(0);
  } else {
    log('✅ DEPLOYMENT APPROVED - All checks passed', 'green');
    process.exit(0);
  }
}

// Run validation
main().catch(error => {
  log(`\n❌ Validation failed with error: ${error.message}`, 'red');
  process.exit(1);
});
