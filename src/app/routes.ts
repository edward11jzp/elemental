import { createBrowserRouter, redirect } from "react-router";
import Root from "./pages/Root";
import Home from "./pages/Home";
import CategoryPage from "./pages/CategoryPage";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AccountLogin from "./pages/AccountLogin";
import AccountDashboard from "./pages/AccountDashboard";
import Locations from "./pages/Locations";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Wholesale from "./pages/Wholesale";
import AdminRoot from "./pages/AdminRoot";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminInventory from "./pages/AdminInventory";
import AdminOrders from "./pages/AdminOrders";
import AdminUsers from "./pages/AdminUsers";
import AdminLocations from "./pages/AdminLocations";
import AdminSocialMedia from "./pages/AdminSocialMedia";
import AdminPaymentInfo from "./pages/AdminPaymentInfo";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "men/:subcategory", Component: CategoryPage },
      { path: "women/:subcategory", Component: CategoryPage },
      { path: "kids/:subcategory", Component: CategoryPage },
      { path: "shop/:subcategory", Component: CategoryPage },
      { path: "product/:id", Component: ProductDetail },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "locations", Component: Locations },
      { path: "about", Component: About },
      { path: "contact", Component: Contact },
      { path: "wholesale", Component: Wholesale },
      { path: "account/login", Component: AccountLogin },
      { path: "account", Component: AccountDashboard },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/admin",
    Component: AdminRoot,
    children: [
      { index: true, Component: AdminLogin },
      { path: "login", Component: AdminLogin },
      { path: "dashboard", Component: AdminDashboard },
      { path: "inventory", Component: AdminInventory },
      { path: "orders", Component: AdminOrders },
      { path: "users", Component: AdminUsers },
      { path: "locations", Component: AdminLocations },
      { path: "social", Component: AdminSocialMedia },
      { path: "payment-info", Component: AdminPaymentInfo },
      { path: "settings", Component: AdminSettings },
    ],
  },
]);