import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  Button,
  Banner,
  DataTable,
  Divider,
} from "@shopify/polaris";
import { apiGet, apiPost } from "../../../utils/api";

// 発注書PDF表示用の新しいウィンドウを開く
const openPurchaseOrderPdf = async (orderId: string) => {
  try {
    const token = localStorage.getItem("adminToken");
    const response = await fetch(`/api/admin/purchase-orders/${orderId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("発注書の取得に失敗しました");
    const data = await response.json();

    // 新しいウィンドウでHTMLを表示
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(data.html);
      printWindow.document.close();
    }
  } catch (err) {
    console.error("Failed to open purchase order PDF:", err);
    alert("発注書の表示に失敗しました");
  }
};

interface Supplier {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
  code: string | null;
  unit: string;
  unit_price: number;
  current_stock: number;
}

interface OrderItem {
  material_id: string;
  material_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

interface PurchaseOrderDetail {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  expected_delivery_date: string | null;
  notes: string | null;
  suppliers: Supplier;
}

interface PurchaseOrderItemDetail {
  id: string;
  material_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  materials: {
    id: string;
    name: string;
    code: string | null;
    unit: string;
  };
}

export default function PurchaseOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 作成用
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);

  // 表示用
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [orderItems, setOrderItems] = useState<PurchaseOrderItemDetail[]>([]);

  // 明細追加用
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    if (isNew) {
      fetchInitialData();
    } else if (id) {
      fetchOrder();
    }
  }, [id, isNew]);

  const fetchInitialData = async () => {
    try {
      const [suppliersRes, materialsRes] = await Promise.all([
        apiGet<{ suppliers: Supplier[] }>(`/api/admin/suppliers?shop_id=${shopId}`),
        apiGet<{ materials: Material[] }>(`/api/admin/materials?shop_id=${shopId}`),
      ]);
      setSuppliers(suppliersRes.suppliers || []);
      setMaterials(materialsRes.materials || []);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrder = async () => {
    try {
      const data = await apiGet<{
        purchase_order: PurchaseOrderDetail;
        items: PurchaseOrderItemDetail[];
      }>(`/api/admin/purchase-orders/${id}`);
      setOrder(data.purchase_order);
      setOrderItems(data.items || []);
    } catch (err) {
      console.error("Failed to fetch order:", err);
      setError("発注書の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!selectedMaterialId || !quantity || !unitPrice) {
      setError("材料、数量、単価を入力してください");
      return;
    }

    const material = materials.find((m) => m.id === selectedMaterialId);
    if (!material) return;

    // 既に追加済みの材料かチェック
    if (items.some((item) => item.material_id === selectedMaterialId)) {
      setError("この材料は既に追加されています");
      return;
    }

    setItems([
      ...items,
      {
        material_id: selectedMaterialId,
        material_name: material.name,
        unit: material.unit,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
      },
    ]);

    setSelectedMaterialId("");
    setQuantity("");
    setUnitPrice("");
    setError(null);
  };

  const removeItem = (materialId: string) => {
    setItems(items.filter((item) => item.material_id !== materialId));
  };

  const handleMaterialChange = (materialId: string) => {
    setSelectedMaterialId(materialId);
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setUnitPrice(String(material.unit_price || ""));
    }
  };

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      setError("仕入れ先を選択してください");
      return;
    }

    if (items.length === 0) {
      setError("発注明細を追加してください");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiPost("/api/admin/purchase-orders", {
        shop_id: shopId,
        supplier_id: selectedSupplierId,
        expected_delivery_date: expectedDeliveryDate || null,
        notes: notes || null,
        items: items.map((item) => ({
          material_id: item.material_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });

      navigate("/admin/purchase-orders");
    } catch (err) {
      console.error("Failed to create order:", err);
      setError(err instanceof Error ? err.message : "発注書の作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  if (loading) {
    return <Page title="発注書">読み込み中...</Page>;
  }

  // 既存の発注書を表示
  if (!isNew && order) {
    return (
      <Page
        title={`発注書 ${order.order_number}`}
        backAction={{ onAction: () => navigate("/admin/purchase-orders") }}
        primaryAction={{
          content: "発注書を印刷",
          onAction: () => openPurchaseOrderPdf(order.id),
        }}
      >
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="800">
                <BlockStack gap="100">
                  <Text as="p" tone="subdued">仕入れ先</Text>
                  <Text as="p" fontWeight="bold">{order.suppliers?.name || "-"}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" tone="subdued">ステータス</Text>
                  <Text as="p" fontWeight="bold">{order.status}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" tone="subdued">合計金額</Text>
                  <Text as="p" fontWeight="bold">{formatCurrency(order.total_amount)}</Text>
                </BlockStack>
              </InlineStack>
              {order.notes && (
                <BlockStack gap="100">
                  <Text as="p" tone="subdued">備考</Text>
                  <Text as="p">{order.notes}</Text>
                </BlockStack>
              )}
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">発注明細</Text>
              <DataTable
                columnContentTypes={["text", "text", "numeric", "numeric", "numeric"]}
                headings={["材料名", "単位", "数量", "単価", "小計"]}
                rows={orderItems.map((item) => [
                  item.materials?.name || "-",
                  item.materials?.unit || "-",
                  item.quantity,
                  formatCurrency(item.unit_price),
                  formatCurrency(item.subtotal),
                ])}
                totals={["", "", "", "合計", formatCurrency(order.total_amount)]}
                showTotalsInFooter
              />
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  // 新規作成フォーム
  return (
    <Page
      title="発注書を作成"
      backAction={{ onAction: () => navigate("/admin/purchase-orders") }}
    >
      <BlockStack gap="400">
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Select
              label="仕入れ先"
              options={[
                { label: "選択してください", value: "" },
                ...suppliers.map((s) => ({ label: s.name, value: s.id })),
              ]}
              value={selectedSupplierId}
              onChange={setSelectedSupplierId}
              requiredIndicator
            />
            <TextField
              label="納品予定日"
              type="date"
              value={expectedDeliveryDate}
              onChange={setExpectedDeliveryDate}
              autoComplete="off"
            />
            <TextField
              label="備考"
              value={notes}
              onChange={setNotes}
              multiline={2}
              autoComplete="off"
            />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">発注明細</Text>

            <InlineStack gap="200" blockAlign="end">
              <div style={{ flex: 2 }}>
                <Select
                  label="材料"
                  options={[
                    { label: "材料を選択", value: "" },
                    ...materials.map((m) => ({
                      label: `${m.name}${m.code ? ` (${m.code})` : ""} - ${m.unit}`,
                      value: m.id,
                    })),
                  ]}
                  value={selectedMaterialId}
                  onChange={handleMaterialChange}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="数量"
                  type="number"
                  value={quantity}
                  onChange={setQuantity}
                  autoComplete="off"
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="単価"
                  type="number"
                  value={unitPrice}
                  onChange={setUnitPrice}
                  prefix="¥"
                  autoComplete="off"
                />
              </div>
              <Button onClick={addItem}>追加</Button>
            </InlineStack>

            <Divider />

            {items.length === 0 ? (
              <Text as="p" tone="subdued">明細がありません</Text>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "text"]}
                headings={["材料名", "単位", "数量", "単価", "小計", "操作"]}
                rows={items.map((item) => [
                  item.material_name,
                  item.unit,
                  item.quantity,
                  formatCurrency(item.unit_price),
                  formatCurrency(item.quantity * item.unit_price),
                  <Button
                    key={item.material_id}
                    size="slim"
                    tone="critical"
                    onClick={() => removeItem(item.material_id)}
                  >
                    削除
                  </Button>,
                ])}
                totals={["", "", "", "合計", formatCurrency(totalAmount), ""]}
                showTotalsInFooter
              />
            )}
          </BlockStack>
        </Card>

        <InlineStack gap="200" align="end">
          <Button onClick={() => navigate("/admin/purchase-orders")}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            発注書を作成
          </Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
