import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Elements } from "@stripe/react-stripe-js";
import { CreditCard, Loader2, AlertCircle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth.store";
import { getOrder } from "@/services/order.service";
import type { Order } from "@/schemas/order.schema";
import { ApiError } from "@/lib/api";
import { getStripe } from "@/lib/stripe";
import { StripePaymentForm } from "@/components/payment/StripePaymentForm";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function PaymentPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const orderId = params.get("order_id");
  const clientSecret = params.get("client_secret");
  const productId = params.get("product_id");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !accessToken || !clientSecret) {
      navigate("/");
      return;
    }

    getOrder(accessToken, orderId)
      .then((o) => {
        setOrder(o);
        if (o.status !== "pending_payment") {
          // Already confirmed, redirect to confirmation page
          navigate(`/orders/confirmation?order_id=${o.id}`);
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load order.");
      })
      .finally(() => setLoading(false));
  }, [orderId, accessToken, clientSecret, navigate]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading payment details…</p>
      </div>
    );
  }

  if (error || !order || !clientSecret) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="size-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Error Loading Payment</h1>
        <p className="text-muted-foreground">{error ?? "Could not load payment details."}</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Go Home
        </button>
      </div>
    );
  }

  const stripePromise = getStripe();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CreditCard className="size-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Complete Your Payment</h1>
        <p className="text-muted-foreground text-sm">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Product</span>
            <span className="font-medium">{order.product_name ?? "Rental Item"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rental Period</span>
            <span>{formatDate(order.start_date)} — {formatDate(order.end_date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rental ({order.rental_days} days)</span>
            <span>{formatCurrency(order.amount)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">CGST + SGST</span>
            <span>{formatCurrency(order.cgst_amount + order.sgst_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Security Deposit</span>
            <span>{formatCurrency(order.security_deposit)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Total Amount</span>
            <span className="text-primary">{formatCurrency(order.grand_total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="size-4" />
            Secure Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#7c3aed",
                  colorBackground: "#ffffff",
                  colorText: "#1e293b",
                  colorDanger: "#ef4444",
                  fontFamily: "system-ui, sans-serif",
                  borderRadius: "8px",
                },
              },
            }}
          >
            <StripePaymentForm orderId={orderId!} amount={order.grand_total} productId={productId ?? undefined} />
          </Elements>
        </CardContent>
      </Card>

      {/* Security Badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Lock className="size-3" />
          <span>Secure SSL</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <span>💳</span>
          <span>Stripe Powered</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <span>✅</span>
          <span>PCI Compliant</span>
        </div>
      </div>
    </div>
  );
}
