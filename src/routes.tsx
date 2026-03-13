import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { Home } from "./pages/Home";
import { homeLoader } from "./loaders";
import { LoginLandingPage } from "./pages/auth/LoginLandingPage";
import { CustomerLoginPage } from "./pages/auth/CustomerLoginPage";
import { VendorLoginPage } from "./pages/auth/VendorLoginPage";
import { DeliveryPartnerLoginPage } from "./pages/auth/DeliveryPartnerLoginPage";
import { CustomerSignupPage } from "./pages/auth/CustomerSignupPage";
import { VendorSignupPage } from "./pages/auth/VendorSignupPage";
import { DeliveryPartnerSignupPage } from "./pages/auth/DeliveryPartnerSignupPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { EditProfilePage } from "./pages/profile/EditProfilePage";
import { VendorDashboardLayout } from "./pages/vendor-dashboard/VendorDashboardLayout";
import { VendorOverviewPage } from "./pages/vendor-dashboard/VendorOverviewPage";
import { VendorProductsPage } from "./pages/vendor-dashboard/VendorProductsPage";
import { VendorCreateProductPage } from "./pages/vendor-dashboard/VendorCreateProductPage";
import { VendorEditProductPage } from "./pages/vendor-dashboard/VendorEditProductPage";
import { VendorProductDevicesPage } from "./pages/vendor-dashboard/VendorProductDevicesPage";
import { VendorCreateDevicePage } from "./pages/vendor-dashboard/VendorCreateDevicePage";
import { VendorDevicesPage } from "./pages/vendor-dashboard/VendorDevicesPage";
import { VendorEditDevicePage } from "./pages/vendor-dashboard/VendorEditDevicePage";

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
    ],
  },

  // ── Login — role selection landing page ───────────────────────────────────
  { path: "/login", element: <LoginLandingPage /> },

  // ── Login — role-specific pages ─────────────────────────────────────────
  { path: "/login/customer", element: <CustomerLoginPage /> },
  { path: "/login/vendor", element: <VendorLoginPage /> },
  { path: "/login/delivery-partner", element: <DeliveryPartnerLoginPage /> },

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
    ],
  },
]);

export default router;
