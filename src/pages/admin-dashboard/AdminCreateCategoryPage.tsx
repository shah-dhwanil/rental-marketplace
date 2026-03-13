import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { Category } from "@/schemas/catalog.schema";

const CreateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Max 64 characters"),
  description: z.string().optional(),
  parent_category_id: z.string().optional(),
  slug: z.string().optional(),
});

type FormErrors = Partial<Record<string, string>>;

export function AdminCreateCategoryPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [slug, setSlug] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    catalogService
      .listCategories({ page_size: 100 })
      .then((res) => setCategories(res.items))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const result = CreateCategorySchema.safeParse({
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

    if (!accessToken) return;
    setSaving(true);
    try {
      await catalogService.createCategory(accessToken, result.data);
      navigate("/admin/dashboard/categories");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <Link
        to="/admin/dashboard/categories"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Categories
      </Link>

      <div>
        <h1 className="text-xl font-bold tracking-tight">New Category</h1>
        <p className="text-sm text-muted-foreground">Create a new product category</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-border bg-background p-5 space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g. Laptops"
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
            placeholder="auto-generated from name"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Leave blank to auto-generate from the name.</p>
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
            {saving ? "Creating…" : "Create Category"}
          </Button>
        </div>
      </form>
    </div>
  );
}
