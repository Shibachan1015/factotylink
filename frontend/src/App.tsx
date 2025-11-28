import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CustomerLogin from "./pages/customer/login.tsx";
import CustomerRegister from "./pages/customer/register.tsx";
import CustomerDashboard from "./pages/customer/dashboard.tsx";
import ProductsPage from "./pages/customer/products/index.tsx";
import ProductDetailPage from "./pages/customer/products/[id].tsx";
import CartPage from "./pages/customer/cart.tsx";
import OrdersPage from "./pages/customer/orders/index.tsx";
import OrderDetailPage from "./pages/customer/orders/[id].tsx";
import AdminOrdersPage from "./pages/admin/orders/index.tsx";
import AdminOrderDetailPage from "./pages/admin/orders/[id].tsx";
import AdminCustomersPage from "./pages/admin/customers/index.tsx";
import CustomerFormPage from "./pages/admin/customers/[id].tsx";
import CustomerPricesPage from "./pages/admin/customers/prices.tsx";
import AdminInventoryPage from "./pages/admin/inventory/index.tsx";
import AdminMaterialsPage from "./pages/admin/materials/index.tsx";
import MaterialFormPage from "./pages/admin/materials/[id].tsx";
import MaterialTransactionsPage from "./pages/admin/materials/transactions.tsx";
import AdminDashboard from "./pages/admin/dashboard.tsx";
import AdminLogin from "./pages/admin/login.tsx";
import AdminRegister from "./pages/admin/register.tsx";
import AdminProductsPage from "./pages/admin/products/index.tsx";
import AdminProductFormPage from "./pages/admin/products/[id].tsx";
import AdminBomPage from "./pages/admin/bom/index.tsx";
import AdminAnalyticsPage from "./pages/admin/analytics/index.tsx";
import AdminAiPage from "./pages/admin/ai/index.tsx";
import AdminSettingsPage from "./pages/admin/settings/index.tsx";
import AdminSuppliersPage from "./pages/admin/suppliers/index.tsx";
import SupplierFormPage from "./pages/admin/suppliers/[id].tsx";
import AdminPurchaseOrdersPage from "./pages/admin/purchase-orders/index.tsx";
import PurchaseOrderFormPage from "./pages/admin/purchase-orders/[id].tsx";
import AdminCategoriesPage from "./pages/admin/categories/index.tsx";
import MonthlyInvoicePage from "./pages/admin/invoices/monthly.tsx";
import BatchLabelsPage from "./pages/admin/documents/labels.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/customer/login" replace />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/customer/register" element={<CustomerRegister />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route
          path="/customer"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/products/:id"
          element={
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute requireAdmin>
              <AdminOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders/:id"
          element={
            <ProtectedRoute requireAdmin>
              <AdminOrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute requireAdmin>
              <AdminCustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers/:id"
          element={
            <ProtectedRoute requireAdmin>
              <CustomerFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers/:id/prices"
          element={
            <ProtectedRoute requireAdmin>
              <CustomerPricesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute requireAdmin>
              <AdminInventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/materials"
          element={
            <ProtectedRoute requireAdmin>
              <AdminMaterialsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/materials/:id"
          element={
            <ProtectedRoute requireAdmin>
              <MaterialFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/materials/transactions"
          element={
            <ProtectedRoute requireAdmin>
              <MaterialTransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute requireAdmin>
              <AdminProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/:id"
          element={
            <ProtectedRoute requireAdmin>
              <AdminProductFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bom"
          element={
            <ProtectedRoute requireAdmin>
              <AdminBomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requireAdmin>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ai"
          element={
            <ProtectedRoute requireAdmin>
              <AdminAiPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireAdmin>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/suppliers"
          element={
            <ProtectedRoute requireAdmin>
              <AdminSuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/suppliers/:id"
          element={
            <ProtectedRoute requireAdmin>
              <SupplierFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/purchase-orders"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/purchase-orders/:id"
          element={
            <ProtectedRoute requireAdmin>
              <PurchaseOrderFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute requireAdmin>
              <AdminCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/invoices/monthly"
          element={
            <ProtectedRoute requireAdmin>
              <MonthlyInvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/documents/labels"
          element={
            <ProtectedRoute requireAdmin>
              <BatchLabelsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

