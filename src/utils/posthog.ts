let posthog: { init: (key: string, config: Record<string, unknown>) => void; captureException: (err: Error, context: Record<string, unknown>) => void; identify: (id: string, props?: Record<string, unknown>) => void; reset: () => void } | null = null;
let initialized = false;

export const initPostHog = async (): Promise<void> => {
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
    console.warn("[PostHog] Init failed:", (err as Error).message);
  }
};

export const reportError = (err: Error, context: Record<string, unknown> = {}): void => {
  if (!initialized || !posthog) {
    console.error("[Error]", err);
    return;
  }
  posthog.captureException(err, context);
};

export const setPostHogUser = (user: { _id?: string; id?: string; email?: string; role?: string; name?: string }): void => {
  if (!initialized || !posthog || !user) return;
  posthog.identify(user._id || user.id, {
    email: user.email,
    role: user.role,
    name: user.name,
  });
};

export const clearPostHogUser = (): void => {
  if (!initialized || !posthog) return;
  posthog.reset();
};

export const isPostHogInitialized = (): boolean => initialized;
