import { Link } from "react-router";
import { AuthLayout } from "./AuthLayout";
import { User, Store, Truck, Shield } from "lucide-react";

const ROLES = [
  {
    to: "/login/customer",
    icon: User,
    label: "Customer",
    desc: "Browse and rent electronics for personal or professional use",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    to: "/login/vendor",
    icon: Store,
    label: "Vendor",
    desc: "Manage your inventory and grow your rental business",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  {
    to: "/login/delivery-partner",
    icon: Truck,
    label: "Delivery Partner",
    desc: "Handle pickups and deliveries across the city",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    to: "/login/admin",
    icon: Shield,
    label: "Admin",
    desc: "Platform control panel — manage users, catalog, and settings",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30",
    border: "border-violet-200 dark:border-violet-800",
  },
] as const;

export function LoginLandingPage() {
  return (
    <AuthLayout>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Choose your account type to continue
        </p>
      </div>

      <div className="space-y-3">
        {ROLES.map(({ to, icon: Icon, label, desc, color, bg, border }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-4 p-4 rounded-xl border ${border} ${bg} transition-colors`}
          >
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border ${border}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${color}`}>{label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-7 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">New to RentalMkt?</p>
        <div className="flex justify-center gap-3 text-sm font-medium mt-1">
          <Link to="/signup/customer" className="text-primary hover:underline">Customer</Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/signup/vendor" className="text-emerald-600 hover:underline dark:text-emerald-400">Vendor</Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/signup/delivery-partner" className="text-amber-600 hover:underline dark:text-amber-400">Delivery Partner</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
