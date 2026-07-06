// Stub for @sentry/react — error tracking not active in this environment.
// Covers all methods used by src/utils/observability.ts and src/utils/sentry.ts.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noop = (..._args: any[]) => {};
const noopScope = { setExtra: noop, setTag: noop, setLevel: noop, setUser: noop };

export const init = noop;
export const withScope = (cb: (scope: typeof noopScope) => void) => { try { cb(noopScope); } catch { /**/ } };
export const captureException = noop;
export const captureMessage = noop;
export const setUser = noop;
export const addBreadcrumb = noop;
export const setTag = noop;
export const setContext = noop;
export const startSpan = noop;
export const startInactiveSpan = () => ({ end: noop, setStatus: noop, setAttribute: noop });
export const browserTracingIntegration = () => ({});
export const replayIntegration = () => ({});

export class BrowserTracing {}
export class Replay {}

export default {
  init,
  withScope,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  setTag,
  setContext,
  startSpan,
  startInactiveSpan,
  BrowserTracing,
  Replay,
};
