import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, LogIn, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import { LoginSchema } from "@/schemas/auth.schema";

type FormErrors = Record<string, string>;

function extractErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function CustomerLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = LoginSchema.safeParse({ email_id: emailId, password, role: "customer" });
    if (!result.success) { setErrors(extractErrors(result.error)); return; }

    setIsLoading(true);
    try {
      const loginResult = await login(result.data);
      if (loginResult.status === "incomplete") {
        navigate("/signup/customer");
      } else {
        navigate("/");
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
          Customer Sign In
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Rent gadgets for personal or professional use
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
            value={emailId} onChange={(e) => setEmailId(e.target.value)}
            className={`h-10 ${errors.email_id ? "border-red-500" : ""}`} />
          {errors.email_id && <p className="text-xs text-red-500">{errors.email_id}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Password
            </label>
            <span className="text-xs text-primary hover:underline cursor-pointer">Forgot password?</span>
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"}
              autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={`h-10 pr-10 ${errors.password ? "border-red-500" : ""}`} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
            <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full h-10 font-semibold">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2"><LogIn className="h-4 w-4" /> Sign in</span>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        New customer?{" "}
        <Link to="/signup/customer" className="text-primary font-medium hover:underline">Create account</Link>
      </div>
    </AuthLayout>
  );
}
