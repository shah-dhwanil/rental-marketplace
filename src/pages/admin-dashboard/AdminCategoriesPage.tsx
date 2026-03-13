import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Plus, Search, FolderTree, Pencil, Trash2, Image, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { Category } from "@/schemas/catalog.schema";

export function AdminCategoriesPage() {
  const { accessToken } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [removingImage, setRemovingImage] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(1); }, [debouncedQ]);

  useEffect(() => {
    setLoading(true);
    setError("");
    catalogService
      .listCategories({ page, page_size: PAGE_SIZE, q: debouncedQ || undefined })
      .then((res) => {
        setCategories(res.items);
        setTotal(res.total);
      })
      .catch(() => setError("Failed to load categories."))
      .finally(() => setLoading(false));
  }, [page, debouncedQ]);

  async function handleDelete(categoryId: string) {
    if (!accessToken) return;
    if (!confirm("Delete this category? This cannot be undone.")) return;
    setDeleting(categoryId);
    try {
      await catalogService.deleteCategory(accessToken, categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setTotal((t) => t - 1);
    } catch {
      alert("Failed to delete category.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleImageUpload(categoryId: string, file: File) {
    if (!accessToken) return;
    setUploadingImage(categoryId);
    try {
      const result = await catalogService.uploadCategoryImage(accessToken, categoryId, file);
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, image_url: result.image_url } : c)),
      );
    } catch {
      alert("Failed to upload image.");
    } finally {
      setUploadingImage(null);
    }
  }

  async function handleRemoveImage(categoryId: string) {
    if (!accessToken) return;
    if (!confirm("Remove this category image?")) return;
    setRemovingImage(categoryId);
    try {
      await catalogService.deleteCategoryImage(accessToken, categoryId);
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, image_url: null } : c)),
      );
    } catch {
      alert("Failed to remove image.");
    } finally {
      setRemovingImage(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">{total} total categories</p>
        </div>
        <Link to="/admin/dashboard/categories/create">
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
            <Plus className="size-4" /> Add Category
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search categories…"
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-3 animate-pulse flex items-center gap-3">
              <div className="size-12 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderTree className="size-12 text-muted-foreground/30 mb-4" />
          <p className="font-medium">No categories yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create the first category to get started.</p>
          <Link to="/admin/dashboard/categories/create" className="mt-4">
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              <Plus className="size-4" /> Add Category
            </Button>
          </Link>
        </div>
      )}

      {/* Category list */}
      {!loading && categories.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
              {/* Image */}
              <div className="size-12 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <FolderTree className="size-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                {cat.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{cat.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Image upload */}
                <label
                  className="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title={cat.image_url ? "Replace image" : "Upload image"}
                >
                  <Image className="size-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingImage === cat.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(cat.id, file);
                      e.target.value = "";
                    }}
                  />
                </label>

                {cat.image_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-amber-600"
                    disabled={removingImage === cat.id}
                    onClick={() => handleRemoveImage(cat.id)}
                    title="Remove image"
                  >
                    <ImageOff className="size-3.5" />
                  </Button>
                )}

                <Link to={`/admin/dashboard/categories/${cat.id}/edit`}>
                  <Button variant="ghost" size="icon" className="size-8" title="Edit category">
                    <Pencil className="size-3.5" />
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:bg-destructive/10"
                  disabled={deleting === cat.id}
                  onClick={() => handleDelete(cat.id)}
                  title="Delete category"
                >
                  <Trash2 className="size-3.5" />
                </Button>
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
