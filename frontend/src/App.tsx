import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CustomerLogin from "./pages/customer/login.tsx";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/customer/login" replace />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/customer/products" element={<ProductsPage />} />
        <Route path="/customer/products/:id" element={<ProductDetailPage />} />
        <Route path="/customer/cart" element={<CartPage />} />
        <Route path="/customer/orders" element={<OrdersPage />} />
        <Route path="/customer/orders/:id" element={<OrderDetailPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="/admin/customers" element={<AdminCustomersPage />} />
        <Route path="/admin/customers/:id" element={<CustomerFormPage />} />
        <Route path="/admin/inventory" element={<AdminInventoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

