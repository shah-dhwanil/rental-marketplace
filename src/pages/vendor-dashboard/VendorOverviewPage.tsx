import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Package, Cpu, ShoppingBag, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import * as catalogService from "@/services/catalog.service";

type Stats = {
  totalProducts: number;
  activeProducts: number;
  totalDevices: number;
  activeDevices: number;
};

export function VendorOverviewPage() {
  const { accessToken, user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, activeProducts: 0, totalDevices: 0, activeDevices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    async function fetchStats() {
      try {
        const [allProducts, activeProducts, allDevices, activeDevices] = await Promise.all([
          catalogService.listMyProducts(accessToken!, { page_size: 1 }),
          catalogService.listMyProducts(accessToken!, { page_size: 1, is_active: true }),
          catalogService.listDevices(accessToken!, { page_size: 1 }),
          catalogService.listDevices(accessToken!, { page_size: 1, is_active: true }),
        ]);
        setStats({
          totalProducts: allProducts.total,
          activeProducts: activeProducts.total,
          totalDevices: allDevices.total,
          activeDevices: activeDevices.total,
        });
      } catch {
        // non-critical
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [accessToken]);

  const statCards = [
    {
      label: "Total Products",
      value: stats.totalProducts,
      subLabel: `${stats.activeProducts} active`,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      href: "/vendor/dashboard/products",
    },
    {
      label: "Total Devices",
      value: stats.totalDevices,
      subLabel: `${stats.activeDevices} active`,
      icon: Cpu,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      href: "/vendor/dashboard/devices",
    },
    {
      label: "Active Orders",
      value: "—",
      subLabel: "Coming soon",
      icon: ShoppingBag,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      href: "#",
      disabled: true,
    },
    {
      label: "Revenue",
      value: "—",
      subLabel: "Coming soon",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
      href: "#",
      disabled: true,
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s a summary of your vendor activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.href}
            className={card.disabled ? "pointer-events-none" : ""}
          >
            <div className="rounded-xl border border-border bg-background p-4 hover:shadow-md transition-shadow space-y-3">
              <div className={`inline-flex items-center justify-center size-10 rounded-lg ${card.bg}`}>
                <card.icon className={`size-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loading && card.value !== "—" ? (
                    <span className="inline-block w-8 h-6 bg-muted animate-pulse rounded" />
                  ) : (
                    card.value
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                <p className="text-xs text-muted-foreground">{card.subLabel}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/vendor/dashboard/products/create">
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-background px-4 py-4 hover:border-primary hover:bg-primary/5 transition-all group">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Add New Product</p>
                <p className="text-xs text-muted-foreground">List a product for rental</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
          </Link>

          <Link to="/vendor/dashboard/products">
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-background px-4 py-4 hover:border-primary hover:bg-primary/5 transition-all group">
              <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <Package className="size-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Manage Products</p>
                <p className="text-xs text-muted-foreground">View, edit, or deactivate products</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
          </Link>
        </div>
      </div>

      {/* Upcoming features preview */}
      <div className="rounded-xl border border-border bg-background p-5">
        <h2 className="text-base font-semibold mb-1">Coming Soon</h2>
        <p className="text-xs text-muted-foreground mb-4">More features are on the way to help you manage your rental business.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {["Order Management", "Revenue Analytics", "Customer Reviews", "Promo Codes", "Bulk Upload", "Inventory Alerts"].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary/40 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
