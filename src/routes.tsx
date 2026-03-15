import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { Home } from "./pages/Home";
import { homeLoader, productDetailLoader, categoryLoader, searchLoader } from "./loaders";
import { LoginLandingPage } from "./pages/auth/LoginLandingPage";
import { CustomerLoginPage } from "./pages/auth/CustomerLoginPage";
import { VendorLoginPage } from "./pages/auth/VendorLoginPage";
import { DeliveryPartnerLoginPage } from "./pages/auth/DeliveryPartnerLoginPage";
import { AdminLoginPage } from "./pages/auth/AdminLoginPage";
import { CustomerSignupPage } from "./pages/auth/CustomerSignupPage";
import { VendorSignupPage } from "./pages/auth/VendorSignupPage";
import { DeliveryPartnerSignupPage } from "./pages/auth/DeliveryPartnerSignupPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { EditProfilePage } from "./pages/profile/EditProfilePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CategoryPage } from "./pages/CategoryPage";
import { SearchPage } from "./pages/SearchPage";
import { WishlistPage } from "./pages/WishlistPage";
import { VendorDashboardLayout } from "./pages/vendor-dashboard/VendorDashboardLayout";
import { VendorOverviewPage } from "./pages/vendor-dashboard/VendorOverviewPage";
import { VendorProductsPage } from "./pages/vendor-dashboard/VendorProductsPage";
import { VendorCreateProductPage } from "./pages/vendor-dashboard/VendorCreateProductPage";
import { VendorEditProductPage } from "./pages/vendor-dashboard/VendorEditProductPage";
import { VendorProductDevicesPage } from "./pages/vendor-dashboard/VendorProductDevicesPage";
import { VendorCreateDevicePage } from "./pages/vendor-dashboard/VendorCreateDevicePage";
import { VendorDevicesPage } from "./pages/vendor-dashboard/VendorDevicesPage";
import { VendorEditDevicePage } from "./pages/vendor-dashboard/VendorEditDevicePage";
import { VendorPromoCodesPage } from "./pages/vendor-dashboard/VendorPromoCodesPage";
import { VendorCreatePromoPage } from "./pages/vendor-dashboard/VendorCreatePromoPage";
import { VendorEditPromoPage } from "./pages/vendor-dashboard/VendorEditPromoPage";
import { CartPage } from "./pages/CartPage";
import { AdminDashboardLayout } from "./pages/admin-dashboard/AdminDashboardLayout";
import { AdminOverviewPage } from "./pages/admin-dashboard/AdminOverviewPage";
import { AdminUsersPage } from "./pages/admin-dashboard/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin-dashboard/AdminUserDetailPage";
import { AdminCategoriesPage } from "./pages/admin-dashboard/AdminCategoriesPage";
import { AdminCreateCategoryPage } from "./pages/admin-dashboard/AdminCreateCategoryPage";
import { AdminEditCategoryPage } from "./pages/admin-dashboard/AdminEditCategoryPage";
import { AdminProductsPage } from "./pages/admin-dashboard/AdminProductsPage";
import { AdminProductDetailPage } from "./pages/admin-dashboard/AdminProductDetailPage";
import { AdminProductDevicesPage } from "./pages/admin-dashboard/AdminProductDevicesPage";
import { AdminCreateDevicePage } from "./pages/admin-dashboard/AdminCreateDevicePage";
import { AdminEditDevicePage } from "./pages/admin-dashboard/AdminEditDevicePage";

const router = createBrowserRouter([
  // ── Main app (with full Navbar + Footer) ────────────────────────────────────
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
        loader: homeLoader,
      },
      {
        path: "product/:id",
        element: <ProductDetailPage />,
        loader: productDetailLoader,
      },
      {
        path: "category/:slug",
        element: <CategoryPage />,
        loader: categoryLoader,
      },
      {
        path: "search",
        element: <SearchPage />,
        loader: searchLoader,
      },
      {
        path: "wishlist",
        element: <WishlistPage />,
      },
      {
        path: "cart",
        element: <CartPage />,
      },
    ],
  },

  // ── Login — role selection landing page ───────────────────────────────────
  { path: "/login", element: <LoginLandingPage /> },

  // ── Login — role-specific pages ─────────────────────────────────────────
  { path: "/login/customer", element: <CustomerLoginPage /> },
  { path: "/login/vendor", element: <VendorLoginPage /> },
  { path: "/login/delivery-partner", element: <DeliveryPartnerLoginPage /> },
  { path: "/login/admin", element: <AdminLoginPage /> },

  // ── Sign-up pages ────────────────────────────────────────────────────────
  { path: "/signup/customer", element: <CustomerSignupPage /> },
  { path: "/signup/vendor", element: <VendorSignupPage /> },
  { path: "/signup/delivery-partner", element: <DeliveryPartnerSignupPage /> },

  // ── Profile (authenticated) ───────────────────────────────────────────────
  { path: "/profile", element: <ProfilePage /> },
  { path: "/profile/edit", element: <EditProfilePage /> },

  // ── Vendor Dashboard ─────────────────────────────────────────────────────
  {
    path: "/vendor/dashboard",
    element: <VendorDashboardLayout />,
    children: [
      { index: true, element: <VendorOverviewPage /> },

      // Products
      { path: "products", element: <VendorProductsPage /> },
      { path: "products/create", element: <VendorCreateProductPage /> },
      { path: "products/:productId/edit", element: <VendorEditProductPage /> },
      { path: "products/:productId/devices", element: <VendorProductDevicesPage /> },
      { path: "products/:productId/devices/create", element: <VendorCreateDevicePage /> },

      // Devices (cross-product view)
      { path: "devices", element: <VendorDevicesPage /> },
      { path: "devices/:deviceId/edit", element: <VendorEditDevicePage /> },

      // Promo Codes
      { path: "promos", element: <VendorPromoCodesPage /> },
      { path: "promos/create", element: <VendorCreatePromoPage /> },
      { path: "promos/:promoId/edit", element: <VendorEditPromoPage /> },
    ],
  },

  // ── Admin Dashboard ──────────────────────────────────────────────────────
  {
    path: "/admin/dashboard",
    element: <AdminDashboardLayout />,
    children: [
      { index: true, element: <AdminOverviewPage /> },

      // Users
      { path: "users", element: <AdminUsersPage /> },
      { path: "users/:userId", element: <AdminUserDetailPage /> },

      // Categories
      { path: "categories", element: <AdminCategoriesPage /> },
      { path: "categories/create", element: <AdminCreateCategoryPage /> },
      { path: "categories/:categoryId/edit", element: <AdminEditCategoryPage /> },

      // Products
      { path: "products", element: <AdminProductsPage /> },
      { path: "products/:productId", element: <AdminProductDetailPage /> },
      { path: "products/:productId/devices", element: <AdminProductDevicesPage /> },
      { path: "products/:productId/devices/create", element: <AdminCreateDevicePage /> },

      // Devices (cross-product edit)
      { path: "devices/:deviceId/edit", element: <AdminEditDevicePage /> },
    ],
  },
]);

export default router;
