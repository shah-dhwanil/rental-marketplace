import { useLoaderData, Link, useSearchParams } from "react-router";
import { useState } from "react";
import { Heart, ChevronDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { categoryLoader } from "@/loaders";
import { useWishlistStore, useCartStore, useRentalDatesStore } from "@/stores";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function CategoryPage() {
  const loaderData = useLoaderData<typeof categoryLoader>();
  const { category, products, total, page, pages } = loaderData;
  const [, setSearchParams] = useSearchParams();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();
  const { startDate, endDate, getDays } = useRentalDatesStore();

  const [sortBy, setSortBy] = useState("newest");
  const [filterOpen, setFilterOpen] = useState(true);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 5000 });

  const today = new Date().toISOString().split("T")[0];
  const days = getDays() || 7;

  const handleAddToCart = (product: {
    id: string;
    name: string;
    image_urls?: string[];
    price_day: number;
    security_deposit?: number;
  }) => {
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.image_urls?.[0] || "",
      startDate: startDate || today,
      endDate: endDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      dailyRate: product.price_day,
      totalDays: days,
      deposit: product.security_deposit || 0,
      deliveryMethod: "pickup",
      deliveryFee: 0,
    });
  };

  // Build current URL params for filter removal / pagination
  const currentParams = () => {
    const p: Record<string, string> = {};
    if (loaderData.startDate) p.start_date = loaderData.startDate;
    if (loaderData.endDate) p.end_date = loaderData.endDate;
    if (loaderData.lat !== undefined) p.lat = String(loaderData.lat);
    if (loaderData.lng !== undefined) p.lng = String(loaderData.lng);
    if (loaderData.pincode) p.pincode = loaderData.pincode;
    return p;
  };

  const removeFilter = (keys: string[]) => {
    const p = currentParams();
    keys.forEach((k) => delete p[k]);
    setSearchParams(p);
  };

  const handlePageChange = (newPage: number) => {
    const p = currentParams();
    p.page = String(newPage);
    setSearchParams(p);
  };

  const sortedProducts = [...(products || [])].sort((a, b) => {
    switch (sortBy) {
      case "price-asc": return (a.price_day || 0) - (b.price_day || 0);
      case "price-desc": return (b.price_day || 0) - (a.price_day || 0);
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const filteredProducts = sortedProducts.filter(
    (p) => (p.price_day || 0) >= priceRange.min && (p.price_day || 0) <= priceRange.max,
  );

  // Active filter pills
  type Pill = { label: string; keys: string[] };
  const pills: Pill[] = [];
  if (loaderData.startDate && loaderData.endDate)
    pills.push({ label: `${loaderData.startDate} → ${loaderData.endDate}`, keys: ["start_date", "end_date"] });
  if (loaderData.lat !== undefined)
    pills.push({ label: `Within 20 km of ${loaderData.pincode || "location"}`, keys: ["lat", "lng", "pincode"] });

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300">{category?.name}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">{category?.name}</h1>
              {category?.description && (
                <p className="text-slate-600 dark:text-slate-400">{category.description}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-slate-100">{total}</span> item{total !== 1 ? "s" : ""}
              </p>
              {pills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 justify-end">
                  {pills.map((pill) => (
                    <span
                      key={pill.keys[0]}
                      className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-primary dark:text-purple-300 text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {pill.label}
                      <button
                        onClick={() => removeFilter(pill.keys)}
                        className="hover:text-red-500 transition-colors"
                        aria-label={`Remove ${pill.label} filter`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4 space-y-4">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center justify-between w-full lg:hidden p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <span className="font-semibold">Filters</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>

              {filterOpen && (
                <div className="space-y-6 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Sort By</h3>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="border-slate-200 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                        <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                      Price Range (per day)
                    </h3>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Up to {formatINR(priceRange.max)}
                      </p>
                      <input
                        type="range" min="0" max="5000" step="100"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange((prev) => ({ ...prev, max: +e.target.value }))}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="group">
                      <Card className="h-full shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                        <Link to={`/product/${product.id}`}>
                          <div className="aspect-[4/3] relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <img
                              src={product.image_urls?.[0] || "https://placehold.co/300x225/e2e8f0/94a3b8?text=No+Image"}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          </div>
                        </Link>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <Link to={`/product/${product.id}`}>
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-primary dark:group-hover:text-purple-400 transition-colors">
                                {product.name}
                              </h3>
                            </Link>
                            <button
                              onClick={() => toggleWishlist(product.id)}
                              className={`p-2 rounded-full flex-shrink-0 transition-all ${
                                isInWishlist(product.id)
                                  ? "bg-red-500 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 hover:bg-red-50"
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
                            </button>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                              {formatINR(product.price_day)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">/day</span>
                          </div>
                          <Button
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-primary hover:bg-purple-700 text-white font-semibold"
                          >
                            Add to Cart
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="dark:border-slate-700 dark:text-slate-300"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Page {page} of {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= pages}
                      className="dark:border-slate-700 dark:text-slate-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  No products found{pills.length > 0 ? " for the selected filters" : ""}.
                </p>
                <div className="flex flex-col items-center gap-3">
                  {priceRange.max < 5000 && (
                    <Button variant="outline" onClick={() => setPriceRange({ min: 0, max: 5000 })}>
                      Reset Price Filter
                    </Button>
                  )}
                  {pills.length > 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Try adjusting the dates or location in the search bar above.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
