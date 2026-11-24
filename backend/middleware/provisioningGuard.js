// Honest "not provisioned" answer for admin studios whose database objects do not exist in this environment.
//
// The central errorHandler deliberately keeps missing tables/columns as HTTP 500 (a schema defect must never be hidden for
// core features). The studio/experimental surfaces below have NO definition in supabase/migrations and none on the hosted
// catalog, so a 500 there is not a fixable runtime fault: the capability has not been provisioned. This router-level error
// middleware converts ONLY a missing-relation / missing-column database error into HTTP 503 FEATURE_NOT_PROVISIONED so the
// console can say so plainly. Every other error (including real server faults) is passed on untouched. No data is invented
// and no success is faked.
const MISSING_OBJECT_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

export function isMissingDatabaseObject(err) {
  const code = err?.code || err?.cause?.code;
  return typeof code === "string" && MISSING_OBJECT_CODES.has(code);
}

export function notProvisionedGuard(feature) {
  // Four-argument signature is what makes Express treat this as an error handler.
  return (err, req, res, next) => {
    if (res.headersSent || !isMissingDatabaseObject(err)) return next(err);
    return res.status(503).json({
      success: false,
      code: "FEATURE_NOT_PROVISIONED",
      feature,
      message: `${feature} is not provisioned in this environment (its database tables are not present). Its data is unavailable, not zero.`,
    });
  };
}
