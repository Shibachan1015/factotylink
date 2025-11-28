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
} from "@shopify/polaris";

interface DashboardStats {
  totalOrders: number;
  newOrders: number;
  manufacturingOrders: number;
  completedOrders: number;
  shippedOrders: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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

  if (loading) {
    return <Page title="ダッシュボード"><Card><Text>読み込み中...</Text></Card></Page>;
  }

  return (
    <Page title="ダッシュボード">
      <Layout>
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
                      <Text variant="bodyMd" tone="subdued">総注文数</Text>
                      <Text variant="heading2xl" as="p">{stats.totalOrders}</Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued">新規</Text>
                      <Text variant="heading2xl" as="p">{stats.newOrders}</Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued">製造中</Text>
                      <Text variant="heading2xl" as="p">{stats.manufacturingOrders}</Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued">製造完了</Text>
                      <Text variant="heading2xl" as="p">{stats.completedOrders}</Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="subdued">出荷済み</Text>
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
              <Button onClick={() => navigate("/admin/inventory")} fullWidth>
                在庫管理
              </Button>
              <Button onClick={() => navigate("/admin/materials")} fullWidth>
                材料在庫管理
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
