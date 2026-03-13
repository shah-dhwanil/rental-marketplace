import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import { PropertiesEditor } from "@/components/properties-editor";
import type { Product } from "@/schemas/catalog.schema";

const Schema = z.object({
  serial_no: z.string().optional(),
  condition: z.enum(["new", "good", "fair", "poor"]),
  is_active: z.boolean(),
});

export function VendorCreateDevicePage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string | boolean>>({
    serial_no: "",
    condition: "good",
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken || !productId) return;
    catalogService.getProduct(productId, accessToken).then(setProduct).catch(() => {});
  }, [accessToken, productId]);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = Schema.safeParse({ ...form, condition: form.condition as string });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const key = String(err.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await catalogService.createDevice(accessToken!, {
        product_id: productId!,
        serial_no: String(form.serial_no) || undefined,
        condition: String(form.condition),
        is_active: form.is_active as boolean,
        properties,
      });
      navigate(`/vendor/dashboard/products/${productId}/devices`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create device.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <Link
        to={`/vendor/dashboard/products/${productId}/devices`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to Devices
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Add Device</h1>
        {product && (
          <p className="text-sm text-muted-foreground mt-1">
            for <span className="font-medium text-foreground">{product.name}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Serial Number <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            placeholder="e.g. SN-2024-001"
            value={String(form.serial_no)}
            onChange={(e) => set("serial_no", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Leave blank if you don't track serial numbers.</p>
          {errors.serial_no && <p className="text-xs text-destructive">{errors.serial_no}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Condition *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["new", "good", "fair", "poor"] as const).map((c) => (
              <label
                key={c}
                className={`flex items-center justify-center rounded-lg border-2 px-3 py-2.5 text-sm font-medium cursor-pointer transition-all ${
                  form.condition === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  value={c}
                  className="sr-only"
                  checked={form.condition === c}
                  onChange={() => set("condition", c)}
                />
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </label>
            ))}
          </div>
          {errors.condition && <p className="text-xs text-destructive">{errors.condition}</p>}
        </div>

        {/* Properties */}
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">Custom Properties</label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Optional details about this unit (e.g. Purchase Year → 2023, Color → Silver).
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
          <span className="text-sm font-medium">Available for rental</span>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
            {submitting ? "Adding..." : "Add Device"}
          </Button>
          <Link to={`/vendor/dashboard/products/${productId}/devices`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
