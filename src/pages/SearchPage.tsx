import { useLoaderData, useSearchParams, Link } from "react-router";
import { useState } from "react";
import { Heart, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const { products, query } = useLoaderData<typeof searchLoader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();
  const { startDate, endDate, getDays } = useRentalDatesStore();

  const [sortBy, setSortBy] = useState("relevance");
  const [searchQuery, setSearchQuery] = useState(query || "");

  const today = new Date().toISOString().split("T")[0];
  const oneWeekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const days = getDays() || 7;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchQuery });
  };

  const handleAddToCart = (product: any) => {
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.image_urls?.[0] || "",
      startDate: startDate || today,
      endDate: endDate || oneWeekLater,
      dailyRate: product.price_day,
      totalDays: days,
      deposit: product.security_deposit || 0,
      deliveryMethod: "pickup",
      deliveryFee: 0,
    });
    console.log("🛒 Added to cart:", product.name);
  };

  const sortedProducts = [...(products || [])].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return (a.price_day || 0) - (b.price_day || 0);
      case "price-desc":
        return (b.price_day || 0) - (a.price_day || 0);
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "relevance":
      default:
        return 0;
    }
  });

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Search Results</h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <Button type="submit" className="bg-primary hover:bg-purple-700 text-white font-semibold">
              Search
            </Button>
          </form>

          {/* Results Info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-slate-700 dark:text-slate-300">
                Found <span className="font-bold">{sortedProducts.length}</span> result{sortedProducts.length !== 1 ? "s" : ""}{query && ` for "${query}"`}
              </p>
            </div>
            <div className="flex gap-2">
              <label className="text-sm text-slate-600 dark:text-slate-400">Sort by:</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 border-slate-200 dark:border-slate-700">
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
        </div>

        {/* Products Grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <div key={product.id} className="group">
                <Card className="h-full shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                  {/* Image */}
                  <Link to={`/product/${product.id}`}>
                    <div className="aspect-[4/3] relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={product.image_urls?.[0] || "https://via.placeholder.com/300"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  </Link>

                  {/* Content */}
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
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-red-50"
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-current" : ""}`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">(0)</span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(product.price_day)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/day</span>
                    </div>

                    <Button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-primary hover:bg-purple-700 text-white font-semibold py-2 rounded-lg"
                    >
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">
              No products found{query && ` for "${query}"`}
            </p>
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
