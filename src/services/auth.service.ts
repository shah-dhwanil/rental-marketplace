/**
 * Auth service — all API calls for authentication and registration.
 * Functions return validated, typed data or throw ApiError on failure.
 */

import { apiFetch } from "@/lib/api";
import {
  TokenResponseSchema,
  TempTokenResponseSchema,
  MeResponseSchema,
  type LoginForm,
  type RegisterStep1Form,
  type ProfileStep2Form,
  type Step3Form,
  type TokenResponse,
  type TempTokenResponse,
  type MeResponse,
} from "@/schemas/auth.schema";

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(data: LoginForm): Promise<TokenResponse> {
  const raw = await apiFetch<unknown>("/users/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email_id: data.email_id,
      password: data.password,
      role: data.role,
    }),
  });
  return TokenResponseSchema.parse(raw);
}

// ── Registration — Step 1 (all roles) ─────────────────────────────────────────

export async function registerStep1(
  data: RegisterStep1Form,
): Promise<TempTokenResponse> {
  const raw = await apiFetch<unknown>("/users/register", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      email_id: data.email_id,
      mobile_no: data.mobile_no,
      password: data.password,
      role: data.role,
    }),
  });
  return TempTokenResponseSchema.parse(raw);
}

// ── Customer — complete registration ──────────────────────────────────────────

export async function completeCustomerRegistration(
  tempToken: string,
): Promise<TokenResponse> {
  const raw = await apiFetch<unknown>(
    "/users/register/customer/complete",
    { method: "POST" },
    tempToken,
  );
  return TokenResponseSchema.parse(raw);
}

// ── Vendor — Step 2 (business info) ──────────────────────────────────────────

export async function vendorStep2(
  data: ProfileStep2Form,
  tempToken: string,
): Promise<TempTokenResponse> {
  const raw = await apiFetch<unknown>(
    "/users/register/vendor/complete",
    { method: "POST", body: JSON.stringify(data) },
    tempToken,
  );
  return TempTokenResponseSchema.parse(raw);
}

// ── Vendor — Step 3 (bank details) ───────────────────────────────────────────

export async function vendorStep3(
  data: Step3Form,
  tempToken: string,
): Promise<TokenResponse> {
  const raw = await apiFetch<unknown>(
    "/users/register/vendor/bank",
    { method: "POST", body: JSON.stringify(data) },
    tempToken,
  );
  return TokenResponseSchema.parse(raw);
}

// ── Delivery Partner — Step 2 (personal info) ────────────────────────────────

export async function dpStep2(
  data: ProfileStep2Form,
  tempToken: string,
): Promise<TempTokenResponse> {
  const raw = await apiFetch<unknown>(
    "/users/register/delivery-partner/complete",
    { method: "POST", body: JSON.stringify(data) },
    tempToken,
  );
  return TempTokenResponseSchema.parse(raw);
}

// ── Delivery Partner — Step 3 (bank details) ─────────────────────────────────

export async function dpStep3(
  data: Step3Form,
  tempToken: string,
): Promise<TokenResponse> {
  const raw = await apiFetch<unknown>(
    "/users/register/delivery-partner/bank",
    { method: "POST", body: JSON.stringify(data) },
    tempToken,
  );
  return TokenResponseSchema.parse(raw);
}

// ── Get current user identity ─────────────────────────────────────────────────

export async function getMe(accessToken: string): Promise<MeResponse> {
  const raw = await apiFetch<unknown>("/users/auth/me", {}, accessToken);
  return MeResponseSchema.parse(raw);
}
