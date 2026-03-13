import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  User, Mail, Phone, MapPin, Building2, BadgeCheck,
  Camera, Edit, LogOut, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import * as profileService from "@/services/profile.service";
import type { AnyProfile, VendorProfile, DeliveryPartnerProfile } from "@/schemas/profile.schema";

function Avatar({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-20 h-20 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow"
      />
    );
  }
  return (
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shadow">
      <span className="text-2xl font-bold text-primary">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    customer: { label: "Customer", className: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    vendor: { label: "Vendor", className: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    delivery_partner: { label: "Delivery Partner", className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    admin: { label: "Admin", className: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  };
  const { label, className } = config[role] ?? { label: role, className: "" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${className}`}>
      {label}
    </span>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { accessToken, user, logout } = useAuthStore();
  const [profile, setProfile] = useState<AnyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
      return;
    }
    profileService.getProfile(accessToken)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [accessToken, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-red-500 text-sm">{error ?? "Could not load profile."}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const vendorExtra = profile.role === "vendor" ? (profile as VendorProfile) : null;
  const dpExtra = profile.role === "delivery_partner" ? (profile as DeliveryPartnerProfile) : null;
  const displayName = vendorExtra?.vendor_name ?? dpExtra?.dp_name ?? profile.name;
  const businessName = vendorExtra?.vendor_name ?? dpExtra?.dp_name;
  const address = vendorExtra?.address ?? dpExtra?.address;
  const city = vendorExtra?.city ?? dpExtra?.city;
  const pincode = vendorExtra?.pincode ?? dpExtra?.pincode;
  const isBusinessVerified = vendorExtra?.is_business_verified ?? dpExtra?.is_business_verified ?? false;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-primary">RentalMkt</Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Profile card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Cover strip */}
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />

          <div className="px-6 pb-6">
            {/* Avatar + name row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                <Avatar url={profile.profile_photo_url} name={profile.name} />
              </div>
              <Link to="/profile/edit">
                <Button variant="outline" className="h-8 text-xs gap-1.5">
                  <Edit className="h-3.5 w-3.5" /> Edit Profile
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{displayName}</h1>
              {isBusinessVerified && (
                <BadgeCheck className="h-5 w-5 text-emerald-500" title="Verified" />
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              <RoleBadge role={profile.role} />
              {!profile.is_profile_complete && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                  Incomplete
                </span>
              )}
              {profile.is_verified && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                  Verified
                </span>
              )}
            </div>

            {/* Info rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <InfoRow icon={Mail} label="Email" value={profile.email_id} />
              <InfoRow icon={Phone} label="Mobile" value={profile.mobile_no} />
              {businessName && <InfoRow icon={Building2} label="Business Name" value={businessName} />}
              {address && (
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={[address, city, pincode].filter(Boolean).join(", ")}
                />
              )}
            </div>
          </div>
        </div>

        {/* Account status card */}
        {!profile.is_profile_complete && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Registration Incomplete</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  Your profile setup is not finished. Complete it to start using the platform.
                </p>
                <Link
                  to={profile.role === "vendor" ? "/signup/vendor" : "/signup/delivery-partner"}
                  className="inline-block mt-2 text-xs font-medium text-orange-700 dark:text-orange-300 underline"
                >
                  Complete registration →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
