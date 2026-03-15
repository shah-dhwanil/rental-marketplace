import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ShoppingBag, ChevronRight, Loader2, AlertCircle, ChevronLeft,
  Package, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { listMyOrders } from "@/services/order.service";
import type { Order } from "@/schemas/order.schema";
import { ApiError } from "@/lib/api";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

const PAGE_SIZE = 10;

export function CustomerOrdersPage() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login/customer"); }
  }, [isAuthenticated]);

  const fetchOrders = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listMyOrders(accessToken, page, PAGE_SIZE);
      setOrders(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <ShoppingBag className="size-5 text-primary" />
        <h1 className="text-2xl font-bold">My Orders</h1>
        {total > 0 && <span className="text-sm text-muted-foreground">{total} order{total !== 1 ? "s" : ""}</span>}
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
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Package className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-lg">No orders yet</p>
            <p className="text-sm text-muted-foreground mt-1">Browse products and place your first rental order.</p>
          </div>
          <Button asChild><Link to="/">Explore Rentals</Link></Button>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:bg-muted/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{order.product_name ?? "Rental Order"}</p>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3" />
                  {formatDate(order.start_date)} — {formatDate(order.end_date)} · {order.rental_days} days
                </div>
                <p className="text-xs text-muted-foreground">
                  Order #{order.id.slice(0, 8).toUpperCase()} · {formatCurrency(order.grand_total)}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          ))}
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
