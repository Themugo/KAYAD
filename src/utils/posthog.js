let posthog = null;
let initialized = false;

export const initPostHog = async () => {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  if (!apiKey) return;

  try {
    const mod = await import("posthog-js").catch(() => null);
    if (!mod) {
      console.warn("[PostHog] posthog-js not installed. Run: npm install posthog-js");
      return;
    }

    posthog = mod.default || mod;

    posthog.init(apiKey, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: false,
      autocapture: false,
      disable_session_recording: true,
      persistence: "localStorage",
    });

    initialized = true;
  } catch (err) {
    console.warn("[PostHog] Init failed:", err.message);
  }
};

export const reportError = (err, context = {}) => {
  if (!initialized || !posthog) {
    console.error("[Error]", err);
    return;
  }
  posthog.captureException(err, context);
};

export const setPostHogUser = (user) => {
  if (!initialized || !posthog || !user) return;
  posthog.identify(user._id || user.id, {
    email: user.email,
    role: user.role,
    name: user.name,
  });
};

export const clearPostHogUser = () => {
  if (!initialized || !posthog) return;
  posthog.reset();
};

export const isPostHogInitialized = () => initialized;
