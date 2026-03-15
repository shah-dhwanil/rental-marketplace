import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  Plus, Trash2, Tag, Pencil, ToggleLeft, ToggleRight,
  Calendar, Loader2, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { listMyPromos, deletePromo, updatePromo } from "@/services/promo.service";
import type { Promo } from "@/schemas/promo.schema";
import { ApiError } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDiscount(promo: Promo) {
  if (promo.discount_type === "percentage") return `${promo.discount_value}% off`;
  return `₹${promo.discount_value} off`;
}

function ScopeBadge({ scope }: { scope: string }) {
  const colours: Record<string, string> = {
    product: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    vendor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    platform: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${colours[scope] ?? "bg-muted text-muted-foreground"}`}>
      {scope}
    </span>
  );
}

export function VendorPromoCodesPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const [promos, setPromos] = useState<Promo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const PAGE_SIZE = 15;

  const fetchPromos = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listMyPromos(accessToken, page, PAGE_SIZE);
      setPromos(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load promo codes.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  async function handleDelete(promoId: string) {
    if (!accessToken || !confirm("Delete this promo code? This cannot be undone.")) return;
    setDeletingId(promoId);
    try {
      await deletePromo(accessToken, promoId);
      setPromos((prev) => prev.filter((p) => p.id !== promoId));
      setTotal((t) => t - 1);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete promo code.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleActive(promo: Promo) {
    if (!accessToken) return;
    setTogglingId(promo.id);
    try {
      const updated = await updatePromo(accessToken, promo.id, { is_active: !promo.is_active });
      setPromos((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update promo code.");
    } finally {
      setTogglingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Promo Codes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} promo code{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/vendor/dashboard/promos/create")}>
          <Plus className="size-4 mr-1.5" />
          Create
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && promos.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Tag className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-lg">No promo codes yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first promo code to offer discounts on your products.</p>
          </div>
          <Button size="sm" onClick={() => navigate("/vendor/dashboard/promos/create")}>
            <Plus className="size-4 mr-1.5" /> Create Promo Code
          </Button>
        </div>
      )}

      {/* Table */}
      {!loading && promos.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden bg-background shadow-sm">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scope</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Discount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Valid Until</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Uses</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {promos.map((promo) => (
                  <tr key={promo.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{promo.code}</td>
                    <td className="px-4 py-3"><ScopeBadge scope={promo.scope} /></td>
                    <td className="px-4 py-3 font-medium">{formatDiscount(promo)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {formatDate(promo.valid_until)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {promo.uses_count}{promo.max_uses != null ? `/${promo.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        disabled={togglingId === promo.id}
                        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                      >
                        {togglingId === promo.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : promo.is_active ? (
                          <ToggleRight className="size-4 text-green-500" />
                        ) : (
                          <ToggleLeft className="size-4 text-muted-foreground" />
                        )}
                        <span className={promo.is_active ? "text-green-600" : "text-muted-foreground"}>
                          {promo.is_active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => navigate(`/vendor/dashboard/promos/${promo.id}/edit`)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(promo.id)}
                          disabled={deletingId === promo.id}
                          aria-label="Delete"
                        >
                          {deletingId === promo.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {promos.map((promo) => (
              <div key={promo.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono font-bold text-primary">{promo.code}</p>
                    <ScopeBadge scope={promo.scope} />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigate(`/vendor/dashboard/promos/${promo.id}/edit`)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(promo.id)} disabled={deletingId === promo.id}>
                      {deletingId === promo.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="text-sm space-y-0.5">
                  <p className="font-medium">{formatDiscount(promo)}</p>
                  <p className="text-muted-foreground text-xs">Valid until {formatDate(promo.valid_until)}</p>
                  <p className="text-muted-foreground text-xs">Uses: {promo.uses_count}{promo.max_uses != null ? `/${promo.max_uses}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
