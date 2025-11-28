import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CustomerLogin from "./pages/customer/login.tsx";
import CustomerRegister from "./pages/customer/register.tsx";
import ProductsPage from "./pages/customer/products/index.tsx";
import ProductDetailPage from "./pages/customer/products/[id].tsx";
import CartPage from "./pages/customer/cart.tsx";
import OrdersPage from "./pages/customer/orders/index.tsx";
import OrderDetailPage from "./pages/customer/orders/[id].tsx";
import AdminOrdersPage from "./pages/admin/orders/index.tsx";
import AdminOrderDetailPage from "./pages/admin/orders/[id].tsx";
import AdminCustomersPage from "./pages/admin/customers/index.tsx";
import CustomerFormPage from "./pages/admin/customers/[id].tsx";
import AdminInventoryPage from "./pages/admin/inventory/index.tsx";
import AdminMaterialsPage from "./pages/admin/materials/index.tsx";
import MaterialFormPage from "./pages/admin/materials/[id].tsx";
import MaterialTransactionsPage from "./pages/admin/materials/transactions.tsx";
import AdminDashboard from "./pages/admin/dashboard.tsx";
import AdminLogin from "./pages/admin/login.tsx";
import AdminRegister from "./pages/admin/register.tsx";
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;

