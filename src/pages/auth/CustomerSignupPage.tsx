import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import { RegisterStep1Schema } from "@/schemas/auth.schema";
import * as authService from "@/services/auth.service";

type FormErrors = Record<string, string>;

function extractErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const highlights = [
  { icon: "📱", title: "Rent Any Gadget", desc: "Phones, tablets, cameras — all available for daily rental." },
  { icon: "💳", title: "Zero Deposit Option", desc: "Verified customers enjoy no-deposit rentals." },
  { icon: "🔄", title: "Flexible Duration", desc: "Daily, weekly, or monthly — you choose." },
  { icon: "🛡️", title: "Insured Deliveries", desc: "Every rental is fully insured end-to-end." },
];

type Step = "form" | "success";

export function CustomerSignupPage() {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<Step>("form");
  const [form, setForm] = useState({
    name: "",
    email_id: "",
    mobile_no: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = RegisterStep1Schema.safeParse({ ...form, role: "customer" });
    if (!result.success) {
      setErrors(extractErrors(result.error));
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: create account
      const { temp_token } = await authService.registerStep1(result.data);
      // Immediately complete customer registration
      const tokens = await authService.completeCustomerRegistration(temp_token);
      await setTokens(tokens);
      setCurrentStep("success");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStep === "success") {
    return (
      <AuthLayout highlights={highlights}>
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Account Created! 🎉
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Welcome to RentalMkt. You&apos;re ready to start renting.
          </p>
          <Button className="w-full h-10" onClick={() => navigate("/")}>
            Browse Rentals
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout highlights={highlights}>
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
          <span>👤</span> Customer Account
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Create your account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Already have one?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Full name */}
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <Input
            id="name"
            placeholder="John Doe"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={`h-10 ${errors.name ? "border-red-500" : ""}`}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email_id}
            onChange={(e) => update("email_id", e.target.value)}
            className={`h-10 ${errors.email_id ? "border-red-500" : ""}`}
            aria-invalid={!!errors.email_id}
          />
          {errors.email_id && <p className="text-xs text-red-500">{errors.email_id}</p>}
        </div>

        {/* Mobile */}
        <div className="space-y-1">
          <label htmlFor="mobile" className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Mobile Number
          </label>
          <Input
            id="mobile"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={form.mobile_no}
            onChange={(e) => update("mobile_no", e.target.value)}
            className={`h-10 ${errors.mobile_no ? "border-red-500" : ""}`}
            aria-invalid={!!errors.mobile_no}
          />
          {errors.mobile_no && <p className="text-xs text-red-500">{errors.mobile_no}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={`h-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          <p className="text-xs text-slate-400">Min 8 chars · 1 uppercase · 1 number · 1 special char</p>
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Confirm Password
          </label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.confirm_password}
              onChange={(e) => update("confirm_password", e.target.value)}
              className={`h-10 pr-10 ${errors.confirm_password ? "border-red-500" : ""}`}
              aria-invalid={!!errors.confirm_password}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-red-500">{errors.confirm_password}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
            <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full h-10 font-semibold">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Creating account…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create Customer Account
            </span>
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">
        Want to list products?{" "}
        <Link to="/signup/vendor" className="text-emerald-600 hover:underline font-medium">
          Register as Vendor
        </Link>
      </p>
    </AuthLayout>
  );
}
