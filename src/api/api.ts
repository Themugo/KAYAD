// KAYAD API compatibility facade.
// The shared HTTP transport lives in httpClient.ts; endpoint contracts live in api.exports.ts.
export { api, unwrap } from './httpClient';
export * from './api.exports';
