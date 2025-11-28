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
  Button,
  Select,
  Stack,
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
  customers: {
    company_name: string;
    address: string | null;
    phone: string | null;
  };
  order_items: Array<{
    product_name: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);

  useEffect(() => {
    if (order) {
      setStatus(order.status);
    }
  }, [order]);

  const fetchOrder = async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);

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

  const handleStatusUpdate = async () => {
    if (!order || !status || status === order.status) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchOrder(order.id);
      } else {
        setError(data.error || "ステータスの更新に失敗しました");
      }
    } catch (err) {
      setError("ステータス更新中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusMap = {
      new: { status: "info" as const, label: "新規" },
      manufacturing: { status: "attention" as const, label: "製造中" },
      completed: { status: "success" as const, label: "製造完了" },
      shipped: { status: "success" as const, label: "出荷済み" },
    };
    const config = statusMap[status];
    return <Badge status={config.status}>{config.label}</Badge>;
  };

  if (loading) {
    return <Page title="注文詳細"><Card><Text>読み込み中...</Text></Card></Page>;
  }

  if (error || !order) {
    return (
      <Page title="注文詳細">
        <Card>
          <Banner status="critical">{error || "注文が見つかりません"}</Banner>
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

  const statusOptions = [
    { label: "新規", value: "new" },
    { label: "製造中", value: "manufacturing" },
    { label: "製造完了", value: "completed" },
    { label: "出荷済み", value: "shipped" },
  ];

  return (
    <Page
      title={`注文詳細: ${order.order_number}`}
      backAction={{ onAction: () => navigate("/admin/orders") }}
      primaryAction={{
        content: "ステータスを更新",
        onAction: handleStatusUpdate,
        loading: saving,
        disabled: !status || status === order.status,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Stack vertical spacing="loose">
              <Stack distribution="equalSpacing">
                <Text variant="bodyMd" as="p">
                  注文日: {new Date(order.ordered_at).toLocaleString("ja-JP")}
                </Text>
                {getStatusBadge(order.status)}
              </Stack>
              {order.shipped_at && (
                <Text variant="bodyMd" as="p">
                  出荷日: {new Date(order.shipped_at).toLocaleString("ja-JP")}
                </Text>
              )}
              <Stack>
                <Text variant="bodyMd" as="span">
                  ステータス:
                </Text>
                <Select
                  options={statusOptions}
                  value={status}
                  onChange={(value) => setStatus(value as OrderStatus)}
                />
              </Stack>
              <Text variant="bodyMd" as="p">
                得意先: {order.customers.company_name}
              </Text>
              {order.customers.address && (
                <Text variant="bodyMd" as="p">
                  住所: {order.customers.address}
                </Text>
              )}
              {order.customers.phone && (
                <Text variant="bodyMd" as="p">
                  電話: {order.customers.phone}
                </Text>
              )}
              {order.notes && (
                <Text variant="bodyMd" as="p">
                  備考: {order.notes}
                </Text>
              )}
            </Stack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <DataTable
              columnContentTypes={["text", "text", "numeric", "numeric", "numeric"]}
              headings={["商品名", "SKU", "数量", "単価", "小計"]}
              rows={rows}
            />
            <Card.Section>
              <Stack distribution="equalSpacing">
                <Text variant="headingMd" as="h3">
                  合計
                </Text>
                <Text variant="headingLg" as="p">
                  ¥{order.total_amount.toLocaleString()}
                </Text>
              </Stack>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

