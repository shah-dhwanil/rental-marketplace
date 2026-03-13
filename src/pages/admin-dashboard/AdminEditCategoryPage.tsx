import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Image, ImageOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { Category } from "@/schemas/catalog.schema";

const EditCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Max 64 characters"),
  description: z.string().optional(),
  parent_category_id: z.string().optional(),
  slug: z.string().optional(),
});

type FormErrors = Partial<Record<string, string>>;

export function AdminEditCategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);

  useEffect(() => {
    if (!categoryId) return;
    Promise.all([
      catalogService.getCategory(categoryId),
      catalogService.listCategories({ page_size: 100 }),
    ])
      .then(([cat, allCats]) => {
        setName(cat.name);
        setDescription(cat.description ?? "");
        setParentId(cat.parent_category_id ?? "");
        setSlug(cat.slug);
        setImageUrl(cat.image_url ?? null);
        // Exclude current category from parent options
        setCategories(allCats.items.filter((c) => c.id !== categoryId));
      })
      .catch(() => setPageError("Failed to load category."))
      .finally(() => setPageLoading(false));
  }, [categoryId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const result = EditCategorySchema.safeParse({
      name,
      description: description || undefined,
      parent_category_id: parentId || undefined,
      slug: slug || undefined,
    });
    if (!result.success) {
      const out: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_form";
        if (!out[key]) out[key] = issue.message;
      }
      setErrors(out);
      return;
    }

    if (!accessToken || !categoryId) return;
    setSaving(true);
    try {
      await catalogService.updateCategory(accessToken, categoryId, result.data);
      navigate("/admin/dashboard/categories");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to update category.");
    } finally {
      setSaving(false);
    }
  };

  async function handleImageUpload(file: File) {
    if (!accessToken || !categoryId) return;
    setUploadingImage(true);
    try {
      const result = await catalogService.uploadCategoryImage(accessToken, categoryId, file);
      setImageUrl(result.image_url);
    } catch {
      alert("Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRemoveImage() {
    if (!accessToken || !categoryId) return;
    if (!confirm("Remove this category image?")) return;
    setRemovingImage(true);
    try {
      await catalogService.deleteCategoryImage(accessToken, categoryId);
      setImageUrl(null);
    } catch {
      alert("Failed to remove image.");
    } finally {
      setRemovingImage(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-5 bg-muted animate-pulse rounded w-24" />
        <div className="rounded-xl border border-border bg-background p-5 space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <p className="text-sm text-destructive">{pageError}</p>
        <Link to="/admin/dashboard/categories" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to Categories
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <Link
        to="/admin/dashboard/categories"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Categories
      </Link>

      <div>
        <h1 className="text-xl font-bold tracking-tight">Edit Category</h1>
        <p className="text-sm text-muted-foreground">{name}</p>
      </div>

      {/* Image management */}
      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <h2 className="text-sm font-semibold">Category Image</h2>
        <div className="flex items-start gap-4">
          <div className="size-20 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <Image className="size-7 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 pointer-events-none"
                disabled={uploadingImage}
                asChild
              >
                <span>
                  <Image className="size-3.5" />
                  {uploadingImage ? "Uploading…" : imageUrl ? "Replace Image" : "Upload Image"}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-destructive justify-start"
                disabled={removingImage}
                onClick={handleRemoveImage}
              >
                <ImageOff className="size-3.5" />
                {removingImage ? "Removing…" : "Remove Image"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-border bg-background p-5 space-y-4">
        <h2 className="text-sm font-semibold">Category Details</h2>

        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </label>
          <Input
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Parent category */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Parent Category
          </label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">None (top-level)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Slug */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Slug
          </label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>

        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-sm text-destructive">{serverError}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/admin/dashboard/categories">
            <Button type="button" variant="outline" size="sm">Cancel</Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            className="bg-violet-600 hover:bg-violet-700"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
