import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { CheckCircle, XCircle, Loader2, FileText, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { getOrder, downloadOrderPdf } from "@/services/order.service";
import type { Order } from "@/schemas/order.schema";
import { ApiError } from "@/lib/api";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function OrderConfirmationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const orderId = params.get("order_id");

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"invoice" | "contract" | null>(null);

  async function handleDownload(type: "invoice" | "contract") {
    if (!accessToken || !order) return;
    setDownloading(type);
    try {
      await downloadOrderPdf(accessToken, order.id, type);
    } finally {
      setDownloading(null);
    }
  }

  useEffect(() => {
    if (!orderId || !accessToken) { navigate("/"); return; }

    getOrder(accessToken, orderId)
      .then((o) => {
        setOrder(o);
        setStatus(
          o.status === "confirmed" || o.status === "active" || o.status === "completed"
            ? "success"
            : "failed",
        );
        if (o.status === "pending_payment") {
          setError("Payment was not completed.");
        }
      })
      .catch((err) => {
        setStatus("failed");
        setError(err instanceof ApiError ? err.message : "Could not load order.");
      });
  }, [orderId, accessToken, navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Confirming your payment…</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="size-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Payment Failed</h1>
        <p className="text-muted-foreground">{error ?? "Your payment could not be processed."}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" asChild><Link to="/cart">Back to Cart</Link></Button>
          {orderId && (
            <Button onClick={() => navigate(`/checkout`)}>Try Again</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
      {/* Success header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto">
          <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground text-sm">
          Your rental order has been placed successfully. The vendor will be notified.
        </p>
      </div>

      {order && (
        <>
          {/* Order details */}
          <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-base">{order.product_name ?? "Order"}</p>
                <p className="text-muted-foreground text-xs">Order #{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                Confirmed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span>Rental Period</span>
              <span className="text-foreground">{formatDate(order.start_date)} — {formatDate(order.end_date)}</span>
              <span>Delivery By</span>
              <span className="text-foreground">{formatDate(order.delivery_date)}</span>
              <span>Return By</span>
              <span className="text-foreground">{formatDate(order.return_date)}</span>
              <span>Rental ({order.rental_days} days)</span>
              <span className="text-foreground">{formatCurrency(order.amount)}</span>
              {order.discount > 0 && <>
                <span>Discount</span>
                <span className="text-green-600">-{formatCurrency(order.discount)}</span>
              </>}
              <span>CGST + SGST</span>
              <span className="text-foreground">{formatCurrency(order.cgst_amount + order.sgst_amount)}</span>
              <span>Security Deposit</span>
              <span className="text-foreground">{formatCurrency(order.security_deposit)}</span>
            </div>

            <div className="border-t pt-2 flex justify-between font-semibold text-base">
              <span>Total Paid</span>
              <span>{formatCurrency(order.grand_total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Security deposit of {formatCurrency(order.security_deposit)} will be refunded after return.
            </p>
          </div>

          {/* PDF downloads */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="font-medium text-sm">Documents</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-1"
                onClick={() => handleDownload("invoice")}
                disabled={downloading === "invoice"}
              >
                <FileText className="size-3.5" />
                {downloading === "invoice" ? "Downloading…" : "Invoice PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-1"
                onClick={() => handleDownload("contract")}
                disabled={downloading === "contract"}
              >
                <FileText className="size-3.5" />
                {downloading === "contract" ? "Downloading…" : "Contract PDF"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">PDFs are downloaded directly to your device.</p>
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/orders">
            <ShoppingBag className="size-4 mr-1.5" />
            My Orders
          </Link>
        </Button>
        <Button className="flex-1" asChild>
          <Link to="/">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
