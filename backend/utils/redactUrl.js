// STAGE 5 — keep single-use credentials out of logs.
// GET /api/v1/auth/verify-email/:token carries the RAW email-verification token in the URL path, and
// request/access logs record URLs. A log reader could replay an unexpired token and activate an account
// they do not own. Redact path-carried tokens and sensitive query parameters before a URL is logged.
const PATH_TOKEN = /(\/(?:verify-email|reset-password|accept-invite|invite|confirm-email|verify)\/)[^/?#\s]+/gi;
const QUERY_SECRET = /([?&](?:token|access_token|refresh_token|id_token|code|otp|key|secret|password|reset|invite)=)[^&#\s]*/gi;

export const redactUrl = (url) => {
  if (typeof url !== "string" || url === "") return url;
  return url.replace(PATH_TOKEN, "$1[REDACTED]").replace(QUERY_SECRET, "$1[REDACTED]");
};

export default redactUrl;
