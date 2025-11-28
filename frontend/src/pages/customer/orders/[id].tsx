import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  Layout,
  DataTable,
  Text,
  Badge,
  Banner,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import type { OrderStatus } from "../../../types.ts";

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  ordered_at: string;
  shipped_at: string | null;
  order_items: Array<{
    product_name: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);

  const fetchOrder = async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setOrder(data.order);
      } else {
        setError(data.error || "注文の取得に失敗しました");
      }
    } catch (err) {
      setError("注文の取得中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusMap = {
      new: { tone: "info" as const, label: "新規" },
      manufacturing: { tone: "attention" as const, label: "製造中" },
      completed: { tone: "success" as const, label: "製造完了" },
      shipped: { tone: "success" as const, label: "出荷済み" },
    };
    const config = statusMap[status];
    return <Badge tone={config.tone}>{config.label}</Badge>;
  };

  if (loading) {
    return <Page title="注文詳細"><Card><Text as="p">読み込み中...</Text></Card></Page>;
  }

  if (error || !order) {
    return (
      <Page title="注文詳細">
        <Card>
          <Banner tone="critical">{error || "注文が見つかりません"}</Banner>
        </Card>
      </Page>
    );
  }

  const rows = order.order_items.map((item) => [
    item.product_name,
    item.sku || "-",
    item.quantity.toString(),
    `¥${item.unit_price.toLocaleString()}`,
    `¥${item.subtotal.toLocaleString()}`,
  ]);

  return (
    <Page
      title={`注文詳細: ${order.order_number}`}
      backAction={{ onAction: () => navigate("/customer/orders") }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="bodyMd" as="p">
                  注文日: {new Date(order.ordered_at).toLocaleString("ja-JP")}
                </Text>
                {getStatusBadge(order.status)}
              </InlineStack>
              {order.shipped_at && (
                <Text variant="bodyMd" as="p">
                  出荷日: {new Date(order.shipped_at).toLocaleString("ja-JP")}
                </Text>
              )}
              {order.notes && (
                <Text variant="bodyMd" as="p">
                  備考: {order.notes}
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <DataTable
              columnContentTypes={["text", "text", "numeric", "numeric", "numeric"]}
              headings={["商品名", "SKU", "数量", "単価", "小計"]}
              rows={rows}
            />
            <div style={{padding: "16px", borderTop: "1px solid #e1e3e5"}}>
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h3">
                  合計
                </Text>
                <Text variant="headingLg" as="p">
                  ¥{order.total_amount.toLocaleString()}
                </Text>
              </InlineStack>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
