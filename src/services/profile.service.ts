/**
 * Profile service — API calls for viewing and updating the current user's profile.
 */

import { apiFetch, API_BASE, ApiError } from "@/lib/api";
import {
  AnyProfileSchema,
  type AnyProfile,
  type UpdateProfileForm,
} from "@/schemas/profile.schema";

export async function getProfile(accessToken: string): Promise<AnyProfile> {
  const raw = await apiFetch<unknown>("/users/me", {}, accessToken);
  return AnyProfileSchema.parse(raw);
}

export async function updateProfile(
  data: UpdateProfileForm,
  accessToken: string,
): Promise<AnyProfile> {
  const raw = await apiFetch<unknown>(
    "/users/me",
    { method: "PATCH", body: JSON.stringify(data) },
    accessToken,
  );
  return AnyProfileSchema.parse(raw);
}

export async function uploadProfilePhoto(
  file: File,
  accessToken: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  // Do not use apiFetch here — it always sets Content-Type: application/json
  // which breaks multipart/form-data uploads.
  const res = await fetch(`${API_BASE}/users/me/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (typeof body.detail === "string") message = body.detail;
    } catch { /* ignore */ }
    throw new ApiError(res.status, message);
  }
  const body = (await res.json()) as { profile_photo_url: string };
  return body.profile_photo_url;
}
