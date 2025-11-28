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
  const [loading, setLoading] = useState(true);

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchStats();
    fetchStockAlerts();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/orders");
      const data = await response.json();

      if (response.ok) {
        const orders = data.orders || [];
        setStats({
          totalOrders: orders.length,
          newOrders: orders.filter((o: { status: string }) => o.status === "new").length,
          manufacturingOrders: orders.filter((o: { status: string }) => o.status === "manufacturing").length,
          completedOrders: orders.filter((o: { status: string }) => o.status === "completed").length,
          shippedOrders: orders.filter((o: { status: string }) => o.status === "shipped").length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
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

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">
                注文統計
              </Text>
              {stats && (
                <InlineStack gap="400" wrap>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">総注文数</Text>
                      <Text variant="heading2xl" as="p">{stats.totalOrders}</Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">新規</Text>
                      <Text variant="heading2xl" as="p">{stats.newOrders}</Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">製造中</Text>
                      <Text variant="heading2xl" as="p">{stats.manufacturingOrders}</Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">製造完了</Text>
                      <Text variant="heading2xl" as="p">{stats.completedOrders}</Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued" as="p">出荷済み</Text>
                      <Text variant="heading2xl" as="p">{stats.shippedOrders}</Text>
                    </BlockStack>
                  </Card>
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
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
