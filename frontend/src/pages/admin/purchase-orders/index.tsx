import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Select,
  Banner,
} from "@shopify/polaris";
import { apiGet, apiPatch, apiDelete } from "../../../utils/api";

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  expected_delivery_date: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_at: string;
  suppliers: {
    id: string;
    name: string;
  };
}

const statusLabels: Record<string, string> = {
  draft: "下書き",
  ordered: "発注済み",
  received: "入庫済み",
  cancelled: "キャンセル",
};

const statusTones: Record<string, "info" | "success" | "warning" | "critical"> = {
  draft: "info",
  ordered: "warning",
  received: "success",
  cancelled: "critical",
};

export default function AdminPurchaseOrdersPage() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchPurchaseOrders();
  }, [statusFilter]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ shop_id: shopId });
      if (statusFilter) {
        params.append("status", statusFilter);
      }
      const data = await apiGet<{ purchase_orders: PurchaseOrder[] }>(
        `/api/admin/purchase-orders?${params}`
      );
      setPurchaseOrders(data.purchase_orders || []);
    } catch (err) {
      console.error("Failed to fetch purchase orders:", err);
      setError("発注書の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiPatch(`/api/admin/purchase-orders/${id}/status`, { status });
      setSuccess(status === "received" ? "入庫処理が完了しました" : "ステータスを更新しました");
      await fetchPurchaseOrders();
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err instanceof Error ? err.message : "ステータスの更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この発注書を削除しますか？")) return;

    try {
      await apiDelete(`/api/admin/purchase-orders/${id}`);
      setSuccess("発注書を削除しました");
      await fetchPurchaseOrders();
    } catch (err) {
      console.error("Failed to delete:", err);
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  return (
    <Page
      title="発注書管理"
      primaryAction={{
        content: "発注書を作成",
        onAction: () => navigate("/admin/purchase-orders/new"),
      }}
    >
      <BlockStack gap="400">
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}
        {success && (
          <Banner tone="success" onDismiss={() => setSuccess(null)}>
            {success}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Select
              label="ステータスで絞り込み"
              options={[
                { label: "すべて", value: "" },
                { label: "下書き", value: "draft" },
                { label: "発注済み", value: "ordered" },
                { label: "入庫済み", value: "received" },
                { label: "キャンセル", value: "cancelled" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            <ResourceList
              resourceName={{ singular: "発注書", plural: "発注書" }}
              items={purchaseOrders}
              loading={loading}
              emptyState={
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" tone="subdued">
                    発注書がありません
                  </Text>
                  <Button onClick={() => navigate("/admin/purchase-orders/new")}>
                    発注書を作成
                  </Button>
                </BlockStack>
              }
              renderItem={(order) => {
                const {
                  id,
                  order_number,
                  status,
                  total_amount,
                  expected_delivery_date,
                  suppliers,
                  created_at,
                } = order;

                return (
                  <ResourceItem
                    id={id}
                    onClick={() => navigate(`/admin/purchase-orders/${id}`)}
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center">
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {order_number}
                          </Text>
                          <Badge tone={statusTones[status]}>
                            {statusLabels[status] || status}
                          </Badge>
                        </InlineStack>
                        <Text variant="bodySm" as="p">
                          仕入れ先: {suppliers?.name || "-"}
                        </Text>
                        <InlineStack gap="400">
                          <Text variant="bodySm" tone="subdued" as="p">
                            作成日: {formatDate(created_at)}
                          </Text>
                          {expected_delivery_date && (
                            <Text variant="bodySm" tone="subdued" as="p">
                              納品予定: {formatDate(expected_delivery_date)}
                            </Text>
                          )}
                        </InlineStack>
                      </BlockStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Text variant="bodyMd" fontWeight="bold" as="p">
                          {formatCurrency(total_amount)}
                        </Text>
                        {status === "draft" && (
                          <>
                            <Button
                              size="slim"
                              onClick={() => updateStatus(id, "ordered")}
                            >
                              発注
                            </Button>
                            <Button
                              size="slim"
                              tone="critical"
                              onClick={() => handleDelete(id)}
                            >
                              削除
                            </Button>
                          </>
                        )}
                        {status === "ordered" && (
                          <Button
                            size="slim"
                            variant="primary"
                            onClick={() => updateStatus(id, "received")}
                          >
                            入庫
                          </Button>
                        )}
                      </InlineStack>
                    </InlineStack>
                  </ResourceItem>
                );
              }}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
