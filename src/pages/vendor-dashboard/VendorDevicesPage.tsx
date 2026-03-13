import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Cpu, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";
import type { Device } from "@/schemas/catalog.schema";

const CONDITION_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" },
  good: { label: "Good", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  fair: { label: "Fair", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  poor: { label: "Poor", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
};

export function VendorDevicesPage() {
  const { accessToken } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    catalogService
      .listDevices(accessToken, { page, page_size: PAGE_SIZE })
      .then((res) => {
        setDevices(res.items);
        setTotal(res.total);
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, [accessToken, page]);

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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">All Devices</h1>
          <p className="text-sm text-muted-foreground">{total} device unit{total !== 1 ? "s" : ""} across all products</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && devices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
          <Cpu className="size-12 text-muted-foreground/30 mb-4" />
          <p className="font-medium">No devices yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Open a product to add device units.
          </p>
          <Link to="/vendor/dashboard/products" className="mt-4">
            <Button variant="outline" size="sm">View Products</Button>
          </Link>
        </div>
      )}

      {!loading && devices.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
          {devices.map((device) => {
            const cond = CONDITION_LABELS[device.condition] ?? { label: device.condition, className: "" };
            return (
              <div
                key={device.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(device.created_at).toLocaleDateString()}
                    </p>
                    <Link
                      to={`/vendor/dashboard/products/${device.product_id}/devices`}
                      className="text-xs text-primary hover:underline"
                    >
                      View product
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link to={`/vendor/dashboard/devices/${device.id}/edit`}>
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
