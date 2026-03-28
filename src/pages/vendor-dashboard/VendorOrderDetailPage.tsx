import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft, Loader2, AlertCircle, FileText, Package,
  Calendar, User, CheckCircle, Truck, XCircle, DollarSign, Upload, X as CloseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth.store";
import { getOrder, updateOrderStatus, downloadOrderPdf } from "@/services/order.service";
import { getOrderDefects, type DefectCharge } from "@/services/defect.service";
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

// Vendor-allowed transitions
const VENDOR_TRANSITIONS: Record<string, { status: string; label: string; icon: typeof Truck }[]> = {
  confirmed: [
    { status: "active", label: "Mark as Delivered", icon: Truck },
    { status: "cancelled", label: "Cancel Order", icon: XCircle },
  ],
  active: [
    { status: "completed", label: "Mark as Completed", icon: CheckCircle },
  ],
};

export function VendorOrderDetailPage() {
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
  
  // Defect charge state
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [defectAmount, setDefectAmount] = useState("");
  const [defectDescription, setDefectDescription] = useState("");
  const [defectImages, setDefectImages] = useState<string[]>([]);
  const [defects, setDefects] = useState<DefectCharge[]>([]);
  const [loadingDefects, setLoadingDefects] = useState(false);

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
    
    // Load defects for this order
    setLoadingDefects(true);
    getOrderDefects(accessToken, orderId)
      .then((data) => setDefects(data.items))
      .catch(() => setDefects([]))
      .finally(() => setLoadingDefects(false));
  }, [orderId, accessToken]);

  async function handleStatusUpdate(newStatus: string) {
    if (!accessToken || !orderId) return;
    if (newStatus === "cancelled" && !showCancelInput) {
      setShowCancelInput(true);
      return;
    }
    
    // If completing order, show defect form option
    if (newStatus === "completed" && !showDefectForm) {
      setShowDefectForm(true);
      return;
    }
    
    setUpdatingStatus(newStatus);
    setUpdateError(null);
    try {
      // Prepare defect charge data if applicable
      const defectCharge =
        newStatus === "completed" &&
        defectAmount &&
        defectDescription
          ? {
              amount: parseFloat(defectAmount),
              description: defectDescription,
              images: defectImages,
            }
          : undefined;
      
      const updated = await updateOrderStatus(
        accessToken,
        orderId,
        newStatus,
        newStatus === "cancelled" ? cancelReason || undefined : undefined,
        defectCharge
      );
      setOrder(updated);
      setShowCancelInput(false);
      setShowDefectForm(false);
      
      // Clear defect form
      setDefectAmount("");
      setDefectDescription("");
      setDefectImages([]);
      
      // Reload defects
      getOrderDefects(accessToken, orderId).then((data) => setDefects(data.items)).catch(() => {});
    } catch (err) {
      setUpdateError(err instanceof ApiError ? err.message : "Failed to update order status.");
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
        <Button variant="outline" onClick={() => navigate("/vendor/dashboard/orders")}>Back to Orders</Button>
      </div>
    );
  }

  const transitions = VENDOR_TRANSITIONS[order.status] ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/vendor/dashboard/orders")} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground">Placed {new Date(order.created_at).toLocaleDateString("en-IN")}</p>
        </div>
      </div>

      {/* Customer info */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold text-sm flex items-center gap-2"><User className="size-4 text-primary" /> Customer</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Name</span><span>{order.customer_name ?? "—"}</span>
          <span className="text-muted-foreground">Mobile</span><span>{order.customer_mobile ?? "—"}</span>
          <span className="text-muted-foreground">Email</span><span className="truncate">{order.customer_email ?? "—"}</span>
          <span className="text-muted-foreground">Address</span><span>{order.delivery_address_line ?? "—"}</span>
        </div>
      </div>

      {/* Product & device */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Package className="size-4 text-primary" /> Product & Device</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Product</span><span>{order.product_name ?? "—"}</span>
          <span className="text-muted-foreground">Device ID</span><span>{order.device_id.slice(0, 8).toUpperCase()}</span>
          <span className="text-muted-foreground">Delivery</span><span className="capitalize">{order.delivery_type.replace("_", " ")}</span>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Calendar className="size-4 text-primary" /> Schedule</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Start</span><span>{formatDate(order.start_date)}</span>
          <span className="text-muted-foreground">End</span><span>{formatDate(order.end_date)}</span>
          <span className="text-muted-foreground">Deliver By</span><span>{formatDate(order.delivery_date)}</span>
          <span className="text-muted-foreground">Return By</span><span>{formatDate(order.return_date)}</span>
          <span className="text-muted-foreground">Days</span><span>{order.rental_days}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2">
        <h2 className="font-semibold text-sm">Payment Breakdown</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Rental</span><span>{formatCurrency(order.amount)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">CGST (9%)</span><span>{formatCurrency(order.cgst_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">SGST (9%)</span><span>{formatCurrency(order.sgst_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Security Deposit</span><span>{formatCurrency(order.security_deposit)}</span></div>
          <div className="border-t pt-2 flex justify-between font-semibold text-base"><span>Grand Total</span><span>{formatCurrency(order.grand_total)}</span></div>
        </div>
      </div>

      {/* Cancellation reason */}
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

      {/* Defect Charges */}
      {defects.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <DollarSign className="size-4 text-primary" /> Defect Charges
          </h2>
          {defects.map((defect) => (
            <div key={defect.id} className="border-l-4 border-orange-500 pl-3 py-2 space-y-1">
              <div className="flex justify-between items-start">
                <span className="font-medium">{formatCurrency(defect.amount)}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  defect.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : defect.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {defect.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{defect.description}</p>
              {defect.images.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {defect.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Defect ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status actions */}
      {transitions.length > 0 && (
        <div className="space-y-3">
          {updateError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" /> {updateError}
            </div>
          )}
          {showCancelInput && (
            <div className="space-y-2">
              <textarea
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          
          {/* Defect Charge Form */}
          {showDefectForm && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-3">
              <h3 className="font-semibold text-sm">Add Defect Charge (Optional)</h3>
              <p className="text-xs text-muted-foreground">
                Document any damages or missing items. Customer will be notified and charged separately.
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="defect-amount" className="text-sm">Amount (₹)</Label>
                  <Input
                    id="defect-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={defectAmount}
                    onChange={(e) => setDefectAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="defect-description" className="text-sm">Description</Label>
                  <Textarea
                    id="defect-description"
                    placeholder="Describe the defect or damage..."
                    value={defectDescription}
                    onChange={(e) => setDefectDescription(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {defectAmount && defectDescription.length >= 10
                    ? "✓ Ready to add defect charge"
                    : "Fill amount and description to add defect charge"}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 flex-wrap">
            {transitions.map(({ status: newStatus, label, icon: Icon }) => (
              <Button
                key={newStatus}
                size="sm"
                variant={newStatus === "cancelled" ? "destructive" : "default"}
                onClick={() => handleStatusUpdate(newStatus)}
                disabled={updatingStatus === newStatus}
                className="gap-1.5"
              >
                {updatingStatus === newStatus ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
                {showCancelInput && newStatus === "cancelled"
                  ? "Confirm Cancel"
                  : showDefectForm && newStatus === "completed"
                  ? defectAmount && defectDescription
                    ? "Complete with Defect Charge"
                    : "Complete without Defect Charge"
                  : label}
              </Button>
            ))}
            {showCancelInput && (
              <Button size="sm" variant="outline" onClick={() => { setShowCancelInput(false); setCancelReason(""); }}>
                Keep Order
              </Button>
            )}
            {showDefectForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowDefectForm(false);
                  setDefectAmount("");
                  setDefectDescription("");
                  setDefectImages([]);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
