import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Trash2,
  ToggleLeft,
  ToggleRight,
  User,
  Building2,
  CreditCard,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import * as adminService from "@/services/admin.service";
import type { AdminUserDetail } from "@/schemas/admin.schema";

const ROLE_COLORS: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  vendor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  delivery_partner: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  delivery_partner: "Delivery Partner",
  admin: "Admin",
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{String(value)}</p>
    </div>
  );
}

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!accessToken || !userId) return;
    setLoading(true);
    adminService
      .getAdminUser(accessToken, userId)
      .then(setUser)
      .catch(() => setError("Failed to load user."))
      .finally(() => setLoading(false));
  }, [accessToken, userId]);

  async function handleVerify() {
    if (!accessToken || !userId || !user) return;
    setVerifying(true);
    try {
      await adminService.verifyUser(accessToken, userId);
      setUser({ ...user, is_verified: true });
    } catch {
      alert("Failed to verify user.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleToggleActive() {
    if (!accessToken || !userId || !user) return;
    setToggling(true);
    try {
      await adminService.updateUserStatus(accessToken, userId, !user.is_active);
      setUser({ ...user, is_active: !user.is_active });
    } catch {
      alert("Failed to update user status.");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !userId) return;
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await adminService.deleteAdminUser(accessToken, userId);
      navigate("/admin/dashboard/users");
    } catch {
      alert("Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-6 bg-muted animate-pulse rounded w-24" />
        <div className="rounded-xl border border-border bg-background p-6 space-y-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-5 bg-muted rounded w-40" />
              <div className="h-4 bg-muted rounded w-56" />
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <p className="text-sm text-destructive">{error || "User not found."}</p>
        <Link to="/admin/dashboard/users" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to Users
        </Link>
      </div>
    );
  }

  const businessName = user.vendor_name ?? user.dp_name;
  const bankDetails = user.bank_details as Record<string, string> | null | undefined;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <Link
        to="/admin/dashboard/users"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Users
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar / photo */}
          <div className="size-16 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            {user.profile_photo_url ? (
              <img src={user.profile_photo_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="size-7 text-primary" />
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg font-bold">{user.name}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? "bg-muted text-muted-foreground"}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{user.email_id}</p>
            <p className="text-sm text-muted-foreground">{user.mobile_no}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
                  <CheckCircle className="size-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                  <XCircle className="size-3.5" /> Not Verified
                </span>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${user.is_active ? "border-green-300 text-green-700 dark:text-green-400" : "border-border text-muted-foreground"}`}
              >
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
              {!user.is_profile_complete && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                  Incomplete Profile
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            {!user.is_verified && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                disabled={verifying}
                onClick={handleVerify}
              >
                <ShieldCheck className="size-3.5" />
                {verifying ? "Verifying…" : "Verify"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`gap-1.5 ${user.is_active ? "border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-400" : "border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400"}`}
              disabled={toggling}
              onClick={handleToggleActive}
            >
              {user.is_active ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
              {toggling ? "Updating…" : user.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-300 text-destructive hover:bg-destructive/10"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Basic info */}
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <User className="size-4 text-muted-foreground" /> Account Info
          </h2>
          <div className="space-y-2">
            <Field label="User ID" value={user.id} />
            <Field label="Created" value={new Date(user.created_at).toLocaleDateString()} />
            <Field label="Updated" value={new Date(user.updated_at).toLocaleDateString()} />
            {user.loyalty_points !== null && user.loyalty_points !== undefined && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Loyalty Points</p>
                <p className="text-sm mt-0.5 flex items-center gap-1">
                  <Star className="size-3.5 text-amber-500" />
                  {user.loyalty_points}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Business info (vendor / dp) */}
        {(businessName ?? user.address) && (
          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Building2 className="size-4 text-muted-foreground" /> Business Info
            </h2>
            <div className="space-y-2">
              <Field label="Business Name" value={businessName} />
              <Field label="GST No." value={user.gst_no} />
              <Field label="Address" value={user.address} />
              <Field label="City" value={user.city} />
              <Field label="Pincode" value={user.pincode} />
              {user.is_business_verified !== null && user.is_business_verified !== undefined && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Verified</p>
                  <p className="text-sm mt-0.5">{user.is_business_verified ? "Yes" : "No"}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bank details */}
        {bankDetails && typeof bankDetails === "object" && (
          <div className="rounded-xl border border-border bg-background p-4 space-y-3 sm:col-span-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <CreditCard className="size-4 text-muted-foreground" /> Bank Details
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Account Holder" value={bankDetails.account_holder_name} />
              <Field label="Bank Name" value={bankDetails.bank_name} />
              <Field label="Account Number" value={bankDetails.account_number} />
              <Field label="IFSC Code" value={bankDetails.ifsc_code} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
