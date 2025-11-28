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
  TextField,
  Button,
  Stack,
} from "@shopify/polaris";
import type { OrderStatus } from "../../../types.ts";

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  ordered_at: string;
  shipped_at: string | null;
  customers: {
    company_name: string;
  };
  order_items: Array<{
    product_name: string;
    quantity: number;
  }>;
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, customerFilter, startDate, endDate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter.length > 0) {
        params.append("status", statusFilter[0]);
      }
      if (customerFilter) {
        params.append("customer_id", customerFilter);
      }
      if (startDate) {
        params.append("start_date", startDate);
      }
      if (endDate) {
        params.append("end_date", endDate);
      }

      const response = await fetch(`/api/admin/orders?${params}`);

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
        {
          key: "date",
          label: "日付",
          filter: (
            <Stack vertical>
              <TextField
                label="開始日"
                type="date"
                value={startDate}
                onChange={setStartDate}
              />
              <TextField
                label="終了日"
                type="date"
                value={endDate}
                onChange={setEndDate}
              />
            </Stack>
          ),
        },
      ]}
      onQueryChange={() => {}}
      onQueryClear={() => {}}
      onClearAll={() => {
        setStatusFilter([]);
        setCustomerFilter("");
        setStartDate("");
        setEndDate("");
      }}
    />
  );

  return (
    <Page title="受注管理">
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
                onClick={() => navigate(`/admin/orders/${order.id}`)}
              >
                <Stack>
                  <Stack.Item fill>
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      注文番号: {order.order_number}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="p">
                      得意先: {order.customers.company_name}
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

