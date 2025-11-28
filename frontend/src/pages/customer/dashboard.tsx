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
  Badge,
} from "@shopify/polaris";
import LayoutComponent from "../../components/Layout.tsx";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  ordered_at: string;
  order_items: Array<{
    product_name: string;
    quantity: number;
  }>;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  thisMonthAmount: number;
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];

        // 統計を計算
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonthAmount = orders
          .filter((o: Order) => new Date(o.ordered_at) >= firstDayOfMonth)
          .reduce((sum: number, o: Order) => sum + o.total_amount, 0);

        const pendingOrders = orders.filter(
          (o: Order) => o.status === "new" || o.status === "manufacturing"
        ).length;

        setStats({
          totalOrders: orders.length,
          pendingOrders,
          thisMonthAmount,
        });

        // 最近の注文を取得（5件）
        setRecentOrders(
          orders
            .sort((a: Order, b: Order) =>
              new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime()
            )
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
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
    return (
      <LayoutComponent>
        <Page title="ダッシュボード">
          <Card>
            <Text as="p">読み込み中...</Text>
          </Card>
        </Page>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent>
      <Page title="ダッシュボード">
        <Layout>
          {/* 統計サマリー */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingLg" as="h2">注文サマリー</Text>
                {stats && (
                  <InlineStack gap="400" wrap>
                    <div style={{ padding: "16px", backgroundColor: "#f4f6f8", borderRadius: "8px", minWidth: "150px" }}>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" tone="subdued" as="p">今月の発注額</Text>
                        <Text variant="heading2xl" as="p">¥{stats.thisMonthAmount.toLocaleString()}</Text>
                      </BlockStack>
                    </div>
                    <div style={{ padding: "16px", backgroundColor: "#eaf5ff", borderRadius: "8px", minWidth: "120px" }}>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" tone="subdued" as="p">処理中の注文</Text>
                        <Text variant="heading2xl" as="p">{stats.pendingOrders}</Text>
                      </BlockStack>
                    </div>
                    <div style={{ padding: "16px", backgroundColor: "#f4f6f8", borderRadius: "8px", minWidth: "120px" }}>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" tone="subdued" as="p">総注文数</Text>
                        <Text variant="heading2xl" as="p">{stats.totalOrders}</Text>
                      </BlockStack>
                    </div>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* 最近の注文 */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingLg" as="h2">最近の注文</Text>
                  <Button onClick={() => navigate("/customer/orders")}>すべて見る</Button>
                </InlineStack>
                {recentOrders.length > 0 ? (
                  <BlockStack gap="200">
                    {recentOrders.map((order) => {
                      const itemCount = order.order_items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      );

                      return (
                        <div
                          key={order.id}
                          style={{
                            padding: "12px",
                            backgroundColor: "#f9fafb",
                            borderRadius: "8px",
                            cursor: "pointer",
                          }}
                          onClick={() => navigate(`/customer/orders/${order.id}`)}
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
                                {new Date(order.ordered_at).toLocaleString("ja-JP")} - {itemCount}点
                              </Text>
                            </BlockStack>
                            <Text variant="bodyMd" fontWeight="bold" as="span">
                              ¥{order.total_amount.toLocaleString()}
                            </Text>
                          </InlineStack>
                        </div>
                      );
                    })}
                  </BlockStack>
                ) : (
                  <Text as="p" tone="subdued">
                    まだ注文がありません
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* クイックアクション */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">クイックアクション</Text>
                <Button variant="primary" onClick={() => navigate("/customer/products")} fullWidth>
                  商品を注文する
                </Button>
                <Button onClick={() => navigate("/customer/cart")} fullWidth>
                  カートを見る
                </Button>
                <Button onClick={() => navigate("/customer/orders")} fullWidth>
                  注文履歴
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </LayoutComponent>
  );
}
