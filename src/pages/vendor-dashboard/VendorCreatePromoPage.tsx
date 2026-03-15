import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import { createPromo } from "@/services/promo.service";
import { listMyProducts } from "@/services/catalog.service";
import type { ProductSummary } from "@/schemas/catalog.schema";
import { ApiError } from "@/lib/api";

const CreatePromoSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").toUpperCase(),
  scope: z.enum(["product", "vendor"]),
  product_id: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().positive("Must be positive"),
  min_order_value: z.coerce.number().nonnegative().optional(),
  max_discount: z.coerce.number().positive().optional(),
  valid_from: z.string().min(1, "Required"),
  valid_until: z.string().min(1, "Required"),
  max_uses: z.coerce.number().int().positive().optional(),
});

function toDatetimeLocal(iso?: string): string {
  if (!iso) {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  }
  return new Date(iso).toISOString().slice(0, 16);
}

function toISO(local: string): string {
  return new Date(local).toISOString();
}

export function VendorCreatePromoPage() {
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [form, setForm] = useState({
    code: "",
    scope: "vendor" as "product" | "vendor",
    product_id: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    min_order_value: "",
    max_discount: "",
    valid_from: toDatetimeLocal(),
    valid_until: toDatetimeLocal(new Date(Date.now() + 30 * 86400 * 1000).toISOString()),
    max_uses: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    listMyProducts(accessToken, { page: 1, page_size: 100 })
      .then((res) => setProducts(res.items))
      .catch(() => {});
  }, [accessToken]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const raw = {
      code: form.code,
      scope: form.scope,
      product_id: form.scope === "product" ? form.product_id || undefined : undefined,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order_value: form.min_order_value || undefined,
      max_discount: form.max_discount || undefined,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      max_uses: form.max_uses || undefined,
    };
    const result = CreatePromoSchema.safeParse(raw);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => { if (i.path[0]) errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    if (!accessToken) return;
    setSubmitting(true);
    try {
      const data = result.data;
      await createPromo(accessToken, {
        code: data.code,
        scope: data.scope,
        product_id: data.product_id ?? null,
        vendor_id: data.scope === "vendor" ? user?.id ?? null : null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_value: data.min_order_value ?? null,
        max_discount: data.discount_type === "percentage" && data.max_discount ? data.max_discount : null,
        valid_from: toISO(data.valid_from),
        valid_until: toISO(data.valid_until),
        max_uses: data.max_uses ?? null,
      });
      navigate("/vendor/dashboard/promos");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to create promo code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-xl font-bold">Create Promo Code</h1>
      </div>

      {submitError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-background p-5 shadow-sm">
        {/* Code */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Promo Code</label>
          <Input
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="e.g. SUMMER20"
            className="font-mono uppercase"
            maxLength={32}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
        </div>

        {/* Scope */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Scope</label>
          <select
            value={form.scope}
            onChange={(e) => handleChange("scope", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="vendor">Vendor-wide (all my products)</option>
            <option value="product">Specific product</option>
          </select>
          {errors.scope && <p className="text-xs text-destructive">{errors.scope}</p>}
        </div>

        {/* Product selector */}
        {form.scope === "product" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Product</label>
            <select
              value={form.product_id}
              onChange={(e) => handleChange("product_id", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {errors.product_id && <p className="text-xs text-destructive">{errors.product_id}</p>}
          </div>
        )}

        {/* Discount type + value */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Discount Type</label>
            <select
              value={form.discount_type}
              onChange={(e) => handleChange("discount_type", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {form.discount_type === "percentage" ? "Percentage (1–100)" : "Amount (₹)"}
            </label>
            <Input
              type="number"
              value={form.discount_value}
              onChange={(e) => handleChange("discount_value", e.target.value)}
              min={0.01}
              max={form.discount_type === "percentage" ? 100 : undefined}
              step={0.01}
              placeholder="0"
            />
            {errors.discount_value && <p className="text-xs text-destructive">{errors.discount_value}</p>}
          </div>
        </div>

        {/* Max discount (only for percentage) */}
        {form.discount_type === "percentage" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Max Discount Cap (₹) <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              type="number"
              value={form.max_discount}
              onChange={(e) => handleChange("max_discount", e.target.value)}
              min={0.01}
              step={0.01}
              placeholder="e.g. 500"
            />
          </div>
        )}

        {/* Min order value */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Minimum Order Value (₹) <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            type="number"
            value={form.min_order_value}
            onChange={(e) => handleChange("min_order_value", e.target.value)}
            min={0}
            step={0.01}
            placeholder="e.g. 1000"
          />
        </div>

        {/* Valid from / until */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valid From</label>
            <Input
              type="datetime-local"
              value={form.valid_from}
              onChange={(e) => handleChange("valid_from", e.target.value)}
            />
            {errors.valid_from && <p className="text-xs text-destructive">{errors.valid_from}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valid Until</label>
            <Input
              type="datetime-local"
              value={form.valid_until}
              onChange={(e) => handleChange("valid_until", e.target.value)}
            />
            {errors.valid_until && <p className="text-xs text-destructive">{errors.valid_until}</p>}
          </div>
        </div>

        {/* Max uses */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Max Uses <span className="text-muted-foreground font-normal">(optional — leave blank for unlimited)</span></label>
          <Input
            type="number"
            value={form.max_uses}
            onChange={(e) => handleChange("max_uses", e.target.value)}
            min={1}
            step={1}
            placeholder="e.g. 100"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Create Promo Code
          </Button>
        </div>
      </form>
    </div>
  );
}
