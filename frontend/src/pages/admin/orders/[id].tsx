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
  Select,
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
  const [generating, setGenerating] = useState<string | null>(null);
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

  const handleGenerateDocument = async (type: "delivery_note" | "invoice" | "label") => {
    if (!order) return;

    setGenerating(type);
    setError(null);

    try {
      // まず帳票を生成
      const createResponse = await fetch(`/api/documents/${type}/${order.id}`, {
        method: "POST",
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        setError(errorData.error || "帳票の生成に失敗しました");
        setGenerating(null);
        return;
      }

      // 生成された帳票のHTMLを表示
      const htmlResponse = await fetch(`/api/documents/${order.id}/${type}`);
      if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
        }
        alert(`${type === "delivery_note" ? "納品書" : type === "invoice" ? "請求書" : "ラベル"}を生成しました`);
      } else {
        setError("帳票の表示に失敗しました");
      }
    } catch (err) {
      setError("帳票生成中にエラーが発生しました");
    } finally {
      setGenerating(null);
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
      secondaryActions={[
        {
          content: "納品書",
          onAction: () => handleGenerateDocument("delivery_note"),
          loading: generating === "delivery_note",
        },
        {
          content: "請求書",
          onAction: () => handleGenerateDocument("invoice"),
          loading: generating === "invoice",
        },
        {
          content: "ラベル",
          onAction: () => handleGenerateDocument("label"),
          loading: generating === "label",
        },
      ]}
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
              <InlineStack gap="200" blockAlign="center">
                <Text variant="bodyMd" as="span">
                  ステータス:
                </Text>
                <Select
                  label=""
                  labelHidden
                  options={statusOptions}
                  value={status}
                  onChange={(value) => setStatus(value as OrderStatus)}
                />
              </InlineStack>
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
