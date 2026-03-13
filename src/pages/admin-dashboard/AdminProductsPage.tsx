import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, Package, Pencil, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import * as catalogService from "@/services/catalog.service";
import type { ProductSummary, Category } from "@/schemas/catalog.schema";

export function AdminProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const PAGE_SIZE = 20;

  useEffect(() => {
    catalogService
      .listCategories({ page_size: 100 })
      .then((res) => setCategories(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(1); }, [debouncedQ, categoryFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    setError("");
    catalogService
      .listAllProducts({
        page,
        page_size: PAGE_SIZE,
        q: debouncedQ || undefined,
        category_id: categoryFilter || undefined,
        is_active: statusFilter === "" ? undefined : statusFilter === "true",
      })
      .then((res) => {
        setProducts(res.items);
        setTotal(res.total);
      })
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  }, [page, debouncedQ, categoryFilter, statusFilter]);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">{total} total products across all vendors</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <div className="flex gap-1.5">
          {(["", "true", "false"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === val
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-background text-muted-foreground border-border hover:border-violet-400 hover:text-foreground"
              }`}
            >
              {val === "" ? "All" : val === "true" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-background px-4 py-3 animate-pulse flex items-center gap-3">
              <div className="size-12 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-48" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
              <div className="h-5 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="size-12 text-muted-foreground/30 mb-4" />
          <p className="font-medium">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
        </div>
      )}

      {/* Product list */}
      {!loading && products.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
              {/* Image */}
              <div className="size-12 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                {product.image_urls.length > 0 ? (
                  <img
                    src={product.image_urls[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="size-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {categoryMap[product.category_id] ?? "Unknown category"}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs font-medium text-primary">
                    ₹{Number(product.price_day).toFixed(0)}/day
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    product.is_active
                      ? "border-green-300 text-green-700 dark:text-green-400"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
                {product.reserved_qty > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {product.reserved_qty} reserved
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Link to={`/admin/dashboard/products/${product.id}/devices`}>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" title="Manage devices">
                    <Cpu className="size-3.5" />
                  </Button>
                </Link>
                <Link to={`/admin/dashboard/products/${product.id}`}>
                  <Button variant="ghost" size="icon" className="size-8" title="Edit product">
                    <Pencil className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
