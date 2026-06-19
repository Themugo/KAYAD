// Wrapper file for TypeScript deployment
// This file allows Render to run the TypeScript server using ts-node

import { register } from 'ts-node';
register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});
import './server.ts';
