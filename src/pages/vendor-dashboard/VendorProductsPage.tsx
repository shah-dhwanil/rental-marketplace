import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Package, Pencil, Trash2, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { ProductSummary } from "@/schemas/catalog.schema";

export function VendorProductsPage() {
  const { accessToken } = useAuthStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const PAGE_SIZE = 12;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    catalogService
      .listMyProducts(accessToken, { page, page_size: PAGE_SIZE, q: debouncedQ || undefined })
      .then((res) => {
        setProducts(res.items);
        setTotal(res.total);
      })
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  }, [accessToken, page, debouncedQ]);

  async function handleDelete(productId: string) {
    if (!accessToken) return;
    if (!confirm("Delete this product? This action cannot be undone.")) return;
    setDeleting(productId);
    try {
      await catalogService.deleteProduct(accessToken, productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setTotal((t) => t - 1);
    } catch {
      alert("Failed to delete product.");
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{total} total products</p>
        </div>
        <Link to="/vendor/dashboard/products/create">
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-4 space-y-3 animate-pulse">
              <div className="w-full h-32 rounded-lg bg-muted" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Products grid */}
      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="size-12 text-muted-foreground/30 mb-4" />
          <p className="font-medium">No products yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first product to start renting.
          </p>
          <Link to="/vendor/dashboard/products/create" className="mt-4">
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" /> Add Product
            </Button>
          </Link>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border border-border bg-background overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                {product.image_urls.length > 0 ? (
                  <img
                    src={product.image_urls[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="size-12 text-muted-foreground/20" />
                  </div>
                )}
                <Badge
                  className={`absolute top-2 right-2 text-xs ${
                    product.is_active
                      ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                  variant="outline"
                >
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Info */}
              <div className="p-3 flex-1 flex flex-col gap-2">
                <p className="font-medium text-sm leading-snug line-clamp-2">{product.name}</p>
                <p className="text-lg font-bold text-primary">₹{Number(product.price_day).toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/day</span></p>

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-border">
                  <Link to={`/vendor/dashboard/products/${product.id}/devices`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <Cpu className="size-3.5" />
                      Devices
                      {product.reserved_qty > 0 && (
                        <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                          {product.reserved_qty}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  <Link to={`/vendor/dashboard/products/${product.id}/edit`}>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <Pencil className="size-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-destructive hover:bg-destructive/10"
                    disabled={deleting === product.id}
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
