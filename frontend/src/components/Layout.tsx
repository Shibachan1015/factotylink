import { ReactNode, useState, useCallback } from "react";
import { Frame, Navigation, TopBar } from "@shopify/polaris";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.ts";

interface LayoutProps {
  children: ReactNode;
  isAdmin?: boolean;
}

export default function Layout({ children, isAdmin = false }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [userMenuActive, setUserMenuActive] = useState(false);
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);

  const toggleUserMenuActive = useCallback(
    () => setUserMenuActive((active) => !active),
    [],
  );

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((active) => !active),
    [],
  );

  const customerNavigationItems = [
    {
      label: "商品一覧",
      url: "/customer/products",
    },
    {
      label: "カート",
      url: "/customer/cart",
    },
    {
      label: "注文履歴",
      url: "/customer/orders",
    },
  ];

  const adminNavigationItems = [
    {
      label: "ダッシュボード",
      url: "/admin",
    },
    {
      label: "受注管理",
      url: "/admin/orders",
    },
    {
      label: "得意先管理",
      url: "/admin/customers",
    },
    {
      label: "商品管理",
      url: "/admin/products",
    },
    {
      label: "カテゴリ管理",
      url: "/admin/categories",
    },
    {
      label: "在庫管理",
      url: "/admin/inventory",
    },
    {
      label: "材料在庫管理",
      url: "/admin/materials",
    },
    {
      label: "BOM管理",
      url: "/admin/bom",
    },
    {
      label: "仕入れ先管理",
      url: "/admin/suppliers",
    },
    {
      label: "発注書管理",
      url: "/admin/purchase-orders",
    },
    {
      label: "月次請求書",
      url: "/admin/invoices/monthly",
    },
    {
      label: "経営分析",
      url: "/admin/analytics",
    },
    {
      label: "AIアドバイス",
      url: "/admin/ai",
    },
    {
      label: "設定",
      url: "/admin/settings",
    },
  ];

  const navigationItems = isAdmin ? adminNavigationItems : customerNavigationItems;

  const userMenuMarkup = (
    <TopBar.UserMenu
      actions={[
        {
          items: [
            {
              content: "ログアウト",
              onAction: logout,
            },
          ],
        },
      ]}
      name=""
      initials="U"
      open={userMenuActive}
      onToggle={toggleUserMenuActive}
    />
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      userMenu={userMenuMarkup}
      onNavigationToggle={toggleMobileNavigationActive}
    />
  );

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={navigationItems.map((item) => ({
          label: item.label,
          url: item.url,
          onClick: () => {
            navigate(item.url);
            setMobileNavigationActive(false);
          },
          selected: location.pathname === item.url,
        }))}
      />
    </Navigation>
  );

  return (
    <Frame
      navigation={navigationMarkup}
      topBar={topBarMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={toggleMobileNavigationActive}
    >
      {children}
    </Frame>
  );
}
