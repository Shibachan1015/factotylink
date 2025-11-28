import { ReactNode } from "react";
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
      label: "在庫管理",
      url: "/admin/inventory",
    },
    {
      label: "材料在庫管理",
      url: "/admin/materials",
    },
  ];

  const navigationItems = isAdmin ? adminNavigationItems : customerNavigationItems;

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      userMenu={
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
        />
      }
    />
  );

  return (
    <Frame
      navigation={
        <Navigation
          location={location.pathname}
          navigation={navigationItems.map((item) => ({
            label: item.label,
            url: item.url,
            onClick: () => navigate(item.url),
          }))}
        />
      }
      topBar={topBarMarkup}
    >
      {children}
    </Frame>
  );
}

