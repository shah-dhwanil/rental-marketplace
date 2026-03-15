import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ShoppingBag, Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Package, Calendar, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { listVendorOrders } from "@/services/order.service";
import type { Order } from "@/schemas/order.schema";
import { ApiError } from "@/lib/api";

const STATUSES = [
  { value: "", label: "All" },
  { value: "pending_payment", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-muted"}`}>
      {label}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAGE_SIZE = 15;

export function VendorOrdersPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listVendorOrders(accessToken, page, PAGE_SIZE, statusFilter || undefined);
      setOrders(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function handleStatusFilter(s: string) {
    setStatusFilter(s);
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} total order{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleStatusFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && orders.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ShoppingBag className="size-8 text-muted-foreground" />
          <p className="font-semibold text-lg">No orders {statusFilter && `with status "${statusFilter.replace(/_/g, " ")}"`}</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden bg-background shadow-sm">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{order.product_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="size-3" />{order.customer_name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Calendar className="size-3" />
                        {formatDate(order.start_date)} — {formatDate(order.end_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(order.grand_total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => navigate(`/vendor/dashboard/orders/${order.id}`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {orders.map((order) => (
              <Link key={order.id} to={`/vendor/dashboard/orders/${order.id}`} className="block p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-sm">{order.product_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p><User className="size-3 inline mr-1" />{order.customer_name ?? "—"}</p>
                  <p><Calendar className="size-3 inline mr-1" />{formatDate(order.start_date)} — {formatDate(order.end_date)}</p>
                  <p className="font-medium text-foreground">{formatCurrency(order.grand_total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
