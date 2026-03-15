import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import { getPromo, updatePromo } from "@/services/promo.service";
import type { Promo } from "@/schemas/promo.schema";
import { ApiError } from "@/lib/api";

const EditPromoSchema = z.object({
  discount_value: z.coerce.number().positive("Must be positive").optional(),
  min_order_value: z.coerce.number().nonnegative().optional(),
  max_discount: z.coerce.number().positive().optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  max_uses: z.coerce.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

function toDatetimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

export function VendorEditPromoPage() {
  const { promoId } = useParams<{ promoId: string }>();
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const [promo, setPromo] = useState<Promo | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    discount_value: "",
    min_order_value: "",
    max_discount: "",
    valid_from: "",
    valid_until: "",
    max_uses: "",
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !promoId) return;
    getPromo(accessToken, promoId)
      .then((data) => {
        setPromo(data);
        setForm({
          discount_value: String(data.discount_value),
          min_order_value: data.min_order_value != null ? String(data.min_order_value) : "",
          max_discount: data.max_discount != null ? String(data.max_discount) : "",
          valid_from: toDatetimeLocal(data.valid_from),
          valid_until: toDatetimeLocal(data.valid_until),
          max_uses: data.max_uses != null ? String(data.max_uses) : "",
          is_active: data.is_active,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, promoId]);

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const raw = {
      discount_value: form.discount_value || undefined,
      min_order_value: form.min_order_value || undefined,
      max_discount: form.max_discount || undefined,
      valid_from: form.valid_from || undefined,
      valid_until: form.valid_until || undefined,
      max_uses: form.max_uses || undefined,
      is_active: form.is_active,
    };
    const result = EditPromoSchema.safeParse(raw);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => { if (i.path[0]) errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    if (!accessToken || !promoId) return;
    setSubmitting(true);
    try {
      const data = result.data;
      await updatePromo(accessToken, promoId, {
        discount_value: data.discount_value,
        min_order_value: data.min_order_value ?? null,
        max_discount: data.max_discount ?? null,
        valid_from: data.valid_from ? new Date(data.valid_from).toISOString() : undefined,
        valid_until: data.valid_until ? new Date(data.valid_until).toISOString() : undefined,
        max_uses: data.max_uses ?? null,
        is_active: data.is_active,
      });
      navigate("/vendor/dashboard/promos");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to update promo code.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-60">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="p-6 text-center text-muted-foreground">Promo code not found.</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Edit Promo Code</h1>
          <p className="text-sm text-muted-foreground font-mono">{promo.code}</p>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-background p-5 shadow-sm">
        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
          <div><span className="text-muted-foreground">Code:</span> <span className="font-mono font-semibold">{promo.code}</span></div>
          <div><span className="text-muted-foreground">Scope:</span> <span className="capitalize">{promo.scope}</span></div>
          <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{promo.discount_type}</span></div>
          <div><span className="text-muted-foreground">Uses:</span> {promo.uses_count}{promo.max_uses != null ? `/${promo.max_uses}` : ""}</div>
        </div>

        {/* Discount value */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {promo.discount_type === "percentage" ? "Percentage (1–100)" : "Amount (₹)"}
          </label>
          <Input
            type="number"
            value={form.discount_value}
            onChange={(e) => handleChange("discount_value", e.target.value)}
            min={0.01}
            max={promo.discount_type === "percentage" ? 100 : undefined}
            step={0.01}
          />
          {errors.discount_value && <p className="text-xs text-destructive">{errors.discount_value}</p>}
        </div>

        {promo.discount_type === "percentage" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Max Discount Cap (₹) <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              type="number"
              value={form.max_discount}
              onChange={(e) => handleChange("max_discount", e.target.value)}
              min={0.01}
              step={0.01}
              placeholder="No cap"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Minimum Order Value (₹) <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            type="number"
            value={form.min_order_value}
            onChange={(e) => handleChange("min_order_value", e.target.value)}
            min={0}
            step={0.01}
            placeholder="No minimum"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valid From</label>
            <Input type="datetime-local" value={form.valid_from} onChange={(e) => handleChange("valid_from", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valid Until</label>
            <Input type="datetime-local" value={form.valid_until} onChange={(e) => handleChange("valid_until", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Max Uses <span className="text-muted-foreground font-normal">(blank = unlimited)</span></label>
          <Input
            type="number"
            value={form.max_uses}
            onChange={(e) => handleChange("max_uses", e.target.value)}
            min={1}
            step={1}
            placeholder="Unlimited"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => handleChange("is_active", e.target.checked)}
            className="size-4 rounded border-input"
          />
          <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
            Active (customers can use this code)
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
