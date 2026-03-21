import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, MapPin, Package, ChevronRight, Loader2, AlertCircle, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { createOrder, confirmPayment } from "@/services/order.service";
import { validatePromo } from "@/services/promo.service";
import { calculatePrice } from "@/services/catalog.service";
import { listAddresses, type Address } from "@/services/address.service";
import type { PromoValidationResult } from "@/schemas/promo.schema";
import { ApiError } from "@/lib/api";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items } = useCartStore();
  const { accessToken, isAuthenticated } = useAuthStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [addressLoading, setAddressLoading] = useState(false);

  const [priceCalc, setPriceCalc] = useState<{ rental: number; deposit: number; days: number } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login/customer"); return; }
    if (items.length === 0) { navigate("/cart"); return; }
  }, [isAuthenticated, items.length, navigate]);

  useEffect(() => {
    if (!accessToken) return;
    setAddressLoading(true);
    listAddresses(accessToken)
      .then((data) => {
        setAddresses(data);
        if (data.length > 0) setSelectedAddressId(data[0].id);
      })
      .catch(() => {/* silently ignore */})
      .finally(() => setAddressLoading(false));
  }, [accessToken]);

  const item = items[0];

  // Fetch price from API when item changes
  useEffect(() => {
    if (!item) return;
    setPriceLoading(true);
    calculatePrice(item.productId, item.startDate, item.endDate)
      .then((calc) => {
        setPriceCalc({
          rental: calc.rental_amount,
          deposit: calc.security_deposit,
          days: calc.rental_days,
        });
      })
      .catch(() => setPriceCalc(null))
      .finally(() => setPriceLoading(false));
  }, [item?.productId, item?.startDate, item?.endDate]);

  if (!item) return null;

  const deliveryType = item.deliveryMethod === "pickup" ? "pickup" : "home_delivery";
  const deliveryDate = item.startDate;
  const returnDate = addDays(item.endDate, 1);

  const baseRental = priceCalc?.rental ?? item.dailyRate * item.totalDays;
  const deposit = priceCalc?.deposit ?? item.deposit;
  const discount = promoResult?.discount_amount ?? 0;
  const netRental = baseRental - discount;
  const estimatedGst = netRental * 0.18;
  const estimatedTotal = netRental + estimatedGst + deposit;

  async function handleApplyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoResult(null);
    try {
      const result = await validatePromo(code, item.productId, baseRental);
      setPromoResult(result);
    } catch (err) {
      setPromoError(err instanceof ApiError ? err.message : "Failed to apply promo code.");
    } finally {
      setPromoLoading(false);
    }
  }

  async function handlePlaceOrder() {
    if (!accessToken || !selectedAddressId) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      const res = await createOrder(accessToken, {
        product_id: item.productId,
        address_id: selectedAddressId,
        start_date: item.startDate,
        end_date: item.endDate,
        delivery_date: deliveryDate,
        return_date: returnDate,
        delivery_type: deliveryType,
        promo_code: promoResult ? promoCode.trim().toUpperCase() : undefined,
      });

      // Validate response has required fields
      if (!res.client_secret) {
        throw new Error("Payment initialization failed. Please try again.");
      }

      // Navigate to payment page
      // Item will be removed from cart after successful payment
      navigate(`/payment?order_id=${res.order.id}&client_secret=${res.client_secret}&product_id=${item.productId}`);
    } catch (err) {
      setPlaceError(err instanceof ApiError ? err.message : "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/cart")} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-xl font-bold">Checkout</h1>
      </div>

      {placeError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {placeError}
        </div>
      )}

      {/* Product summary */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Package className="size-4 text-primary" /> Rental Item
        </h2>
        <div className="flex gap-3">
          {item.productImage && (
            <img src={item.productImage} alt={item.productName} className="w-16 h-16 rounded-lg object-cover shrink-0" />
          )}
          <div className="space-y-1 min-w-0">
            <p className="font-medium text-sm">{item.productName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(item.startDate)} — {formatDate(item.endDate)} ({priceCalc?.days ?? item.totalDays} day{(priceCalc?.days ?? item.totalDays) !== 1 ? "s" : ""})
            </p>
            <p className="text-xs text-muted-foreground">
              Delivery: {deliveryType === "pickup" ? "Self Pickup" : "Home Delivery"} &nbsp;|&nbsp;
              By: {formatDate(deliveryDate)} &nbsp;|&nbsp; Return by: {formatDate(returnDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <MapPin className="size-4 text-primary" /> Delivery Address
        </h2>
        {addressLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading addresses…
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>No saved addresses found.</p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/profile/addresses">Add a Delivery Address</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <label key={addr.id} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="address"
                  value={addr.id}
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="mt-1 accent-primary"
                />
                <div className="text-sm">
                  <p className="font-medium">{addr.name} · {addr.person_name}</p>
                  <p className="text-muted-foreground">{addr.address}, {addr.city} — {addr.pincode}</p>
                  <p className="text-muted-foreground">{addr.contact_no}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Promo code */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Tag className="size-4 text-primary" /> Promo Code
        </h2>
        {promoResult ? (
          <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">{promoResult.code}</p>
              <p className="text-xs text-green-600 dark:text-green-400">-{formatCurrency(promoResult.discount_amount)} saved</p>
            </div>
            <button onClick={() => { setPromoResult(null); setPromoCode(""); }} className="text-muted-foreground hover:text-destructive">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
              className="uppercase placeholder:normal-case text-sm h-9"
            />
            <Button size="sm" variant="outline" onClick={handleApplyPromo} disabled={promoLoading || !promoCode.trim()} className="h-9 shrink-0">
              {promoLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
            </Button>
          </div>
        )}
        {promoError && <p className="text-xs text-destructive">{promoError}</p>}
      </div>

      {/* Estimated pricing */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-2 text-sm">
        <h2 className="font-semibold mb-2">Order Summary</h2>
        {priceLoading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" />
            Calculating price...
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rental</span>
              <span>{formatCurrency(baseRental)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Promo Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>GST (18%)</span>
              <span>~{formatCurrency(estimatedGst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Security Deposit</span>
              <span>{formatCurrency(deposit)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-base">
              <span>Grand Total (est.)</span>
              <span>{formatCurrency(estimatedTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Exact amount calculated at order placement.</p>
          </>
        )}
      </div>

      {/* Place order */}
      <Button
        className="w-full"
        size="lg"
        onClick={handlePlaceOrder}
        disabled={placing || !selectedAddressId || addressLoading || priceLoading}
      >
        {placing ? (
          <><Loader2 className="size-4 animate-spin mr-2" />Placing Order…</>
        ) : (
          <>Place Order <ChevronRight className="size-4 ml-1" /></>
        )}
      </Button>

      {items.length > 1 && (
        <p className="text-xs text-center text-muted-foreground">
          Only the first item will be processed. You can checkout remaining items separately.
        </p>
      )}
    </div>
  );
}
