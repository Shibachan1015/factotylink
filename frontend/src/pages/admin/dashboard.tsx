import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  Layout,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Badge,
} from "@shopify/polaris";
import { apiGet } from "../../utils/api";

interface DashboardStats {
  totalOrders: number;
  newOrders: number;
  manufacturingOrders: number;
  completedOrders: number;
  shippedOrders: number;
  todaySales: number;
  monthSales: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  ordered_at: string;
  customers?: {
    company_name: string;
  };
}

interface ProductStockAlert {
  id: number;
  title: string;
  sku: string | null;
  inventory_quantity: number;
}

interface StockAlert {
  id: string;
  name: string;
  code: string | null;
  current_stock: number;
  safety_stock: number;
  unit: string;
  severity: "critical" | "warning" | "info";
  shortage: number;
}

interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [productAlerts, setProductAlerts] = useState<ProductStockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchStats();
    fetchStockAlerts();
    fetchProductAlerts();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/orders");
      const data = await response.json();

      if (response.ok) {
        const orders = data.orders || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 今日の売上
        const todaySales = orders
          .filter((o: { ordered_at: string; status: string }) => {
            const orderDate = new Date(o.ordered_at);
            return orderDate >= today && o.status !== "cancelled";
          })
          .reduce((sum: number, o: { total_amount: number }) => sum + o.total_amount, 0);

        // 今月の売上
        const monthSales = orders
          .filter((o: { ordered_at: string; status: string }) => {
            const orderDate = new Date(o.ordered_at);
            return orderDate >= firstDayOfMonth && o.status !== "cancelled";
          })
          .reduce((sum: number, o: { total_amount: number }) => sum + o.total_amount, 0);

        setStats({
          totalOrders: orders.length,
          newOrders: orders.filter((o: { status: string }) => o.status === "new").length,
          manufacturingOrders: orders.filter((o: { status: string }) => o.status === "manufacturing").length,
          completedOrders: orders.filter((o: { status: string }) => o.status === "completed").length,
          shippedOrders: orders.filter((o: { status: string }) => o.status === "shipped").length,
          todaySales,
          monthSales,
        });

        // 最近の注文を取得（新しい順に5件）
        setRecentOrders(
          orders
            .sort((a: { ordered_at: string }, b: { ordered_at: string }) =>
              new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime()
            )
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductAlerts = async () => {
    try {
      const response = await fetch(`/api/admin/products?shop_id=${shopId}`);
      const data = await response.json();
      if (response.ok) {
        // 在庫が10以下の商品を抽出
        const lowStockProducts = (data.products || [])
          .filter((p: { inventory_quantity: number }) => p.inventory_quantity <= 10)
          .sort((a: { inventory_quantity: number }, b: { inventory_quantity: number }) =>
            a.inventory_quantity - b.inventory_quantity
          )
          .slice(0, 5);
        setProductAlerts(lowStockProducts);
      }
    } catch (error) {
      console.error("Failed to fetch product alerts:", error);
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const data = await apiGet<{ alerts: StockAlert[]; summary: AlertSummary }>(
        `/api/admin/materials/alerts/low-stock?shop_id=${shopId}`
      );
      setStockAlerts(data.alerts || []);
      setAlertSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch stock alerts:", error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      critical: { tone: "critical" as const, label: "緊急" },
      warning: { tone: "warning" as const, label: "注意" },
      info: { tone: "info" as const, label: "情報" },
    };
    const { tone, label } = config[severity as keyof typeof config] || config.info;
    return <Badge tone={tone}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { tone: "info" | "attention" | "success"; label: string }> = {
      new: { tone: "info", label: "新規" },
      manufacturing: { tone: "attention", label: "製造中" },
      completed: { tone: "success", label: "製造完了" },
      shipped: { tone: "success", label: "出荷済み" },
    };
    const config = statusMap[status] || { tone: "info" as const, label: status };
    return <Badge tone={config.tone}>{config.label}</Badge>;
  };

  if (loading) {
    return <Page title="ダッシュボード"><Card><Text as="p">読み込み中...</Text></Card></Page>;
  }

  return (
    <Page title="ダッシュボード">
      <Layout>
        {/* 在庫アラート */}
        {alertSummary && alertSummary.total > 0 && (
          <Layout.Section>
            <Banner
              title={`在庫アラート: ${alertSummary.total}件`}
              tone={alertSummary.critical > 0 ? "critical" : alertSummary.warning > 0 ? "warning" : "info"}
              action={{
                content: "材料在庫を確認",
                onAction: () => navigate("/admin/materials"),
              }}
            >
              <BlockStack gap="200">
                <Text as="p">
                  安全在庫を下回っている材料があります。
                  {alertSummary.critical > 0 && ` 緊急: ${alertSummary.critical}件`}
                  {alertSummary.warning > 0 && ` 注意: ${alertSummary.warning}件`}
                  {alertSummary.info > 0 && ` 情報: ${alertSummary.info}件`}
                </Text>
                {stockAlerts.slice(0, 5).map((alert) => (
                  <InlineStack key={alert.id} gap="200" blockAlign="center">
                    {getSeverityBadge(alert.severity)}
                    <Text as="span" fontWeight="bold">{alert.name}</Text>
                    <Text as="span" tone="subdued">
                      現在: {alert.current_stock} {alert.unit} / 安全在庫: {alert.safety_stock} {alert.unit}
                    </Text>
                    <Text as="span" tone="critical">
                      (不足: {alert.shortage} {alert.unit})
                    </Text>
                  </InlineStack>
                ))}
                {stockAlerts.length > 5 && (
                  <Text as="p" tone="subdued">他 {stockAlerts.length - 5}件のアラートがあります</Text>
                )}
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        {/* 売上サマリー */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">売上サマリー</Text>
              {stats && (
                <InlineStack gap="400" wrap>
                  <div style={{ padding: "16px", backgroundColor: "#f4f6f8", borderRadius: "8px", minWidth: "150px" }}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">今日の売上</Text>
                      <Text variant="heading2xl" as="p">¥{stats.todaySales.toLocaleString()}</Text>
                    </BlockStack>
                  </div>
                  <div style={{ padding: "16px", backgroundColor: "#f4f6f8", borderRadius: "8px", minWidth: "150px" }}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">今月の売上</Text>
                      <Text variant="heading2xl" as="p">¥{stats.monthSales.toLocaleString()}</Text>
                    </BlockStack>
                  </div>
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* 注文統計 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">注文統計</Text>
              {stats && (
                <InlineStack gap="400" wrap>
                  <div style={{ padding: "16px", backgroundColor: "#f4f6f8", borderRadius: "8px", minWidth: "100px" }}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">総注文数</Text>
                      <Text variant="heading2xl" as="p">{stats.totalOrders}</Text>
                    </BlockStack>
                  </div>
                  <div style={{ padding: "16px", backgroundColor: "#eaf5ff", borderRadius: "8px", minWidth: "100px" }}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">新規</Text>
                      <Text variant="heading2xl" as="p">{stats.newOrders}</Text>
                    </BlockStack>
                  </div>
                  <div style={{ padding: "16px", backgroundColor: "#fff8e5", borderRadius: "8px", minWidth: "100px" }}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">製造中</Text>
                      <Text variant="heading2xl" as="p">{stats.manufacturingOrders}</Text>
                    </BlockStack>
                  </div>
                  <div style={{ padding: "16px", backgroundColor: "#e5f7e5", borderRadius: "8px", minWidth: "100px" }}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">製造完了</Text>
                      <Text variant="heading2xl" as="p">{stats.completedOrders}</Text>
                    </BlockStack>
                  </div>
                  <div style={{ padding: "16px", backgroundColor: "#e5f7e5", borderRadius: "8px", minWidth: "100px" }}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">出荷済み</Text>
                      <Text variant="heading2xl" as="p">{stats.shippedOrders}</Text>
                    </BlockStack>
                  </div>
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* 最近の注文 */}
        {recentOrders.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingLg" as="h2">最近の注文</Text>
                  <Button onClick={() => navigate("/admin/orders")}>すべて見る</Button>
                </InlineStack>
                <BlockStack gap="200">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        padding: "12px",
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <InlineStack gap="200" blockAlign="center">
                            <Text variant="bodyMd" fontWeight="bold" as="span">
                              {order.order_number}
                            </Text>
                            {getStatusBadge(order.status)}
                          </InlineStack>
                          <Text variant="bodySm" tone="subdued" as="p">
                            {order.customers?.company_name || "不明な得意先"} - {new Date(order.ordered_at).toLocaleString("ja-JP")}
                          </Text>
                        </BlockStack>
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                          ¥{order.total_amount.toLocaleString()}
                        </Text>
                      </InlineStack>
                    </div>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* 商品在庫アラート */}
        {productAlerts.length > 0 && (
          <Layout.Section>
            <Banner
              title={`商品在庫アラート: ${productAlerts.length}件`}
              tone="warning"
              action={{
                content: "在庫管理を確認",
                onAction: () => navigate("/admin/inventory"),
              }}
            >
              <BlockStack gap="200">
                <Text as="p">在庫が少なくなっている商品があります。</Text>
                {productAlerts.map((product) => (
                  <InlineStack key={product.id} gap="200" blockAlign="center">
                    <Badge tone={product.inventory_quantity === 0 ? "critical" : "warning"}>
                      {product.inventory_quantity === 0 ? "在庫切れ" : "残りわずか"}
                    </Badge>
                    <Text as="span" fontWeight="bold">{product.title}</Text>
                    {product.sku && <Text as="span" tone="subdued">({product.sku})</Text>}
                    <Text as="span" tone="critical">在庫: {product.inventory_quantity}</Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">
                クイックアクセス
              </Text>
              <Button onClick={() => navigate("/admin/orders")} fullWidth>
                受注管理
              </Button>
              <Button onClick={() => navigate("/admin/customers")} fullWidth>
                得意先管理
              </Button>
              <Button onClick={() => navigate("/admin/products")} fullWidth>
                商品管理
              </Button>
              <Button onClick={() => navigate("/admin/inventory")} fullWidth>
                在庫管理
              </Button>
              <Button onClick={() => navigate("/admin/materials")} fullWidth>
                材料在庫管理
              </Button>
              <Button onClick={() => navigate("/admin/bom")} fullWidth>
                BOM（部品表）管理
              </Button>
              <Button onClick={() => navigate("/admin/suppliers")} fullWidth>
                仕入れ先管理
              </Button>
              <Button onClick={() => navigate("/admin/purchase-orders")} fullWidth>
                発注書管理
              </Button>
              <Button onClick={() => navigate("/admin/analytics")} fullWidth variant="primary">
                経営分析
              </Button>
              <Button onClick={() => navigate("/admin/ai")} fullWidth>
                AIアドバイス
              </Button>
              <Button onClick={() => navigate("/admin/settings")} fullWidth>
                設定
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
