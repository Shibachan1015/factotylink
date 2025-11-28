import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  Button,
  Banner,
  DataTable,
  Badge,
  Checkbox,
  TextField,
} from "@shopify/polaris";
import { apiGet } from "../../../utils/api";

interface Order {
  id: string;
  order_number: string;
  status: string;
  ordered_at: string;
  customers: {
    company_name: string;
    address: string | null;
  };
  order_items: Array<{
    product_name: string;
    quantity: number;
  }>;
  total_items: number;
}

export default function BatchLabelsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("completed");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("shop_id", shopId);
      if (statusFilter) params.append("status", statusFilter);
      if (dateFrom) params.append("start_date", dateFrom);
      if (dateTo) params.append("end_date", dateTo);

      const response = await apiGet<{ orders: Order[] }>(
        `/api/admin/orders?${params}`
      );

      // 注文アイテムの合計数を計算
      const ordersWithTotal = (response.orders || []).map((order) => ({
        ...order,
        total_items: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
      }));

      setOrders(ordersWithTotal);
      setSelectedOrders(new Set());
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("注文の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const openLabel = async (orderId: string) => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch(`/api/documents/${orderId}/label`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const html = await response.text();
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      } else {
        alert("ラベルの生成に失敗しました");
      }
    } catch (err) {
      console.error("Label generation error:", err);
      alert("ラベルの生成に失敗しました");
    }
  };

  const openSelectedLabels = async () => {
    if (selectedOrders.size === 0) {
      alert("ラベルを印刷する注文を選択してください");
      return;
    }

    const token = localStorage.getItem("adminToken");

    for (const orderId of selectedOrders) {
      try {
        const response = await fetch(`/api/documents/${orderId}/label`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const html = await response.text();
          const win = window.open("", "_blank");
          if (win) {
            win.document.write(html);
            win.document.close();
          }
        }
      } catch (err) {
        console.error(`Label generation error for ${orderId}:`, err);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  const openAllInOne = async () => {
    if (selectedOrders.size === 0) {
      alert("ラベルを印刷する注文を選択してください");
      return;
    }

    const token = localStorage.getItem("adminToken");
    let allLabelsHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>配送ラベル一括印刷</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: "Hiragino Sans", "Meiryo", sans-serif; margin: 0; padding: 0; }
    .page-break { page-break-after: always; }
    .label-container { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2mm; }
    .label { border: 1px solid #000; padding: 5mm; text-align: center; page-break-inside: avoid; height: 45mm; }
    .label .order-number { font-size: 8px; color: #666; margin-bottom: 2mm; }
    .label .customer { font-size: 10px; font-weight: bold; margin-bottom: 2mm; }
    .label .product-name { font-weight: bold; margin: 2mm 0; }
    .label .sku { font-size: 10px; margin: 1mm 0; }
    .order-header { margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-bottom: 2px solid #333; }
    .order-header h2 { margin: 0; font-size: 14px; }
  </style>
</head>
<body>
`;

    let pageIndex = 0;
    for (const orderId of selectedOrders) {
      try {
        const order = orders.find((o) => o.id === orderId);
        if (!order) continue;

        // 注文の詳細を取得
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) continue;

        const data = await response.json();
        const orderDetail = data.order;

        if (pageIndex > 0) {
          allLabelsHtml += '<div class="page-break"></div>';
        }

        allLabelsHtml += `
  <div class="order-header">
    <h2>注文番号: ${orderDetail.order_number} | ${orderDetail.customers?.company_name || "不明"}</h2>
  </div>
  <div class="label-container">
`;

        // 各商品のラベルを生成
        for (const item of orderDetail.order_items) {
          for (let i = 0; i < item.quantity; i++) {
            allLabelsHtml += `
      <div class="label">
        <div class="order-number">${orderDetail.order_number}</div>
        <div class="customer">${orderDetail.customers?.company_name || ""}</div>
        <div class="product-name">${item.product_name}</div>
        <div class="sku">SKU: ${item.sku || "-"}</div>
      </div>
`;
          }
        }

        allLabelsHtml += '</div>';
        pageIndex++;
      } catch (err) {
        console.error(`Error processing order ${orderId}:`, err);
      }
    }

    allLabelsHtml += `
</body>
</html>
`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(allLabelsHtml);
      win.document.close();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { tone: "info" | "attention" | "success" | "warning"; label: string }> = {
      new: { tone: "info", label: "新規" },
      manufacturing: { tone: "attention", label: "製造中" },
      completed: { tone: "success", label: "製造完了" },
      shipped: { tone: "success", label: "出荷済み" },
    };
    const config = statusMap[status] || { tone: "info", label: status };
    return <Badge tone={config.tone}>{config.label}</Badge>;
  };

  const rows = orders.map((order) => [
    <Checkbox
      key={order.id}
      label=""
      labelHidden
      checked={selectedOrders.has(order.id)}
      onChange={() => handleSelectOrder(order.id)}
    />,
    order.order_number,
    order.customers?.company_name || "不明",
    getStatusBadge(order.status),
    new Date(order.ordered_at).toLocaleDateString("ja-JP"),
    order.total_items,
    <Button
      key={`btn-${order.id}`}
      size="slim"
      onClick={() => openLabel(order.id)}
    >
      ラベル表示
    </Button>,
  ]);

  const totalLabels = orders
    .filter((o) => selectedOrders.has(o.id))
    .reduce((sum, o) => sum + o.total_items, 0);

  return (
    <Page
      title="配送ラベル一括印刷"
      backAction={{ onAction: () => navigate("/admin") }}
      primaryAction={{
        content: `選択した${selectedOrders.size}件を一括印刷`,
        onAction: openAllInOne,
        disabled: selectedOrders.size === 0,
      }}
      secondaryActions={[
        {
          content: "個別に開く",
          onAction: openSelectedLabels,
          disabled: selectedOrders.size === 0,
        },
      ]}
    >
      <BlockStack gap="400">
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              フィルター
            </Text>
            <InlineStack gap="400" blockAlign="end">
              <Select
                label="ステータス"
                options={[
                  { label: "すべて", value: "" },
                  { label: "新規", value: "new" },
                  { label: "製造中", value: "manufacturing" },
                  { label: "製造完了", value: "completed" },
                  { label: "出荷済み", value: "shipped" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <TextField
                label="開始日"
                type="date"
                value={dateFrom}
                onChange={setDateFrom}
                autoComplete="off"
              />
              <TextField
                label="終了日"
                type="date"
                value={dateTo}
                onChange={setDateTo}
                autoComplete="off"
              />
              <Button onClick={fetchOrders} loading={loading}>
                検索
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">
                注文一覧
              </Text>
              {selectedOrders.size > 0 && (
                <Text as="p" fontWeight="bold">
                  選択中: {selectedOrders.size}件 / ラベル枚数: {totalLabels}枚
                </Text>
              )}
            </InlineStack>

            {orders.length === 0 ? (
              <Text as="p" tone="subdued">
                該当する注文がありません
              </Text>
            ) : (
              <>
                <InlineStack gap="200" blockAlign="center">
                  <Checkbox
                    label="すべて選択"
                    checked={
                      selectedOrders.size === orders.length && orders.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                  <Text as="span" tone="subdued">
                    ({selectedOrders.size}/{orders.length}件選択中)
                  </Text>
                </InlineStack>

                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "numeric",
                    "text",
                  ]}
                  headings={[
                    "",
                    "注文番号",
                    "得意先",
                    "ステータス",
                    "注文日",
                    "商品数",
                    "操作",
                  ]}
                  rows={rows}
                />
              </>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h2">
              印刷について
            </Text>
            <Text as="p" tone="subdued">
              「一括印刷」：選択した注文のラベルを1つのページにまとめて表示します。注文ごとにページが分かれます。
            </Text>
            <Text as="p" tone="subdued">
              「個別に開く」：選択した注文ごとに別タブでラベルを開きます。ブラウザのポップアップブロックを許可してください。
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
