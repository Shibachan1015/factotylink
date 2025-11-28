import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Filters,
  ChoiceList,
  InlineStack,
  TextField,
  BlockStack,
} from "@shopify/polaris";
import type { OrderStatus } from "../../../types.ts";

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  ordered_at: string;
  order_items: Array<{
    product_name: string;
    quantity: number;
  }>;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("customerToken");
      const params = new URLSearchParams();
      if (statusFilter.length > 0) {
        params.append("status", statusFilter[0]);
      }

      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // クライアントサイドフィルタリング
  const filteredOrders = orders.filter((order) => {
    // 検索クエリでフィルタ（注文番号または商品名）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesOrderNumber = order.order_number.toLowerCase().includes(query);
      const matchesProduct = order.order_items.some((item) =>
        item.product_name.toLowerCase().includes(query)
      );
      if (!matchesOrderNumber && !matchesProduct) {
        return false;
      }
    }

    // 日付でフィルタ
    const orderDate = new Date(order.ordered_at);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (orderDate < fromDate) {
        return false;
      }
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (orderDate > toDate) {
        return false;
      }
    }

    return true;
  });

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

  const handleClearAll = () => {
    setStatusFilter([]);
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const filterControl = (
    <BlockStack gap="400">
      <Filters
        queryValue={searchQuery}
        queryPlaceholder="注文番号または商品名で検索"
        filters={[
          {
            key: "status",
            label: "ステータス",
            filter: (
              <ChoiceList
                title="ステータス"
                titleHidden
                choices={[
                  { label: "新規", value: "new" },
                  { label: "製造中", value: "manufacturing" },
                  { label: "製造完了", value: "completed" },
                  { label: "出荷済み", value: "shipped" },
                ]}
                selected={statusFilter}
                onChange={setStatusFilter}
              />
            ),
          },
          {
            key: "dateFrom",
            label: "開始日",
            filter: (
              <TextField
                label="開始日"
                type="date"
                value={dateFrom}
                onChange={setDateFrom}
                autoComplete="off"
              />
            ),
          },
          {
            key: "dateTo",
            label: "終了日",
            filter: (
              <TextField
                label="終了日"
                type="date"
                value={dateTo}
                onChange={setDateTo}
                autoComplete="off"
              />
            ),
          },
        ]}
        onQueryChange={setSearchQuery}
        onQueryClear={() => setSearchQuery("")}
        onClearAll={handleClearAll}
      />
    </BlockStack>
  );

  return (
    <Page title="注文履歴">
      <Card>
        {filterControl}
        <ResourceList
          resourceName={{ singular: "注文", plural: "注文" }}
          items={filteredOrders}
          loading={loading}
          renderItem={(order) => {
            const itemCount = order.order_items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );

            return (
              <ResourceItem
                id={order.id}
                onClick={() => navigate(`/customer/orders/${order.id}`)}
              >
                <InlineStack align="space-between" blockAlign="center" gap="400">
                  <div style={{flexGrow: 1}}>
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      注文番号: {order.order_number}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="p">
                      {new Date(order.ordered_at).toLocaleString("ja-JP")}
                    </Text>
                    <Text variant="bodySm" as="p">
                      商品数: {itemCount}点
                    </Text>
                  </div>
                  <div>
                    {getStatusBadge(order.status)}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="p">
                      ¥{order.total_amount.toLocaleString()}
                    </Text>
                  </div>
                </InlineStack>
              </ResourceItem>
            );
          }}
        />
      </Card>
    </Page>
  );
}
