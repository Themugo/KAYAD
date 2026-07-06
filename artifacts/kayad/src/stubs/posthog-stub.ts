// Stub for posthog-js — analytics not active in this environment.
// Covers all methods used by src/utils/observability.ts and src/utils/posthog.ts.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noop = (..._args: any[]) => {};

const posthog = {
  init: noop,
  capture: noop,
  identify: noop,
  reset: noop,
  captureException: noop,
  alias: noop,
  group: noop,
  setPersonProperties: noop,
  register: noop,
  unregister: noop,
  opt_in_capturing: noop,
  opt_out_capturing: noop,
  has_opted_in_capturing: () => false,
  has_opted_out_capturing: () => false,
  get_distinct_id: () => '',
};

export default posthog;
