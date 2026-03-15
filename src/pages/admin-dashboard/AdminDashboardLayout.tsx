import { useState, type ElementType } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Package,
  ShoppingBag,
  Menu,
  X,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Bell,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth.store";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  label: string;
  href: string;
  icon: ElementType;
  disabled?: boolean;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/dashboard/users", icon: Users },
  { label: "Categories", href: "/admin/dashboard/categories", icon: FolderTree },
  { label: "Products", href: "/admin/dashboard/products", icon: Package },
  { label: "Orders", href: "/admin/dashboard/orders", icon: ShoppingBag },
];

function SidebarContent({
  collapsed,
  onClose,
}: {
  collapsed?: boolean;
  onClose?: () => void;
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login/admin");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-border", collapsed && "justify-center px-2")}>
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <span className={cn("font-bold text-xl text-primary transition-all", collapsed ? "hidden" : "block")}>
            Rental<span className="text-purple-600">Mkt</span>
            <span className="inline-block h-1.5 w-1.5 bg-amber-400 rounded-full mb-2 ml-0.5" />
          </span>
          {collapsed && (
            <span className="font-bold text-xl text-primary">R</span>
          )}
        </Link>
      </div>

      {/* Admin badge */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Shield className="size-3 text-violet-600 dark:text-violet-400" />
            <p className="text-[10px] font-semibold tracking-widest text-violet-600 dark:text-violet-400 uppercase">Admin Panel</p>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{user?.firstName} {user?.lastName}</p>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/admin/dashboard"}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                collapsed ? "justify-center px-2" : "",
                item.disabled
                  ? "opacity-50 cursor-not-allowed pointer-events-none text-muted-foreground"
                  : isActive
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <item.icon className="shrink-0 size-[18px]" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* Footer actions */}
      <div className={cn("p-2 space-y-0.5", collapsed && "items-center")}>
        <Link
          to="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
            collapsed && "justify-center px-2",
          )}
        >
          <User className="shrink-0 size-[18px]" />
          {!collapsed && <span>My Profile</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut className="shrink-0 size-[18px]" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );
}

export function AdminDashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-background border-r border-border transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </aside>

      {/* Main content area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-60",
        )}
      >
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 shadow-sm">
          {/* Mobile hamburger via Sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="lg:hidden inline-flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0" showCloseButton={false}>
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Mobile brand */}
          <Link to="/" className="lg:hidden font-bold text-lg text-primary">
            Rental<span className="text-purple-600">Mkt</span>
          </Link>

          {/* Admin label (desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
            <Shield className="size-3.5" />
            Admin Panel
          </div>

          <div className="flex-1" />

          {/* Header right */}
          <div className="flex items-center gap-2">
            <button
              className="relative flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-amber-500" />
            </button>

            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <div className="size-7 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                <User className="size-4 text-violet-600" />
              </div>
              <span className="hidden sm:block font-medium text-sm">
                {user?.firstName}
              </span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-background px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              &copy; {new Date().getFullYear()} RentalMkt — Admin Panel
            </span>
            <div className="flex gap-4">
              <Link to="/" className="hover:text-foreground transition-colors">
                Marketplace
              </Link>
              <Link to="/profile" className="hover:text-foreground transition-colors">
                Profile
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
