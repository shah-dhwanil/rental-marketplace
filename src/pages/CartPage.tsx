import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ShoppingCart, Trash2, Tag, ChevronRight, ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { validatePromo } from "@/services/promo.service";
import type { PromoValidationResult } from "@/schemas/promo.schema";
import { ApiError } from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CartPage() {
  const { items, removeFromCart, getSubtotal, getTotalDeposit } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const subtotal = getSubtotal();
  const deposit = getTotalDeposit();
  const deliveryFee = items.reduce((s, i) => s + i.deliveryFee, 0);
  const discount = promoResult?.discount_amount ?? 0;
  const total = subtotal + deposit + deliveryFee - discount;

  // Only validate promo against the first product for simplicity
  async function handleApplyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoResult(null);
    try {
      const firstItem = items[0];
      if (!firstItem) {
        setPromoError("Add items to cart before applying a promo code.");
        return;
      }
      const result = await validatePromo(code, firstItem.productId, subtotal);
      setPromoResult(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setPromoError(err.message);
      } else {
        setPromoError("Failed to apply promo code. Please try again.");
      }
    } finally {
      setPromoLoading(false);
    }
  }

  function handleRemovePromo() {
    setPromoResult(null);
    setPromoCode("");
    setPromoError(null);
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <ShoppingCart className="size-9 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm">Browse products and add them to your cart.</p>
        </div>
        <Button asChild>
          <Link to="/">Explore Rentals</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-2xl font-bold">Cart</h1>
        <span className="text-sm text-muted-foreground font-medium">({items.length} item{items.length !== 1 ? "s" : ""})</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex gap-4 rounded-xl border border-border bg-background p-4 shadow-sm">
              {/* Product image */}
              <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
                {item.productImage ? (
                  <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="size-7 text-muted-foreground" />
                  </div>
                )}
              </div>
              {/* Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-semibold text-sm truncate">{item.productName}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.startDate)} — {formatDate(item.endDate)} · {item.totalDays} day{item.totalDays !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.dailyRate)}/day
                  {item.deposit > 0 && ` · ${formatCurrency(item.deposit)} deposit`}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {formatCurrency(item.dailyRate * item.totalDays)}
                </p>
              </div>
              {/* Remove */}
              <button
                onClick={() => removeFromCart(item.productId)}
                className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                aria-label="Remove item"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Right: Order summary */}
        <div className="space-y-4">
          {/* Promo code */}
          <div className="rounded-xl border border-border bg-background p-4 shadow-sm space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              Promo Code
            </h3>
            {promoResult ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-3 py-2 dark:bg-green-950/20 dark:border-green-800">
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">{promoResult.code}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      -{formatCurrency(promoResult.discount_amount)} saved
                    </p>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                  className="flex-1 uppercase placeholder:normal-case text-sm h-9"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCode.trim()}
                  className="h-9 shrink-0"
                >
                  {promoLoading ? "..." : "Apply"}
                </Button>
              </div>
            )}
            {promoError && (
              <p className="text-xs text-destructive">{promoError}</p>
            )}
          </div>

          {/* Order summary */}
          <div className="rounded-xl border border-border bg-background p-4 shadow-sm space-y-3">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rental ({items.length} item{items.length !== 1 ? "s" : ""})</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {deposit > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Security Deposit</span>
                  <span>{formatCurrency(deposit)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Promo Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {deposit > 0 && (
                <p className="text-xs text-muted-foreground">
                  Deposit of {formatCurrency(deposit)} is refundable after return.
                </p>
              )}
            </div>
          </div>

          {/* Checkout button */}
          {isAuthenticated ? (
            <Button className="w-full" size="lg" onClick={() => navigate("/checkout")}>
              Proceed to Checkout
              <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button className="w-full" size="lg" asChild>
              <Link to="/login/customer">Login to Checkout</Link>
            </Button>
          )}

          <Button variant="outline" className="w-full" size="sm" asChild>
            <Link to="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
