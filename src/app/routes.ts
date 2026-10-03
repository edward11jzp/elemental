import { createBrowserRouter } from "react-router";
import { lazy } from "react";
import Root from "./pages/Root";
import Home from "./pages/Home";

// Páginas críticas del flujo de compra → eager (entran en el bundle inicial)
import CategoryPage from "./pages/CategoryPage";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

// Páginas secundarias del cliente → lazy (un chunk aparte por cada una)
const Locations = lazy(() => import("./pages/Locations"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Wholesale = lazy(() => import("./pages/Wholesale"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));

// Todo el admin → lazy (los clientes nunca lo descargan)
const AdminRoot = lazy(() => import("./pages/AdminRoot"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminInventory = lazy(() => import("./pages/AdminInventory"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminLocations = lazy(() => import("./pages/AdminLocations"));
const AdminSocialMedia = lazy(() => import("./pages/AdminSocialMedia"));
const AdminPaymentInfo = lazy(() => import("./pages/AdminPaymentInfo"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminFinance = lazy(() => import("./pages/AdminFinance"));
const AdminSales = lazy(() => import("./pages/AdminSales"));
const AdminExpenses = lazy(() => import("./pages/AdminExpenses"));
const AdminCustomers = lazy(() => import("./pages/AdminCustomers"));
const AdminAccounts = lazy(() => import("./pages/AdminAccounts"));
const AdminStaff = lazy(() => import("./pages/AdminStaff"));
const AdminPayConf = lazy(() => import("./pages/AdminPayConf"));
const AdminSuppliers = lazy(() => import("./pages/AdminSuppliers"));
const AdminAudit = lazy(() => import("./pages/AdminAudit"));

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
      { path: "revisar-pedido", Component: TrackOrder },
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
      { path: "finance", Component: AdminFinance },
      { path: "sales", Component: AdminSales },
      { path: "expenses", Component: AdminExpenses },
      { path: "customers", Component: AdminCustomers },
      { path: "accounts", Component: AdminAccounts },
      { path: "staff", Component: AdminStaff },
      { path: "payconf", Component: AdminPayConf },
      { path: "suppliers", Component: AdminSuppliers },
      { path: "audit", Component: AdminAudit },
    ],
  },
]);
