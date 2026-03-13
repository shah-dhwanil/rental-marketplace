import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Truck, Landmark, CheckCircle, ChevronRight } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import {
  RegisterStep1Schema,
  ProfileStep2Schema,
  Step3Schema,
} from "@/schemas/auth.schema";
import * as authService from "@/services/auth.service";
import {
  LocationPicker,
  type SelectedLocation,
} from "@/components/location/LocationPicker";

type FormErrors = Record<string, string>;

function extractErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const STEPS = [
  { label: "Account", icon: <span>👤</span> },
  { label: "Profile", icon: <Truck className="h-3.5 w-3.5" /> },
  { label: "Banking", icon: <Landmark className="h-3.5 w-3.5" /> },
];

const highlights = [
  { icon: "🚚", title: "Flexible Zones", desc: "Choose delivery zones that suit your schedule and location." },
  { icon: "💰", title: "Earn on Your Terms", desc: "Set your own availability and earn per delivery." },
  { icon: "📍", title: "Smart Routing", desc: "Our AI routes deliveries for maximum efficiency." },
  { icon: "⭐", title: "Build Your Rating", desc: "A strong rating means more deliveries and higher pay." },
];

export function DeliveryPartnerSignupPage() {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [done, setDone] = useState(false);

  // ── Step 1 state ────────────────────────────────────────────────────────────
  const [s1, setS1] = useState({ name: "", email_id: "", mobile_no: "", password: "", confirm_password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Step 2 state ────────────────────────────────────────────────────────────
  const [s2, setS2] = useState({ name: "", gst_no: "", address: "", city: "", pincode: "" });
  const [locationPick, setLocationPick] = useState<SelectedLocation | undefined>();

  // ── Step 3 state ────────────────────────────────────────────────────────────
  const [s3, setS3] = useState({
    bank_details: { account_number: "", ifsc_code: "", account_holder_name: "", bank_name: "" },
  });

  const updateS1 = (k: string, v: string) => { setS1((p) => ({ ...p, [k]: v })); clearError(k); };
  const updateS2 = (k: string, v: string) => { setS2((p) => ({ ...p, [k]: v })); clearError(k); };
  const updateS3 = (k: string, v: string) => {
    setS3((p) => ({ ...p, bank_details: { ...p.bank_details, [k]: v } }));
    clearError(`bank_details.${k}`);
  };

  const clearError = (key: string) => {
    setFormErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const handleStep1 = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = RegisterStep1Schema.safeParse({ ...s1, role: "delivery_partner" });
    if (!result.success) { setFormErrors(extractErrors(result.error)); return; }

    setIsLoading(true);
    try {
      const res = await authService.registerStep1(result.data);
      setTempToken(res.temp_token);
      setStep(2);
      setFormErrors({});
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = ProfileStep2Schema.safeParse({
      ...s2,
      lat: locationPick?.lat,
      lng: locationPick?.lng,
    });
    if (!result.success) { setFormErrors(extractErrors(result.error)); return; }
    if (!tempToken) return;

    setIsLoading(true);
    try {
      const res = await authService.dpStep2(result.data, tempToken);
      setTempToken(res.temp_token);
      setStep(3);
      setFormErrors({});
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to save profile info");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3 = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = Step3Schema.safeParse(s3);
    if (!result.success) { setFormErrors(extractErrors(result.error)); return; }
    if (!tempToken) return;

    setIsLoading(true);
    try {
      const tokens = await authService.dpStep3(result.data, tempToken);
      await setTokens(tokens);
      setDone(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to save bank details");
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout highlights={highlights}>
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            You&apos;re Registered! 🎉
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your delivery partner profile is under review. Expect a response within 24 hours.
          </p>
          <Button className="w-full h-10" onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout highlights={highlights}>
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
          <span>🚚</span> Delivery Partner
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Join as Delivery Partner
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Already have one?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => {
          const num = i + 1;
          const active = num === step;
          const done_step = num < step;
          return (
            <div key={s.label} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                active ? "bg-amber-500 text-white" :
                done_step ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" :
                "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}>
                {done_step ? <CheckCircle className="h-3 w-3" /> : s.icon}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <form onSubmit={handleStep1} noValidate className="space-y-4">
          <Field label="Full Name" id="name" error={formErrors.name}>
            <Input id="name" placeholder="Raj Kumar" value={s1.name}
              onChange={(e) => updateS1("name", e.target.value)}
              className={`h-10 ${formErrors.name ? "border-red-500" : ""}`} />
          </Field>

          <Field label="Email Address" id="email" error={formErrors.email_id}>
            <Input id="email" type="email" placeholder="you@example.com" value={s1.email_id}
              onChange={(e) => updateS1("email_id", e.target.value)}
              className={`h-10 ${formErrors.email_id ? "border-red-500" : ""}`} />
          </Field>

          <Field label="Mobile Number" id="mobile" error={formErrors.mobile_no}>
            <Input id="mobile" type="tel" placeholder="+91 98765 43210" value={s1.mobile_no}
              onChange={(e) => updateS1("mobile_no", e.target.value)}
              className={`h-10 ${formErrors.mobile_no ? "border-red-500" : ""}`} />
          </Field>

          <Field label="Password" id="pwd" error={formErrors.password}
            hint="Min 8 chars · 1 uppercase · 1 number · 1 special">
            <PasswordInput id="pwd" value={s1.password}
              onChange={(v) => updateS1("password", v)}
              show={showPwd} onToggle={() => setShowPwd((v) => !v)}
              hasError={!!formErrors.password} />
          </Field>

          <Field label="Confirm Password" id="cpwd" error={formErrors.confirm_password}>
            <PasswordInput id="cpwd" value={s1.confirm_password}
              onChange={(v) => updateS1("confirm_password", v)}
              show={showConfirm} onToggle={() => setShowConfirm((v) => !v)}
              hasError={!!formErrors.confirm_password} />
          </Field>

          <ServerError msg={serverError} />

          <Button type="submit" disabled={isLoading} className="w-full h-10 font-semibold bg-amber-500 hover:bg-amber-600 border-amber-500">
            {isLoading ? <Spinner label="Creating account…" /> : "Continue to Profile →"}
          </Button>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <form onSubmit={handleStep2} noValidate className="space-y-4">
          <Field label="Full Name" id="dpname" error={formErrors.name}>
            <Input id="dpname" placeholder="Raj Kumar" value={s2.name}
              onChange={(e) => updateS2("name", e.target.value)}
              className={`h-10 ${formErrors.name ? "border-red-500" : ""}`} />
          </Field>

          <Field label="GST Number (optional)" id="gst" error={formErrors.gst_no}>
            <Input id="gst" placeholder="22AAAAA0000A1Z5" value={s2.gst_no}
              onChange={(e) => updateS2("gst_no", e.target.value)}
              className="h-10" />
          </Field>

          <Field label="Home Address" id="address" error={formErrors.address}>
            <Input id="address" placeholder="456 Park Colony, Block B" value={s2.address}
              onChange={(e) => updateS2("address", e.target.value)}
              className={`h-10 ${formErrors.address ? "border-red-500" : ""}`} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City" id="city" error={formErrors.city}>
              <Input id="city" placeholder="Delhi" value={s2.city}
                onChange={(e) => updateS2("city", e.target.value)}
                className={`h-10 ${formErrors.city ? "border-red-500" : ""}`} />
            </Field>
            <Field label="Pincode" id="pin" error={formErrors.pincode}>
              <Input id="pin" placeholder="110001" maxLength={6} value={s2.pincode}
                onChange={(e) => updateS2("pincode", e.target.value)}
                className={`h-10 ${formErrors.pincode ? "border-red-500" : ""}`} />
            </Field>
          </div>

          {/* Map-based location picker */}
          <LocationPicker
            value={locationPick}
            onChange={(loc) => {
              setLocationPick(loc);
              // Pre-fill address if currently empty
              if (!s2.address.trim()) {
                updateS2("address", loc.address);
              }
            }}
            error={formErrors.lat ?? formErrors.lng}
          />

          <ServerError msg={serverError} />

          <Button type="submit" disabled={isLoading} className="w-full h-10 font-semibold bg-amber-500 hover:bg-amber-600 border-amber-500">
            {isLoading ? <Spinner label="Saving…" /> : "Continue to Bank Details →"}
          </Button>
        </form>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <form onSubmit={handleStep3} noValidate className="space-y-4">
          <p className="text-xs text-slate-400 -mt-2 mb-1">
            Your bank details are encrypted. Earnings are deposited weekly.
          </p>

          <Field label="Account Holder Name" id="holder" error={formErrors["bank_details.account_holder_name"]}>
            <Input id="holder" placeholder="Raj Kumar" value={s3.bank_details.account_holder_name}
              onChange={(e) => updateS3("account_holder_name", e.target.value)}
              className={`h-10 ${formErrors["bank_details.account_holder_name"] ? "border-red-500" : ""}`} />
          </Field>

          <Field label="Bank Name" id="bank" error={formErrors["bank_details.bank_name"]}>
            <Input id="bank" placeholder="SBI" value={s3.bank_details.bank_name}
              onChange={(e) => updateS3("bank_name", e.target.value)}
              className={`h-10 ${formErrors["bank_details.bank_name"] ? "border-red-500" : ""}`} />
          </Field>

          <Field label="Account Number" id="accno" error={formErrors["bank_details.account_number"]}>
            <Input id="accno" placeholder="12345678901234" value={s3.bank_details.account_number}
              onChange={(e) => updateS3("account_number", e.target.value)}
              className={`h-10 ${formErrors["bank_details.account_number"] ? "border-red-500" : ""}`} />
          </Field>

          <Field label="IFSC Code" id="ifsc" error={formErrors["bank_details.ifsc_code"]}>
            <Input id="ifsc" placeholder="SBIN0001234" maxLength={11}
              value={s3.bank_details.ifsc_code}
              onChange={(e) => updateS3("ifsc_code", e.target.value.toUpperCase())}
              className={`h-10 ${formErrors["bank_details.ifsc_code"] ? "border-red-500" : ""}`} />
          </Field>

          <ServerError msg={serverError} />

          <Button type="submit" disabled={isLoading} className="w-full h-10 font-semibold">
            {isLoading ? <Spinner label="Completing registration…" /> : "Complete Registration 🎉"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Field({
  label, id, error, hint, children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PasswordInput({
  id, value, onChange, show, onToggle, hasError,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  hasError: boolean;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        placeholder="••••••••"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 pr-10 ${hasError ? "border-red-500" : ""}`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ServerError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
      <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      {label}
    </span>
  );
}
