import { useLoaderData, useSearchParams, Link } from "react-router";
import { useState } from "react";
import { Heart, Search as SearchIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { searchLoader } from "@/loaders";
import { useWishlistStore, useCartStore, useRentalDatesStore } from "@/stores";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function SearchPage() {
  const loaderData = useLoaderData<typeof searchLoader>();
  const { products, categories, total, page, pages, query: loaderQuery } = loaderData;
  const [, setSearchParams] = useSearchParams();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();
  const { startDate: storeStart, endDate: storeEnd, getDays } = useRentalDatesStore();
  const [sortBy, setSortBy] = useState("relevance");

  const today = new Date().toISOString().split("T")[0];
  const days = getDays() || 7;
  const cartStartDate = storeStart || today;
  const cartEndDate = storeEnd || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // Build current URL params object (preserve all active params)
  const currentParams = () => {
    const p: Record<string, string> = {};
    if (loaderQuery) p.q = loaderQuery;
    if (loaderData.categoryId) p.category_id = loaderData.categoryId;
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
      startDate: cartStartDate,
      endDate: cartEndDate,
      dailyRate: product.price_day,
      totalDays: days,
      deposit: product.security_deposit || 0,
      deliveryMethod: "pickup",
      deliveryFee: 0,
    });
  };

  const sortedProducts = [...(products || [])].sort((a, b) => {
    switch (sortBy) {
      case "price-asc": return (a.price_day || 0) - (b.price_day || 0);
      case "price-desc": return (b.price_day || 0) - (a.price_day || 0);
      case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default: return 0;
    }
  });

  const categoryName = categories.find((c) => c.id === loaderData.categoryId)?.name;

  // Active filter pills
  type Pill = { label: string; keys: string[] };
  const pills: Pill[] = [];
  if (categoryName) pills.push({ label: `Category: ${categoryName}`, keys: ["category_id"] });
  if (loaderData.startDate && loaderData.endDate)
    pills.push({ label: `${loaderData.startDate} → ${loaderData.endDate}`, keys: ["start_date", "end_date"] });
  if (loaderData.lat !== undefined)
    pills.push({ label: `Within 20 km of ${loaderData.pincode || "location"}`, keys: ["lat", "lng", "pincode"] });

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-6">
      <div className="container mx-auto px-4">
        {/* Results bar */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              <span className="font-bold text-slate-900 dark:text-slate-100">{total}</span>{" "}
              result{total !== 1 ? "s" : ""}
              {loaderQuery && (
                <> for <span className="font-semibold">"{loaderQuery}"</span></>
              )}
            </p>
            {pills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
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
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">Sort:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 border-slate-200 dark:border-slate-700 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        {sortedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
              {sortedProducts.map((product) => (
                <div key={product.id} className="group">
                  <Card className="h-full shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                    <Link to={`/product/${product.id}`}>
                      <div className="aspect-[4/3] relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={
                            product.image_urls?.[0] ||
                            "https://placehold.co/300x225/e2e8f0/94a3b8?text=No+Image"
                          }
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                    </Link>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/product/${product.id}`}>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-primary dark:group-hover:text-purple-400 transition-colors text-sm">
                            {product.name}
                          </h3>
                        </Link>
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className={`p-1.5 rounded-full flex-shrink-0 transition-all ${
                            isInWishlist(product.id)
                              ? "bg-red-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-red-50"
                          }`}
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${isInWishlist(product.id) ? "fill-current" : ""}`}
                          />
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
                        className="w-full bg-primary hover:bg-purple-700 text-white font-semibold py-1.5 rounded-lg text-sm"
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
          <div className="text-center py-16">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-2">
              No products found{loaderQuery && ` for "${loaderQuery}"`}
            </p>
            {pills.length > 0 && (
              <p className="text-slate-500 dark:text-slate-500 text-sm mb-4">
                Try adjusting the filters in the search bar above — dates, location, or category.
              </p>
            )}
            <Link to="/">
              <Button className="bg-primary hover:bg-purple-700 text-white font-semibold">
                Browse All Products
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
