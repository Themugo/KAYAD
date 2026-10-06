// KAYAD media worker compatibility entrypoint.
// Media is now stored canonically in Supabase Storage; image transformations are
// requested through Supabase Storage/CDN URLs and no external image provider is used here.
export const processImageJob = async (job) => ({ success: true, provider: "supabase", jobId: job?.id || null });
