import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, X, Cpu, Image } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PropertiesEditor } from "@/components/properties-editor";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { Category, Product } from "@/schemas/catalog.schema";

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

export function VendorEditProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!accessToken || !productId) return;
    Promise.all([
      catalogService.getProduct(productId, accessToken),
      catalogService.listCategories({ page_size: 200 }),
    ])
      .then(([p, cats]) => {
        setProduct(p);
        setCategories(cats.items);
        setProperties(
          typeof p.properties === "object" && p.properties !== null
            ? Object.fromEntries(
                Object.entries(p.properties).map(([k, v]) => [k, String(v)])
              )
            : {},
        );
        setForm({
          name: p.name,
          description: p.description,
          category_id: p.category_id,
          price_day: String(p.price_day),
          price_week: String(p.price_week),
          price_month: String(p.price_month),
          security_deposit: String(p.security_deposit),
          defect_charge: String(p.defect_charge),
          is_active: p.is_active,
        });
      })
      .catch(() => setLoadError("Failed to load product."));
  }, [accessToken, productId]);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

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
      await catalogService.updateProduct(accessToken!, productId!, {
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
      navigate("/vendor/dashboard/products");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken || !productId) return;
    setUploadingImage(true);
    try {
      const updated = await catalogService.uploadProductImage(accessToken, productId, file);
      setProduct(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(index: number) {
    if (!accessToken || !productId) return;
    if (!confirm("Remove this image?")) return;
    setDeletingImage(index);
    try {
      const updated = await catalogService.deleteProductImage(accessToken, productId, index);
      setProduct(updated);
    } catch {
      alert("Failed to delete image.");
    } finally {
      setDeletingImage(null);
    }
  }

  if (loadError) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">{loadError}</p>
        <Link to="/vendor/dashboard/products" className="mt-4 inline-block">
          <Button variant="outline">Back to Products</Button>
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 flex flex-col gap-4 max-w-2xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/vendor/dashboard/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Products
        </Link>
        <Link to={`/vendor/dashboard/products/${productId}/devices`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Cpu className="size-4" /> Manage Devices
          </Button>
        </Link>
      </div>

      <h1 className="text-xl font-bold tracking-tight mb-6">Edit Product</h1>

      {/* Images section */}
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium">Product Images ({product.image_urls.length}/8)</p>
        <div className="flex flex-wrap gap-2">
          {product.image_urls.map((url, i) => (
            <div key={i} className="relative size-24 rounded-lg overflow-hidden border border-border group">
              <img src={url} alt={`Product image ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDeleteImage(i)}
                disabled={deletingImage === i}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <X className="size-5 text-white" />
              </button>
            </div>
          ))}
          {product.image_urls.length < 8 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="size-24 rounded-lg border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              {uploadingImage ? (
                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Image className="size-5" />
                  <span className="text-xs">Upload</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageUpload}
        />
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 10 MB each.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Product Name *</label>
          <Input
            value={String(form.name)}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            rows={4}
            value={String(form.description)}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category *</label>
          <select
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={String(form.category_id)}
            onChange={(e) => set("category_id", e.target.value)}
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.category_id && <p className="text-xs text-destructive">{errors.category_id}</p>}
        </div>

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
                  value={String(form[key])}
                  onChange={(e) => set(key, e.target.value)}
                />
                {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
              </div>
            ))}
          </div>
        </div>

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
                value={String(form[key])}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
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
          <span className="text-sm font-medium">Active</span>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
          <Link to="/vendor/dashboard/products">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
