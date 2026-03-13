/**
 * Base API fetch utility for the rental marketplace backend.
 * All API calls go through this helper for consistent error handling.
 */

export const API_BASE = "https://legendary-space-winner-46p9j759g7qh757-8000.app.github.dev/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Typed fetch wrapper with automatic JSON serialization and error extraction.
 * Pass `token` to set the Authorization: Bearer header.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail) && body.detail.length > 0) {
        message = (body.detail as Array<{ msg?: string }>)
          .map((e) => e.msg ?? String(e))
          .join("; ");
      }
    } catch {
      /* ignore parse errors on error responses */
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}
