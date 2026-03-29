import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft, Loader2, AlertCircle, FileText, Package,
  MapPin, Calendar, Tag, XCircle, Truck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { getOrder, updateOrderStatus, downloadOrderPdf } from "@/services/order.service";
import { getOrderReview } from "@/services/review.service";
import { ReviewModal } from "@/components/reviews";
import type { Order } from "@/schemas/order.schema";
import type { Review } from "@/schemas/review.schema";
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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

export function CustomerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [downloading, setDownloading] = useState<"invoice" | "contract" | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

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

  // Load review if order is completed
  useEffect(() => {
    if (!orderId || !order || order.status !== "completed") return;
    setLoadingReview(true);
    getOrderReview(orderId)
      .then(setExistingReview)
      .catch(() => setExistingReview(null))
      .finally(() => setLoadingReview(false));
  }, [orderId, order]);

  async function handleCancel() {
    if (!accessToken || !orderId) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await updateOrderStatus(accessToken, orderId, "cancelled", cancelReason || undefined);
      setOrder(updated);
      setShowCancelConfirm(false);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Failed to cancel order.");
    } finally {
      setCancelling(false);
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
        <Button variant="outline" asChild><Link to="/orders">Back to Orders</Link></Button>
      </div>
    );
  }

  const canCancel = order.status === "confirmed";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/orders")} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground">Placed on {new Date(order.created_at).toLocaleDateString("en-IN")}</p>
        </div>
      </div>

      {/* Product */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold flex items-center gap-2 text-sm"><Package className="size-4 text-primary" /> Product</h2>
        <p className="font-medium">{order.product_name ?? order.product_id}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>Device</span><span className="text-foreground">{order.device_id.slice(0, 8).toUpperCase()}</span>
          <span>Vendor</span><span className="text-foreground">{order.vendor_name ?? "—"}</span>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold flex items-center gap-2 text-sm"><Calendar className="size-4 text-primary" /> Schedule</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Rental Start</span><span>{formatDate(order.start_date)}</span>
          <span className="text-muted-foreground">Rental End</span><span>{formatDate(order.end_date)}</span>
          <span className="text-muted-foreground">Delivery By</span><span>{formatDate(order.delivery_date)}</span>
          <span className="text-muted-foreground">Return By</span><span>{formatDate(order.return_date)}</span>
          <span className="text-muted-foreground">Duration</span><span>{order.rental_days} day{order.rental_days !== 1 ? "s" : ""}</span>
          <span className="text-muted-foreground">Delivery Type</span><span className="capitalize">{order.delivery_type.replace("_", " ")}</span>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold flex items-center gap-2 text-sm"><Tag className="size-4 text-primary" /> Payment</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Rental Amount</span><span>{formatCurrency(order.amount)}</span></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600"><span>Promo Discount ({order.promo_code})</span><span>-{formatCurrency(order.discount)}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Net Amount</span><span>{formatCurrency(order.net_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">CGST (9%)</span><span>{formatCurrency(order.cgst_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">SGST (9%)</span><span>{formatCurrency(order.sgst_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Security Deposit</span><span>{formatCurrency(order.security_deposit)}</span></div>
          {order.damage_amount > 0 && (
            <div className="flex justify-between text-destructive"><span>Damage Charge</span><span>{formatCurrency(order.damage_amount)}</span></div>
          )}
          {/* {(order.defect_charge ?? 0) > 0 && (
            <div className="flex justify-between text-destructive"><span>Defect Charge</span><span>{formatCurrency(order.defect_charge ?? 0)}</span></div>
          )} */}
          <div className="border-t pt-2 flex justify-between font-semibold text-base">
            <span>Grand Total</span><span>{formatCurrency(order.grand_total)}</span>
          </div>
        </div>
        {order.status !== "cancelled" && (
          <p className="text-xs text-muted-foreground">Security deposit of {formatCurrency(order.security_deposit)} is refundable after return.</p>
        )}
      </div>

      {/* Cancellation note */}
      {order.status === "cancelled" && order.cancellation_reason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2">
          <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Order Cancelled</p>
            <p className="text-xs text-muted-foreground mt-0.5">{order.cancellation_reason}</p>
          </div>
        </div>
      )}

      {/* Documents */}
      {order.status !== "pending_payment" && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="font-medium text-sm">Documents</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => handleDownload("invoice")} disabled={downloading === "invoice"}>
              <FileText className="size-3.5" /> {downloading === "invoice" ? "Downloading…" : "Invoice PDF"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => handleDownload("contract")} disabled={downloading === "contract"}>
              <FileText className="size-3.5" /> {downloading === "contract" ? "Downloading…" : "Contract PDF"}
            </Button>
          </div>
        </div>
      )}

      {/* Write Review - for completed orders */}
      {order.status === "completed" && !loadingReview && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Star className="size-4 text-primary" /> Review
          </h2>
          {existingReview ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">You reviewed this product</p>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-4 ${star <= existingReview.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(existingReview.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm">{existingReview.comment}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Share your experience with this product to help other customers.
              </p>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setShowReviewModal(true)}
              >
                <Star className="size-4" /> Write a Review
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Cancel order */}
      {canCancel && (
        <div className="space-y-3">
          {!showCancelConfirm ? (
            <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowCancelConfirm(true)}>
              <XCircle className="size-4 mr-1.5" /> Cancel Order
            </Button>
          ) : (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="font-semibold text-sm">Confirm Cancellation</p>
              <textarea
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {cancelError && <p className="text-xs text-destructive">{cancelError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCancelConfirm(false)}>Keep Order</Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                  Cancel Order
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && order && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          orderId={order.id}
          productId={order.product_id}
          productName={order.product_name || "Product"}
          onSuccess={() => {
            // Reload review after submission
            getOrderReview(order.id).then(setExistingReview).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
