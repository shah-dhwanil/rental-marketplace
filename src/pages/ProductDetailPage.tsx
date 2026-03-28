import { useLoaderData, Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Heart, AlertCircle, ChevronDown, ChevronUp, Phone, MapPin, User, X, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { productDetailLoader } from "@/loaders";
import { useWishlistStore, useRentalDatesStore } from "@/stores";
import { getVendorPublicProfile, type VendorPublicProfile, calculatePrice, type PriceCalculation } from "@/services/catalog.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductDetailPage() {
  const { product, reviews, reviewStats } = useLoaderData<typeof productDetailLoader>();
  const navigate = useNavigate();

  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { startDate, endDate, setStartDate, setEndDate, getDays } = useRentalDatesStore();

  const [expandedDevices, setExpandedDevices] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [vendor, setVendor] = useState<VendorPublicProfile | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);

  const [priceCalc, setPriceCalc] = useState<PriceCalculation | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Derive a default date range if store is empty
  const today = new Date().toISOString().split("T")[0];
  const oneWeekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const effectiveStart = startDate || today;
  const effectiveEnd = endDate || oneWeekLater;

  // Fetch vendor info on mount
  useEffect(() => {
    if (!product.vendor_id) return;
    setVendorLoading(true);
    getVendorPublicProfile(product.vendor_id)
      .then(setVendor)
      .catch(() => setVendor(null))
      .finally(() => setVendorLoading(false));
  }, [product.vendor_id]);

  // Fetch price calculation when dates change
  useEffect(() => {
    if (!product.id || !effectiveStart || !effectiveEnd) return;
    setPriceLoading(true);
    calculatePrice(product.id, effectiveStart, effectiveEnd)
      .then(setPriceCalc)
      .catch(() => setPriceCalc(null))
      .finally(() => setPriceLoading(false));
  }, [product.id, effectiveStart, effectiveEnd]);

  // Pricing from API or fallback to daily rate
  const days = getDays() || 7;
  const rentalCost = priceCalc?.rental_amount ?? (product.price_day ?? 0) * days;
  const deposit = product.security_deposit ?? 0;
  const totalCost = rentalCost + deposit;
  const pricingLabel = priceCalc?.pricing_tier ? priceCalc.pricing_tier.charAt(0).toUpperCase() + priceCalc.pricing_tier.slice(1) : "Daily";
  const pricingBreakdown = priceCalc?.breakdown ?? `${days}d × ₹${product.price_day ?? 0}`;

  const handleBookNow = () => {
    // Navigate to checkout with rental details as URL parameters
    const params = new URLSearchParams({
      product_id: product.id,
      start_date: effectiveStart,
      end_date: effectiveEnd,
      delivery_method: "pickup",
    });
    navigate(`/checkout?${params.toString()}`);
  };

  const images = product.image_urls ?? [];

  // Product properties (JSONB → readable key-value pairs)
  const properties = product.properties as Record<string, unknown> | undefined;
  const propertyEntries = properties ? Object.entries(properties).filter(([, v]) => v !== null && v !== "") : [];
  const totalReviews = reviewStats?.total_reviews ?? reviews.length;
  const avgRating = reviewStats?.average_rating ?? 0;
  const fullStars = Math.floor(avgRating);
  const hasHalfStar = avgRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to={`/category/${product.category_id}`} className="hover:text-primary">Category</Link>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-300 line-clamp-1">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: Images + Details ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Image Carousel */}
            {images.length > 0 ? (
              <>
                <Carousel className="w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
                  <CarouselContent>
                    {images.map((img, i) => (
                      <CarouselItem key={i}>
                        <div className="aspect-square">
                          <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {images.length > 1 && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>

                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.slice(0, 4).map((img, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-75 transition">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                <span className="text-slate-400">No images available</span>
              </div>
            )}

            {/* Product Info */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-6 space-y-4">
                <div>
                  <Badge className="mb-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    {product.is_active ? "Available" : "Unavailable"}
                  </Badge>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">{product.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-0.5 text-amber-400" aria-label={`Rated ${avgRating.toFixed(1)} out of 5`}>
                      {Array.from({ length: fullStars }).map((_, i) => (
                        <Star key={`filled-${i}`} className="h-4 w-4 fill-current" />
                      ))}
                      {hasHalfStar && <Star key="half" className="h-4 w-4 fill-current opacity-60" />}
                      {Array.from({ length: emptyStars }).map((_, i) => (
                        <Star key={`empty-${i}`} className="h-4 w-4" />
                      ))}
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{avgRating.toFixed(1)}</span>
                    <span>({totalReviews} review{totalReviews !== 1 ? "s" : ""})</span>
                    {product.reserved_qty > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {product.reserved_qty} units rented
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Description</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{product.description}</p>
                  </div>
                )}

                {/* Properties (specs table) */}
                {propertyEntries.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Specifications</h3>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {propertyEntries.map(([key, val], i) => (
                            <tr
                              key={key}
                              className={`${i % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/50" : "bg-white dark:bg-slate-900"}`}
                            >
                              <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 capitalize w-40">
                                {key.replace(/_/g, " ")}
                              </td>
                              <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                {String(val)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pricing info summary */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Per Day</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{formatINR(product.price_day ?? 0)}</p>
                  </div>
                  {(product.price_week ?? 0) > 0 && (
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Per Week</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{formatINR(product.price_week ?? 0)}</p>
                    </div>
                  )}
                  {(product.price_month ?? 0) > 0 && (
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Per Month</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{formatINR(product.price_month ?? 0)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Devices Section */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <button
                  onClick={() => setExpandedDevices(!expandedDevices)}
                  className="flex items-center justify-between w-full"
                >
                  <CardTitle className="text-base">
                    Available Devices
                    {product.devices && (
                      <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                        ({product.devices.length} unit{product.devices.length !== 1 ? "s" : ""})
                      </span>
                    )}
                  </CardTitle>
                  {expandedDevices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CardHeader>
              {expandedDevices && (
                <CardContent className="pt-0 space-y-2">
                  {product.devices && product.devices.length > 0 ? (
                    product.devices.map((device: any, i: number) => (
                      <div key={device.id || i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                            Unit {i + 1}{device.serial_no ? ` — ${device.serial_no}` : ""}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            Condition: {device.condition || "good"}
                          </p>
                          {device.properties && Object.keys(device.properties).length > 0 && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {Object.entries(device.properties).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                            </p>
                          )}
                        </div>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                          Available
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No device details available</p>
                  )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* ── Right: Pricing & Vendor ────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Pricing / Order Card */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 sticky top-4">
              <CardContent className="p-6 space-y-5">
                {/* Price Headline */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">
                      {formatINR(product.price_day ?? 0)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">/day</span>
                  </div>
                  {(product.price_week ?? 0) > 0 && (
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium mt-0.5">
                      {formatINR(product.price_week ?? 0)}/week · {formatINR(product.price_month ?? 0)}/month
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700" />

                {/* Date Picker Toggle */}
                <div>
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-medium"
                  >
                    <span>
                      {effectiveStart && effectiveEnd
                        ? `${effectiveStart} → ${effectiveEnd}`
                        : "Select rental dates"}
                    </span>
                    <span className="text-primary dark:text-purple-400 text-xs">{days} day{days !== 1 ? "s" : ""}</span>
                  </button>

                  {showDatePicker && (
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Start Date</label>
                        <Input
                          type="date"
                          value={startDate || today}
                          min={today}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">End Date</label>
                        <Input
                          type="date"
                          value={endDate || oneWeekLater}
                          min={startDate || today}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700" />

                {/* Cost Breakdown */}
                <div className="space-y-2 text-sm">
                  {priceLoading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Calculating price...
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Rental ({pricingLabel} plan) — {pricingBreakdown}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{formatINR(rentalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Security Deposit</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{formatINR(deposit)}</span>
                      </div>
                      {(product.defect_charge ?? 0) > 0 && (
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Damage charge (if any)</span>
                          <span>{formatINR(product.defect_charge ?? 0)}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span className="text-primary dark:text-purple-400">{formatINR(totalCost)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <Button
                    onClick={handleBookNow}
                    className="w-full bg-primary hover:bg-purple-700 text-white py-3 font-bold text-base"
                    disabled={priceLoading}
                  >
                    {priceLoading ? "Calculating..." : "Proceed to Checkout"}
                  </Button>
                  <Button
                    onClick={() => toggleWishlist(product.id)}
                    variant="outline"
                    className="w-full border-slate-200 dark:border-slate-700"
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isInWishlist(product.id) ? "fill-red-500 text-red-500" : ""}`} />
                    {isInWishlist(product.id) ? "Saved to Wishlist" : "Add to Wishlist"}
                  </Button>
                </div>

                {/* Protection notice */}
                <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    <span className="font-semibold">Rental Protection</span> — All rentals are covered against accidental damage.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Card */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Listed by Vendor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendorLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                ) : vendor ? (
                  <>
                    <div className="flex items-center gap-3">
                      {vendor.profile_photo_url ? (
                        <img
                          src={vendor.profile_photo_url}
                          alt={vendor.name}
                          className="h-12 w-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {vendor.vendor_name || vendor.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{vendor.name}</p>
                      </div>
                    </div>

                    {(vendor.address || vendor.city) && (
                      <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>
                          {[vendor.address, vendor.city, vendor.pincode].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}

                    <Button
                      onClick={() => setShowContact(true)}
                      variant="outline"
                      className="w-full border-primary text-primary hover:bg-primary/10 dark:border-purple-400 dark:text-purple-400"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Contact Vendor
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Vendor info unavailable</p>
                )}
              </CardContent>
            </Card>

            {/* Trust badges */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-0">
              <CardContent className="p-4 space-y-2.5">
                {[
                  { icon: "✅", label: "Verified Vendor" },
                  { icon: "🛡", label: "Damage Protection" },
                  { icon: "📦", label: "Pickup & Delivery" },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-base">{icon}</span>
                    {label}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews placeholder */}
        <Card className="mt-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Customer Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {review.customer_name || "Verified Customer"}
                        </p>
                        {review.is_verified && (
                          <Badge variant="outline" className="text-xs">Verified</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? "fill-current" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{review.comment}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {new Date(review.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {review.vendor_response && (
                      <div className="mt-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Vendor Response</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{review.vendor_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Contact Modal ──────────────────────────────────────────────────── */}
      {showContact && vendor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowContact(false)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Vendor Contact</h2>
              <button onClick={() => setShowContact(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-4">
              {vendor.profile_photo_url ? (
                <img
                  src={vendor.profile_photo_url}
                  alt={vendor.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {vendor.vendor_name || vendor.name}
                </p>
                {vendor.vendor_name && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Owner: {vendor.name}</p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center gap-3 py-2">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mobile / Phone</p>
                  <a
                    href={`tel:${vendor.mobile_no}`}
                    className="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary"
                  >
                    {vendor.mobile_no}
                  </a>
                </div>
              </div>

              {(vendor.address || vendor.city) && (
                <div className="flex items-start gap-3 py-2">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Address</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {[vendor.address, vendor.city, vendor.pincode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button
              as="a"
              href={`tel:${vendor.mobile_no}`}
              className="w-full bg-primary hover:bg-purple-700 text-white font-bold"
              onClick={() => setShowContact(false)}
            >
              <Phone className="h-4 w-4 mr-2" /> Call Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
