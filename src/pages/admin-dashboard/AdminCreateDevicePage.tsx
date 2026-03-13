import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PropertiesEditor } from "@/components/properties-editor";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { Product } from "@/schemas/catalog.schema";

const CONDITIONS = ["new", "good", "fair", "poor"] as const;
const CONDITION_LABELS = { new: "New", good: "Good", fair: "Fair", poor: "Poor" };
const CONDITION_COLORS = {
  new: "border-green-300 text-green-700 dark:text-green-400",
  good: "border-blue-300 text-blue-700 dark:text-blue-400",
  fair: "border-amber-300 text-amber-700 dark:text-amber-400",
  poor: "border-red-300 text-red-600 dark:text-red-400",
};

const Schema = z.object({
  serial_no: z.string().optional(),
  condition: z.enum(CONDITIONS),
  is_active: z.boolean(),
});

export function AdminCreateDevicePage() {
  const { productId } = useParams<{ productId: string }>();
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [serialNo, setSerialNo] = useState("");
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>("good");
  const [isActive, setIsActive] = useState(true);
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId || !accessToken) return;
    catalogService
      .getProduct(productId, accessToken)
      .then(setProduct)
      .catch(() => {});
  }, [productId, accessToken]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const result = Schema.safeParse({ serial_no: serialNo || undefined, condition, is_active: isActive });
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach((err) => { const k = String(err.path[0]); if (!fe[k]) fe[k] = err.message; });
      setErrors(fe);
      return;
    }

    if (!accessToken || !productId) return;
    setSaving(true);
    try {
      await catalogService.createDevice(accessToken, {
        product_id: productId,
        serial_no: result.data.serial_no ?? null,
        condition: result.data.condition,
        is_active: result.data.is_active,
        properties,
      });
      navigate(`/admin/dashboard/products/${productId}/devices`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create device.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5">
      <Link
        to={`/admin/dashboard/products/${productId}/devices`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Devices
      </Link>

      <div>
        <h1 className="text-xl font-bold tracking-tight">Add Device</h1>
        {product && <p className="text-sm text-muted-foreground mt-0.5">for {product.name}</p>}
      </div>

      <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-border bg-background p-5 space-y-5">
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Serial number */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Serial Number <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            placeholder="e.g. SN-001234"
            value={serialNo}
            onChange={(e) => setSerialNo(e.target.value)}
          />
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Condition *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={`rounded-lg border-2 py-2.5 text-sm font-medium transition-all ${
                  condition === c
                    ? `${CONDITION_COLORS[c]} bg-background shadow-sm`
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
          {errors.condition && <p className="text-xs text-destructive">{errors.condition}</p>}
        </div>

        {/* Properties */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Properties</label>
          <p className="text-xs text-muted-foreground">Per-unit details (e.g. Color → Black).</p>
          <PropertiesEditor value={properties} onChange={setProperties} />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <div className="w-10 h-6 bg-muted rounded-full peer peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
          </label>
          <span className="text-sm font-medium">Active</span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700">
            {saving ? "Creating…" : "Add Device"}
          </Button>
          <Link to={`/admin/dashboard/products/${productId}/devices`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
