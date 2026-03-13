import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Search,
  Users,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import * as adminService from "@/services/admin.service";
import type { UserSummary } from "@/schemas/admin.schema";

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "customer", label: "Customers" },
  { value: "vendor", label: "Vendors" },
  { value: "delivery_partner", label: "Delivery Partners" },
];

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

export function AdminUsersPage() {
  const { accessToken } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get("role") ?? "";

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, roleFilter]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    adminService
      .listAdminUsers(accessToken, {
        page,
        page_size: PAGE_SIZE,
        role: roleFilter || undefined,
        q: debouncedQ || undefined,
      })
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [accessToken, page, debouncedQ, roleFilter]);

  async function handleToggleActive(user: UserSummary) {
    if (!accessToken) return;
    setToggling(user.id);
    try {
      await adminService.updateUserStatus(accessToken, user.id, !user.is_active);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u)),
      );
    } catch {
      alert("Failed to update user status.");
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!accessToken) return;
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    setDeleting(userId);
    try {
      await adminService.deleteAdminUser(accessToken, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotal((t) => t - 1);
    } catch {
      alert("Failed to delete user.");
    } finally {
      setDeleting(null);
    }
  }

  function handleRoleFilter(role: string) {
    setRoleFilter(role);
    if (role) {
      setSearchParams({ role });
    } else {
      setSearchParams({});
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">{total} total users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRoleFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                roleFilter === opt.value
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-background text-muted-foreground border-border hover:border-violet-400 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-background px-4 py-3 animate-pulse flex items-center gap-3">
              <div className="size-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-36" />
                <div className="h-3 bg-muted rounded w-52" />
              </div>
              <div className="h-5 bg-muted rounded w-16" />
              <div className="h-5 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="size-12 text-muted-foreground/30 mb-4" />
          <p className="font-medium">No users found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
        </div>
      )}

      {/* User list */}
      {!loading && users.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
              {/* Avatar */}
              <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email_id}</p>
              </div>

              {/* Badges */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? "bg-muted text-muted-foreground"}`}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
                {user.is_verified ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="size-2.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <XCircle className="size-2.5" /> Unverified
                  </span>
                )}
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    user.is_active
                      ? "border-green-300 text-green-700 dark:text-green-400"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Link to={`/admin/dashboard/users/${user.id}`}>
                  <Button variant="ghost" size="icon" className="size-8" title="View details">
                    <Eye className="size-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`size-8 ${user.is_active ? "text-muted-foreground hover:text-amber-600" : "text-muted-foreground hover:text-green-600"}`}
                  disabled={toggling === user.id}
                  onClick={() => handleToggleActive(user)}
                  title={user.is_active ? "Deactivate" : "Activate"}
                >
                  {user.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:bg-destructive/10"
                  disabled={deleting === user.id}
                  onClick={() => handleDelete(user.id)}
                  title="Delete user"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
