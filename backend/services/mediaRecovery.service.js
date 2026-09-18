import { getSupabase } from "../utils/supabase.js";

export async function registerMediaUploadJob({ listingId, ownerId, sourcePath, metadata = {} }) {
  const { data, error } = await getSupabase().rpc("kayad_register_media_upload_job_atomic", {
    p_listing_id: listingId, p_owner_id: ownerId, p_source_path: sourcePath, p_metadata: metadata,
  });
  if (error) throw error;
  return data;
}

export async function registerMediaUploadFailure({ listingId, ownerId, sourcePath, error, metadata = {} }) {
  const { data, error: rpcError } = await getSupabase().rpc("kayad_register_media_upload_failure_atomic", {
    p_listing_id: listingId,
    p_owner_id: ownerId,
    p_source_path: sourcePath,
    p_error: String(error?.message || error || "Unknown media upload failure"),
    p_metadata: metadata,
  });
  if (rpcError) throw rpcError;
  return data;
}

export async function completeMediaUpload({ jobId, publicId, remoteUrl, metadata = {} }) {
  const { data, error } = await getSupabase().rpc("kayad_complete_media_upload_atomic", {
    p_job_id: jobId,
    p_public_id: publicId,
    p_remote_url: remoteUrl,
    p_metadata: metadata,
  });
  if (error) throw error;
  return data;
}
