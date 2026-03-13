import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth.store";
import { LoginSchema, ROLE_LABELS, type AppRole } from "@/schemas/auth.schema";

type FormErrors = Record<string, string>;

function extractErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const ROLE_DESCRIPTIONS: Record<AppRole, { sub: string; color: string }> = {
  customer: {
    sub: "Rent gadgets for personal or professional use",
    color: "text-blue-600 dark:text-blue-400",
  },
  vendor: {
    sub: "List and manage your electronics inventory",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  delivery_partner: {
    sub: "Handle pickups and deliveries across the city",
    color: "text-amber-600 dark:text-amber-400",
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [activeRole, setActiveRole] = useState<AppRole>("customer");
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearState = () => {
    setErrors({});
    setServerError(null);
  };

  const handleRoleChange = (role: string) => {
    setActiveRole(role as AppRole);
    clearState();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearState();

    const result = LoginSchema.safeParse({
      email_id: emailId,
      password,
      role: activeRole,
    });

    if (!result.success) {
      setErrors(extractErrors(result.error));
      return;
    }

    setIsLoading(true);
    try {
      await login(result.data);
      navigate("/");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const roleInfo = ROLE_DESCRIPTIONS[activeRole];

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back
        </h1>
        <p className={`text-sm mt-1 ${roleInfo.color}`}>{roleInfo.sub}</p>
      </div>

      <Tabs value={activeRole} onValueChange={handleRoleChange} className="mb-6">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1">
          {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
            <TabsTrigger key={role} value={role} className="text-xs py-2">
              {ROLE_LABELS[role]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All roles share the same form; only the role value changes */}
        {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
          <TabsContent key={role} value={role} className="mt-0" />
        ))}
      </Tabs>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
          >
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={emailId}
            onChange={(e) => setEmailId(e.target.value)}
            className={`h-10 ${errors.email_id ? "border-red-500 focus-visible:border-red-500" : ""}`}
            aria-invalid={!!errors.email_id}
            aria-describedby={errors.email_id ? "email-error" : undefined}
          />
          {errors.email_id && (
            <p id="email-error" className="text-xs text-red-500 mt-1">
              {errors.email_id}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
            >
              Password
            </label>
            <span className="text-xs text-primary hover:underline cursor-pointer">
              Forgot password?
            </span>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`h-10 pr-10 ${errors.password ? "border-red-500 focus-visible:border-red-500" : ""}`}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-xs text-red-500 mt-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
            <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 font-semibold"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Sign in as {ROLE_LABELS[activeRole]}
            </span>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs text-slate-400">OR</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Sign-up links */}
      <div className="text-center space-y-1">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          New to RentalMkt?
        </p>
        <div className="flex justify-center gap-3 text-sm font-medium">
          <Link to="/signup/customer" className="text-primary hover:underline">
            Customer
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/signup/vendor" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Vendor
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/signup/delivery-partner" className="text-amber-600 hover:underline dark:text-amber-400">
            Delivery Partner
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
