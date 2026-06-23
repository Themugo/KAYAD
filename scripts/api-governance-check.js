import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_DIR = path.join(__dirname, '..', 'backend', 'routes');
const SWAGGER_CONFIG = path.join(__dirname, '..', 'backend', 'config', 'swagger.js');

// Track all routes
const allRoutes = new Map();
const documentedRoutes = new Set();
const routesWithValidation = new Set();
const routesWithoutValidation = new Set();

// HTTP methods to track
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function extractRoutesFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  
  // Match router.METHOD(path, middleware..., handler)
  const routePattern = /router\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = routePattern.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      file: path.basename(filePath)
    });
  }
  
  return routes;
}

function checkSwaggerDocumentation(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has swagger comments
  const hasSwagger = /@swagger|@api/i.test(content);
  return hasSwagger;
}

function checkValidation(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for validation middleware
  const hasValidation = /validate(Auth|Car|ObjectId|Body|Query)/i.test(content);
  return hasValidation;
}

function scanRoutes() {
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  
  files.forEach(file => {
    const filePath = path.join(ROUTES_DIR, file);
    const routes = extractRoutesFromFile(filePath);
    const hasSwagger = checkSwaggerDocumentation(filePath);
    const hasValidation = checkValidation(filePath);
    
    routes.forEach(route => {
      const routeKey = `${route.method} ${route.path}`;
      allRoutes.set(routeKey, {
        ...route,
        hasSwagger,
        hasValidation,
        file
      });
      
      if (hasSwagger) {
        documentedRoutes.add(routeKey);
      }
      
      if (hasValidation) {
        routesWithValidation.add(routeKey);
      } else {
        routesWithoutValidation.add(routeKey);
      }
    });
  });
}

function generateReport() {
  const totalRoutes = allRoutes.size;
  const documentedCount = documentedRoutes.size;
  const withValidation = routesWithValidation.size;
  const withoutValidation = routesWithoutValidation.size;
  
  const undocumentedRoutes = Array.from(allRoutes.entries())
    .filter(([_, route]) => !route.hasSwagger)
    .map(([key, route]) => ({
      key,
      ...route
    }));
  
  const report = {
    generated: new Date().toISOString(),
    summary: {
      totalRoutes,
      documentedRoutes: documentedCount,
      undocumentedRoutes: totalRoutes - documentedCount,
      documentationCoverage: ((documentedCount / totalRoutes) * 100).toFixed(2),
      routesWithValidation: withValidation,
      routesWithoutValidation: withoutValidation,
      validationCoverage: ((withValidation / totalRoutes) * 100).toFixed(2)
    },
    undocumentedEndpoints: undocumentedRoutes,
    routesWithoutValidation: Array.from(routesWithoutValidation),
    compliance: {
      documentation: documentedCount >= totalRoutes * 0.8,
      validation: withValidation >= totalRoutes * 0.8
    }
  };
  
  return report;
}

// Run the scan
scanRoutes();
const report = generateReport();

// Output report
console.log(JSON.stringify(report, null, 2));

// Write to file
fs.writeFileSync('api-governance-report.json', JSON.stringify(report, null, 2));

// Exit with error if compliance fails
if (!report.compliance.documentation || !report.compliance.validation) {
  console.error('\n❌ API Governance Compliance Failed');
  if (!report.compliance.documentation) {
    console.error(`Documentation coverage: ${report.summary.documentationCoverage}% (target: 80%)`);
  }
  if (!report.compliance.validation) {
    console.error(`Validation coverage: ${report.summary.validationCoverage}% (target: 80%)`);
  }
  process.exit(1);
} else {
  console.log('\n✅ API Governance Compliance Passed');
}
