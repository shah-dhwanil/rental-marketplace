import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Plus, Pencil, Trash2, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { Device, Product } from "@/schemas/catalog.schema";

const CONDITION_LABELS: Record<string, { label: string; className: string }> = {
  new:  { label: "New",  className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" },
  good: { label: "Good", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  fair: { label: "Fair", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  poor: { label: "Poor", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
};

export function AdminProductDevicesPage() {
  const { productId } = useParams<{ productId: string }>();
  const { accessToken } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !productId) return;
    setLoading(true);
    Promise.all([
      catalogService.getProduct(productId, accessToken),
      catalogService.listDevices(accessToken, { product_id: productId, page_size: 100 }),
    ])
      .then(([p, d]) => {
        setProduct(p);
        setDevices(d.items);
        setTotal(d.total);
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, [accessToken, productId]);

  async function handleDelete(deviceId: string) {
    if (!accessToken) return;
    if (!confirm("Delete this device?")) return;
    setDeleting(deviceId);
    try {
      await catalogService.deleteDevice(accessToken, deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      setTotal((t) => t - 1);
    } catch {
      alert("Failed to delete device.");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <Link
        to={`/admin/dashboard/products/${productId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to Product
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Devices</h1>
          {product && (
            <p className="text-sm text-muted-foreground mt-0.5">
              for <span className="font-medium text-foreground">{product.name}</span> — {total} unit{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link to={`/admin/dashboard/products/${productId}/devices/create`}>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
            <Plus className="size-4" /> Add Device
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Empty state */}
      {devices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
          <Cpu className="size-12 text-muted-foreground/30 mb-4" />
          <p className="font-medium">No devices yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add individual device units for this product.</p>
          <Link to={`/admin/dashboard/products/${productId}/devices/create`} className="mt-4">
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              <Plus className="size-4" /> Add Device
            </Button>
          </Link>
        </div>
      )}

      {/* Device list */}
      {devices.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
          {devices.map((device) => {
            const cond = CONDITION_LABELS[device.condition] ?? { label: device.condition, className: "" };
            return (
              <div key={device.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Cpu className="size-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {device.serial_no ? `#${device.serial_no}` : `Device ${device.id.slice(0, 8)}`}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cond.className}`}>
                      {cond.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        device.is_active
                          ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {device.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(device.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link to={`/admin/dashboard/devices/${device.id}/edit`}>
                    <Button variant="ghost" size="icon" className="size-8">
                      <Pencil className="size-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:bg-destructive/10"
                    disabled={deleting === device.id}
                    onClick={() => handleDelete(device.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
