import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Loader2, AlertCircle, FileText, Package,
  Calendar, User, XCircle, CheckCircle, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { getOrder, updateOrderStatus, downloadOrderPdf } from "@/services/order.service";
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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-muted"}`}>
      {label}
    </span>
  );
}

// Admin-allowed transitions
const ADMIN_TRANSITIONS: Record<string, { status: string; label: string; variant: "default" | "destructive" | "outline" }[]> = {
  pending_payment: [{ status: "cancelled", label: "Cancel Order", variant: "destructive" }],
  confirmed: [
    { status: "active", label: "Mark Active", variant: "default" },
    { status: "cancelled", label: "Cancel", variant: "destructive" },
  ],
  active: [
    { status: "completed", label: "Mark Completed", variant: "default" },
    { status: "cancelled", label: "Cancel", variant: "destructive" },
  ],
};

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [downloading, setDownloading] = useState<"invoice" | "contract" | null>(null);

  async function handleDownload(type: "invoice" | "contract") {
    if (!accessToken || !orderId) return;
    setDownloading(type);
    try {
      await downloadOrderPdf(accessToken, orderId, type);
    } finally {
      setDownloading(null);
    }
  }

  useEffect(() => {
    if (!orderId || !accessToken) return;
    setLoading(true);
    getOrder(accessToken, orderId)
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load order."))
      .finally(() => setLoading(false));
  }, [orderId, accessToken]);

  async function handleStatus(newStatus: string) {
    if (!accessToken || !orderId) return;
    if (newStatus === "cancelled" && !showCancelInput) {
      setShowCancelInput(true);
      return;
    }
    setUpdatingStatus(newStatus);
    setUpdateError(null);
    try {
      const updated = await updateOrderStatus(accessToken, orderId, newStatus, newStatus === "cancelled" ? cancelReason || undefined : undefined);
      setOrder(updated);
      setShowCancelInput(false);
    } catch (err) {
      setUpdateError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setUpdatingStatus(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <p className="text-muted-foreground">{error ?? "Order not found."}</p>
        <Button variant="outline" onClick={() => navigate("/admin/dashboard/orders")}>Back to Orders</Button>
      </div>
    );
  }

  const transitions = ADMIN_TRANSITIONS[order.status] ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/dashboard/orders")} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground">Created {new Date(order.created_at).toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Parties */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-background p-4 space-y-2">
          <h2 className="font-semibold text-sm flex items-center gap-2"><User className="size-4 text-violet-500" /> Customer</h2>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{order.customer_name ?? "—"}</p>
            <p className="text-muted-foreground">{order.customer_email ?? "—"}</p>
            <p className="text-muted-foreground">{order.customer_mobile ?? "—"}</p>
            {order.delivery_address_line && <p className="text-muted-foreground text-xs">{order.delivery_address_line}</p>}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-4 space-y-2">
          <h2 className="font-semibold text-sm flex items-center gap-2"><Package className="size-4 text-violet-500" /> Vendor / Product</h2>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{order.vendor_name ?? "—"}</p>
            <p className="text-muted-foreground">{order.vendor_gst ? `GST: ${order.vendor_gst}` : ""}</p>
            <p className="text-muted-foreground">{order.product_name ?? "—"}</p>
            <p className="text-muted-foreground text-xs">Device: {order.device_id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Calendar className="size-4 text-violet-500" /> Schedule</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Rental</span><span>{formatDate(order.start_date)} — {formatDate(order.end_date)} ({order.rental_days}d)</span>
          <span className="text-muted-foreground">Deliver By</span><span>{formatDate(order.delivery_date)}</span>
          <span className="text-muted-foreground">Return By</span><span>{formatDate(order.return_date)}</span>
          <span className="text-muted-foreground">Type</span><span className="capitalize">{order.delivery_type.replace("_", " ")}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold text-sm">Payment Breakdown</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Rental</span><span>{formatCurrency(order.amount)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({order.promo_code})</span><span>-{formatCurrency(order.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Net</span><span>{formatCurrency(order.net_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">CGST 9%</span><span>{formatCurrency(order.cgst_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">SGST 9%</span><span>{formatCurrency(order.sgst_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Security Deposit</span><span>{formatCurrency(order.security_deposit)}</span></div>
          {order.damage_amount > 0 && <div className="flex justify-between text-destructive"><span>Damage</span><span>{formatCurrency(order.damage_amount)}</span></div>}
          <div className="border-t pt-2 flex justify-between font-semibold text-base"><span>Grand Total</span><span>{formatCurrency(order.grand_total)}</span></div>
        </div>
      </div>

      {/* Cancellation */}
      {order.status === "cancelled" && order.cancellation_reason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2">
          <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Cancelled</p>
            <p className="text-xs text-muted-foreground">{order.cancellation_reason}</p>
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <p className="font-medium text-sm">Documents</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => handleDownload("invoice")} disabled={downloading === "invoice"}>
            <FileText className="size-3.5" /> {downloading === "invoice" ? "Downloading…" : "Invoice"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => handleDownload("contract")} disabled={downloading === "contract"}>
            <FileText className="size-3.5" /> {downloading === "contract" ? "Downloading…" : "Contract"}
          </Button>
        </div>
      </div>

      {/* Admin status actions */}
      {transitions.length > 0 && (
        <div className="space-y-3">
          {updateError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" /> {updateError}
            </div>
          )}
          {showCancelInput && (
            <textarea
              placeholder="Cancellation reason (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          <div className="flex gap-2 flex-wrap">
            {transitions.map(({ status: newStatus, label, variant }) => (
              <Button
                key={newStatus}
                size="sm"
                variant={variant}
                onClick={() => handleStatus(newStatus)}
                disabled={updatingStatus === newStatus}
                className="gap-1.5"
              >
                {updatingStatus === newStatus ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {showCancelInput && newStatus === "cancelled" ? "Confirm Cancel" : label}
              </Button>
            ))}
            {showCancelInput && (
              <Button size="sm" variant="outline" onClick={() => { setShowCancelInput(false); setCancelReason(""); }}>
                Keep Order
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
