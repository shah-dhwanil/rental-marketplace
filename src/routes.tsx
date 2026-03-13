import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { Home } from "./pages/Home";
import { homeLoader } from "./loaders";
import { LoginPage } from "./pages/auth/LoginPage";
import { CustomerSignupPage } from "./pages/auth/CustomerSignupPage";
import { VendorSignupPage } from "./pages/auth/VendorSignupPage";
import { DeliveryPartnerSignupPage } from "./pages/auth/DeliveryPartnerSignupPage";

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
      // Future routes:
      // {
      //   path: "products/:id",
      //   element: <ProductDetail />,
      //   loader: productDetailLoader,
      // },
      // {
      //   path: "category/:slug",
      //   element: <Category />,
      //   loader: categoryLoader,
      // },
      // {
      //   path: "search",
      //   element: <Search />,
      //   loader: searchLoader,
      // },
    ],
  },

  // ── Auth pages (clean layout, no main Navbar) ─────────────────────────────
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup/customer",
    element: <CustomerSignupPage />,
  },
  {
    path: "/signup/vendor",
    element: <VendorSignupPage />,
  },
  {
    path: "/signup/delivery-partner",
    element: <DeliveryPartnerSignupPage />,
  },
]);

export default router;
