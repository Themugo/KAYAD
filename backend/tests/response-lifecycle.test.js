import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { getCounter } from '../config/metrics.js';
import sliMiddleware from '../middleware/sliMiddleware.js';
import { performanceMonitor } from '../middleware/performanceMonitor.js';
import responseWrapper from '../middleware/responseWrapper.js';
import notFound from '../middleware/notFound.js';
import errorHandler from '../middleware/errorHandler.js';

async function fixture() {
  const app = express();
  app.use(performanceMonitor, sliMiddleware, responseWrapper);
  app.get('/json', (_req,res) => res.json({value:1}));
  app.get('/throw', () => {throw new Error('test failure')});
  app.get('/late', (_req,res,next) => {res.json({value:2});next(new Error('late failure'))});
  app.use(notFound, errorHandler);
  const server = await new Promise(resolve => {const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
  return {server, base:`http://127.0.0.1:${server.address().port}`};
}
test('GET, HEAD, JSON, errors and SLI complete without double sending', async () => {
  const {server,base}=await fixture();
  try {
    const json=await fetch(base+'/json'); assert.equal(json.status,200); assert.deepEqual(await json.json(),{success:true,value:1});
    const unknown=await fetch(base+'/unknown'); assert.equal(unknown.status,404); assert.equal((await unknown.json()).success,false);
    const head=await fetch(base+'/',{method:'HEAD'}); assert.equal(head.status,404); assert.equal(await head.text(),'');
    const failure=await fetch(base+'/throw'); assert.equal(failure.status,500); assert.equal((await failure.json()).success,false);
    const late=await fetch(base+'/late'); assert.equal(late.status,200); assert.equal((await late.json()).value,2);
    assert.equal(getCounter('http_requests_total',{method:'GET',path:'/json',status:200}),1);
    assert.equal(getCounter('http_requests_total',{method:'HEAD',path:'/',status:404}),1);
  } finally {
    // Drop keep-alive sockets held by fetch(); otherwise server.close() can wait indefinitely (observed as an intermittent hang on Node 22.22.2).
    const closed = new Promise(resolve=>server.close(resolve));
    server.closeAllConnections?.();
    await closed;
  }
});
