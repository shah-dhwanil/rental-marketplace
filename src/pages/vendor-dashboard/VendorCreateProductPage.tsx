import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Image, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PropertiesEditor } from "@/components/properties-editor";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { Category } from "@/schemas/catalog.schema";

const MAX_IMAGES = 8;

const Schema = z.object({
  name: z.string().min(1, "Name is required").max(128),
  description: z.string().default(""),
  category_id: z.string().min(1, "Category is required"),
  price_day: z.string().refine((v) => Number(v) > 0, "Must be > 0"),
  price_week: z.string().refine((v) => Number(v) > 0, "Must be > 0"),
  price_month: z.string().refine((v) => Number(v) > 0, "Must be > 0"),
  security_deposit: z.string().refine((v) => Number(v) >= 0, "Must be ≥ 0"),
  defect_charge: z.string().refine((v) => Number(v) >= 0, "Must be ≥ 0"),
  is_active: z.boolean(),
});

type StagedFile = { file: File; preview: string };

export function VendorCreateProductPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string | boolean>>({
    name: "",
    description: "",
    category_id: "",
    price_day: "",
    price_week: "",
    price_month: "",
    security_deposit: "0",
    defect_charge: "0",
    is_active: true,
  });
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    catalogService
      .listCategories({ page_size: 200 })
      .then((res) => setCategories(res.items))
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      stagedFiles.forEach((sf) => URL.revokeObjectURL(sf.preview));
    };
  }, [stagedFiles]);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - stagedFiles.length;
    const toAdd = files.slice(0, remaining).map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setStagedFiles((prev) => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeStagedFile(index: number) {
    setStagedFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    setUploadStatus("");

    const result = Schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const key = String(err.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const data = result.data;
    setSubmitting(true);
    try {
      const product = await catalogService.createProduct(accessToken!, {
        name: data.name,
        description: data.description,
        category_id: data.category_id,
        price_day: Number(data.price_day),
        price_week: Number(data.price_week),
        price_month: Number(data.price_month),
        security_deposit: Number(data.security_deposit),
        defect_charge: Number(data.defect_charge),
        is_active: data.is_active,
        properties,
      });

      // Upload staged images sequentially
      for (let i = 0; i < stagedFiles.length; i++) {
        setUploadStatus(`Uploading image ${i + 1} of ${stagedFiles.length}…`);
        try {
          await catalogService.uploadProductImage(accessToken!, product.id, stagedFiles[i].file);
        } catch {
          // Continue with remaining images even if one fails
        }
      }

      navigate("/vendor/dashboard/products");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setSubmitting(false);
      setUploadStatus("");
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <Link
        to="/vendor/dashboard/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to Products
      </Link>

      <h1 className="text-xl font-bold tracking-tight mb-6">Add New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Product Name *</label>
          <Input
            placeholder="e.g. Canon EOS R5 Camera"
            value={String(form.name)}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Describe the product, its condition, what's included, etc."
            rows={4}
            value={String(form.description)}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category *</label>
          <select
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={String(form.category_id)}
            onChange={(e) => set("category_id", e.target.value)}
            disabled={catLoading}
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category_id && <p className="text-xs text-destructive">{errors.category_id}</p>}
        </div>

        {/* Pricing */}
        <div>
          <p className="text-sm font-medium mb-2">Pricing (₹) *</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["price_day", "price_week", "price_month"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {key === "price_day" ? "Per Day" : key === "price_week" ? "Per Week" : "Per Month"}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={String(form[key])}
                  onChange={(e) => set(key, e.target.value)}
                />
                {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Deposits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["security_deposit", "defect_charge"] as const).map((key) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium">
                {key === "security_deposit" ? "Security Deposit (₹)" : "Defect Charge (₹)"}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={String(form[key])}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Images */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Product Images
            <span className="text-muted-foreground font-normal ml-1.5">
              ({stagedFiles.length}/{MAX_IMAGES})
            </span>
          </label>

          {stagedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stagedFiles.map((sf, i) => (
                <div key={i} className="relative size-24 rounded-lg overflow-hidden border border-border group">
                  <img src={sf.preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeStagedFile(i)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    aria-label="Remove image"
                  >
                    <X className="size-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {stagedFiles.length < MAX_IMAGES && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary px-4 py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Image className="size-4" />
                {stagedFiles.length === 0 ? "Add images" : "Add more images"}
              </button>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP. Max 10 MB each. Up to {MAX_IMAGES} images.
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Properties */}
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">Custom Properties</label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Extra details shown to customers (e.g. Color → Black, Weight → 1.5 kg).
            </p>
          </div>
          <PropertiesEditor value={properties} onChange={setProperties} />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.is_active as boolean}
              onChange={(e) => set("is_active", e.target.checked)}
            />
            <div className="w-10 h-6 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
          </label>
          <span className="text-sm font-medium">Active (visible to customers)</span>
        </div>

        <div className="flex gap-3 pt-2 items-center">
          <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
            {submitting ? (uploadStatus || "Creating…") : "Create Product"}
          </Button>
          <Link to="/vendor/dashboard/products">
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
