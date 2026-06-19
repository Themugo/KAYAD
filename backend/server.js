// Wrapper file for TypeScript deployment
// This file allows Render to run the TypeScript server using ts-node

require('ts-node').register();
require('./server.ts');
