const HOOKS = Symbol.for("kayad.responseHooks");

function reportHookError(error, onError) {
  try {
    if (typeof onError === "function") onError(error);
  } catch {
    // Response instrumentation is strictly non-fatal.
  }
}

function ensureState(res) {
  if (res[HOOKS]) return res[HOOKS];

  const originalJson = res.json.bind(res);
  const state = {
    originalJson,
    jsonHooks: [],
    responseStarted: false,
  };

  res[HOOKS] = state;

  // Express response methods are synchronous from the middleware caller's
  // perspective. Never make res.json async: doing so changes Express control
  // flow and can create response races during 404/error handling.
  res.json = function kayadResponseJson(body) {
    if (res.headersSent || res.writableEnded || state.responseStarted) return res;
    state.responseStarted = true;

    let nextBody = body;
    for (const entry of [...state.jsonHooks]) {
      try {
        const result = entry.hook(nextBody, res);
        // Response hooks that return a Promise are observational side effects.
        // They must never delay or replace the HTTP response.
        if (result && typeof result.then === "function") {
          Promise.resolve(result).catch((error) => reportHookError(error, entry.onError));
        } else if (result !== undefined) {
          nextBody = result;
        }
      } catch (error) {
        reportHookError(error, entry.onError);
      }
    }

    if (res.headersSent || res.writableEnded) return res;
    return state.originalJson(nextBody);
  };

  return state;
}

export function onJsonResponse(res, hook, onError) {
  const state = ensureState(res);
  const entry = { hook, onError };
  state.jsonHooks.push(entry);
  return () => {
    const index = state.jsonHooks.indexOf(entry);
    if (index >= 0) state.jsonHooks.splice(index, 1);
  };
}

export function onResponseFinish(res, hook) {
  let called = false;
  const run = () => {
    if (called) return;
    called = true;
    try { hook(res); } catch { /* telemetry must not affect response lifecycle */ }
  };
  res.once("finish", run);
  res.once("close", run);
  return () => {
    res.off("finish", run);
    res.off("close", run);
  };
}
