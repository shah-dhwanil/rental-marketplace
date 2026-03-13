import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Users, FolderTree, Package, ArrowRight, ShieldCheck, Store, Truck, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import * as adminService from "@/services/admin.service";
import * as catalogService from "@/services/catalog.service";

type Stats = {
  totalUsers: number;
  customers: number;
  vendors: number;
  deliveryPartners: number;
  totalCategories: number;
  totalProducts: number;
};

export function AdminOverviewPage() {
  const { accessToken, user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    customers: 0,
    vendors: 0,
    deliveryPartners: 0,
    totalCategories: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    async function fetchStats() {
      try {
        const [all, customers, vendors, dps, categories, products] = await Promise.all([
          adminService.listAdminUsers(accessToken!, { page_size: 1 }),
          adminService.listAdminUsers(accessToken!, { role: "customer", page_size: 1 }),
          adminService.listAdminUsers(accessToken!, { role: "vendor", page_size: 1 }),
          adminService.listAdminUsers(accessToken!, { role: "delivery_partner", page_size: 1 }),
          catalogService.listCategories({ page_size: 1 }),
          catalogService.listAllProducts({ page_size: 1 }),
        ]);
        setStats({
          totalUsers: all.total,
          customers: customers.total,
          vendors: vendors.total,
          deliveryPartners: dps.total,
          totalCategories: categories.total,
          totalProducts: products.total,
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
      label: "Total Users",
      value: stats.totalUsers,
      subLabel: "all roles",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      href: "/admin/dashboard/users",
    },
    {
      label: "Customers",
      value: stats.customers,
      subLabel: "registered",
      icon: User,
      color: "text-cyan-600",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      href: "/admin/dashboard/users?role=customer",
    },
    {
      label: "Vendors",
      value: stats.vendors,
      subLabel: "registered",
      icon: Store,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      href: "/admin/dashboard/users?role=vendor",
    },
    {
      label: "Delivery Partners",
      value: stats.deliveryPartners,
      subLabel: "registered",
      icon: Truck,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      href: "/admin/dashboard/users?role=delivery_partner",
    },
    {
      label: "Categories",
      value: stats.totalCategories,
      subLabel: "in catalog",
      icon: FolderTree,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      href: "/admin/dashboard/categories",
    },
    {
      label: "Products",
      value: stats.totalProducts,
      subLabel: "listed",
      icon: Package,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      href: "/admin/dashboard/products",
    },
  ];

  const quickActions = [
    {
      to: "/admin/dashboard/users",
      icon: ShieldCheck,
      iconBg: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600",
      title: "Manage Users",
      desc: "Verify, activate or deactivate user accounts",
    },
    {
      to: "/admin/dashboard/categories",
      icon: FolderTree,
      iconBg: "bg-purple-50 dark:bg-purple-950/30",
      iconColor: "text-purple-600",
      title: "Manage Categories",
      desc: "Create and organise product categories",
    },
    {
      to: "/admin/dashboard/products",
      icon: Package,
      iconBg: "bg-rose-50 dark:bg-rose-950/30",
      iconColor: "text-rose-600",
      title: "View Products",
      desc: "Browse all products listed on the platform",
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
          Here&apos;s a platform-wide summary.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Link key={card.label} to={card.href}>
            <div className="rounded-xl border border-border bg-background p-4 hover:shadow-md transition-shadow space-y-3">
              <div className={`inline-flex items-center justify-center size-10 rounded-lg ${card.bg}`}>
                <card.icon className={`size-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loading ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-background px-4 py-4 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-all group">
                <div className={`size-10 rounded-lg ${action.iconBg} flex items-center justify-center shrink-0`}>
                  <action.icon className={`size-5 ${action.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.desc}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-violet-600 transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
