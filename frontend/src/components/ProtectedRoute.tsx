import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const customerToken = localStorage.getItem("customerToken");
  const adminToken = localStorage.getItem("adminToken");

  // 管理者権限が必要な場合
  if (requireAdmin) {
    if (!adminToken) {
      return <Navigate to="/admin/login" replace />;
    }
    return <>{children}</>;
  }

  // 一般認証が必要な場合（得意先または管理者）
  if (requireAuth && !customerToken && !adminToken) {
    return <Navigate to="/customer/login" replace />;
  }

  return <>{children}</>;
}

