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
} from "@shopify/polaris";
import type { OrderStatus } from "../../../../types.ts";

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

  const filterControl = (
    <Filters
      queryValue=""
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
      ]}
      onQueryChange={() => {}}
      onQueryClear={() => {}}
      onClearAll={() => setStatusFilter([])}
    />
  );

  return (
    <Page title="注文履歴">
      <Card>
        {filterControl}
        <ResourceList
          resourceName={{ singular: "注文", plural: "注文" }}
          items={orders}
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
                <Stack>
                  <Stack.Item fill>
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      注文番号: {order.order_number}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="p">
                      {new Date(order.ordered_at).toLocaleString("ja-JP")}
                    </Text>
                    <Text variant="bodySm" as="p">
                      商品数: {itemCount}点
                    </Text>
                  </Stack.Item>
                  <Stack.Item>
                    {getStatusBadge(order.status)}
                  </Stack.Item>
                  <Stack.Item>
                    <Text variant="bodyMd" fontWeight="bold" as="p">
                      ¥{order.total_amount.toLocaleString()}
                    </Text>
                  </Stack.Item>
                </Stack>
              </ResourceItem>
            );
          }}
        />
      </Card>
    </Page>
  );
}

