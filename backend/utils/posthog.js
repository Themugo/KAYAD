let client = null;
let posthogEnabled = false;

export const initPostHog = async () => {
  const apiKey = process.env.POSTHOG_API_KEY;

  if (!apiKey) {
    console.log("PostHog disabled — set POSTHOG_API_KEY to enable");
    return;
  }

  try {
    const { PostHog } = await import("posthog-node").catch(() => null);
    if (!PostHog) {
      console.warn("POSTHOG_API_KEY set but posthog-node not installed. Run: npm install posthog-node");
      return;
    }

    client = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    });

    posthogEnabled = true;
    console.log("PostHog initialized");
  } catch (err) {
    console.error("PostHog init failed:", err.message);
  }
};

export const captureException = (err, context = {}) => {
  if (!posthogEnabled || !client) {
    console.error("[Error]", err?.message, context);
    return;
  }
  client.capture({
    distinctId: context.userId || "server",
    event: "$exception",
    properties: {
      $exception_message: err?.message,
      $exception_type: err?.name,
      $exception_stack_trace: err?.stack,
      ...context,
    },
  });
};

export const captureMessage = (msg, level = "info") => {
  if (!posthogEnabled || !client) return;
  client.capture({
    distinctId: "server",
    event: "$exception",
    properties: { $exception_message: msg, level },
  });
};

export const isPostHogEnabled = () => posthogEnabled;

export const getPostHogClient = () => client;
