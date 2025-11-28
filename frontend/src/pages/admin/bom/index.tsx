import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  Button,
  DataTable,
  TextField,
  Modal,
  Banner,
  Badge,
  Spinner,
} from "@shopify/polaris";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../utils/api";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  price: number;
}

interface Material {
  id: string;
  name: string;
  code: string | null;
  unit: string;
  unit_price: number;
  current_stock: number;
}

interface BomItem {
  id: string;
  product_id: number;
  material_id: string;
  quantity_per_unit: number;
  material_cost: number;
  materials: Material;
}

interface BomResponse {
  bom: BomItem[];
  total_cost: number;
}

interface CostResponse {
  product_id: string;
  manufacturing_cost: number;
  selling_price: number;
  gross_profit: number;
  gross_profit_rate: number;
}

interface AvailabilityResponse {
  product_id: string;
  max_producible: number | null;
  message?: string;
  materials?: Array<{
    material_name: string;
    current_stock: number;
    required_per_unit: number;
    unit: string;
    producible_quantity: number;
  }>;
}

export default function AdminBomPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [costInfo, setCostInfo] = useState<CostResponse | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // モーダル状態
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBomItem, setSelectedBomItem] = useState<BomItem | null>(null);

  // フォーム状態
  const [formMaterialId, setFormMaterialId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");

  // エラー・成功メッセージ
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 商品と材料リストを取得
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const shopId = localStorage.getItem("shopId") || "default-shop-id";
        const [productsRes, materialsRes] = await Promise.all([
          apiGet<{ products: Product[] }>(`/api/admin/products?shop_id=${shopId}`),
          apiGet<{ materials: Material[] }>(`/api/admin/materials?shop_id=${shopId}`),
        ]);
        setProducts(productsRes.products || []);
        setMaterials(materialsRes.materials || []);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError("データの取得に失敗しました");
      }
    };
    fetchInitialData();
  }, []);

  // BOM取得
  const fetchBom = useCallback(async () => {
    if (!selectedProductId) return;

    setLoading(true);
    setError(null);
    try {
      const [bomRes, costRes, availRes] = await Promise.all([
        apiGet<BomResponse>(`/api/admin/bom/product/${selectedProductId}`),
        apiGet<CostResponse>(`/api/admin/bom/cost/${selectedProductId}`),
        apiGet<AvailabilityResponse>(`/api/admin/bom/available/${selectedProductId}`),
      ]);
      setBomItems(bomRes.bom || []);
      setTotalCost(bomRes.total_cost || 0);
      setCostInfo(costRes);
      setAvailability(availRes);
    } catch (err) {
      console.error("Failed to fetch BOM:", err);
      setError("BOMの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (selectedProductId) {
      fetchBom();
    } else {
      setBomItems([]);
      setTotalCost(0);
      setCostInfo(null);
      setAvailability(null);
    }
  }, [selectedProductId, fetchBom]);

  // BOM追加
  const handleAdd = async () => {
    if (!formMaterialId || !formQuantity) {
      setError("材料と必要量を入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/admin/bom", {
        product_id: Number(selectedProductId),
        material_id: formMaterialId,
        quantity_per_unit: Number(formQuantity),
      });
      setSuccess("BOMを追加しました");
      setAddModalOpen(false);
      setFormMaterialId("");
      setFormQuantity("");
      await fetchBom();
    } catch (err) {
      console.error("Failed to add BOM:", err);
      setError(err instanceof Error ? err.message : "BOMの追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // BOM更新
  const handleUpdate = async () => {
    if (!selectedBomItem || !formQuantity) return;

    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/admin/bom/${selectedBomItem.id}`, {
        quantity_per_unit: Number(formQuantity),
      });
      setSuccess("BOMを更新しました");
      setEditModalOpen(false);
      setSelectedBomItem(null);
      setFormQuantity("");
      await fetchBom();
    } catch (err) {
      console.error("Failed to update BOM:", err);
      setError(err instanceof Error ? err.message : "BOMの更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // BOM削除
  const handleDelete = async () => {
    if (!selectedBomItem) return;

    setSaving(true);
    setError(null);
    try {
      await apiDelete(`/api/admin/bom/${selectedBomItem.id}`);
      setSuccess("BOMを削除しました");
      setDeleteModalOpen(false);
      setSelectedBomItem(null);
      await fetchBom();
    } catch (err) {
      console.error("Failed to delete BOM:", err);
      setError(err instanceof Error ? err.message : "BOMの削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // テーブル行データ
  const rows = bomItems.map((item) => [
    item.materials?.name || "-",
    item.materials?.code || "-",
    `${item.quantity_per_unit} ${item.materials?.unit || ""}`,
    `¥${(item.materials?.unit_price || 0).toLocaleString()}`,
    `¥${(item.material_cost || 0).toLocaleString()}`,
    <InlineStack gap="200" key={item.id}>
      <Button
        size="slim"
        onClick={() => {
          setSelectedBomItem(item);
          setFormQuantity(String(item.quantity_per_unit));
          setEditModalOpen(true);
        }}
      >
        編集
      </Button>
      <Button
        size="slim"
        tone="critical"
        onClick={() => {
          setSelectedBomItem(item);
          setDeleteModalOpen(true);
        }}
      >
        削除
      </Button>
    </InlineStack>,
  ]);

  const productOptions = [
    { label: "商品を選択", value: "" },
    ...products.map((p) => ({
      label: `${p.title}${p.sku ? ` (${p.sku})` : ""}`,
      value: String(p.id),
    })),
  ];

  const materialOptions = [
    { label: "材料を選択", value: "" },
    ...materials.map((m) => ({
      label: `${m.name}${m.code ? ` (${m.code})` : ""} - ${m.unit}`,
      value: m.id,
    })),
  ];

  const selectedProduct = products.find((p) => String(p.id) === selectedProductId);

  return (
    <Page title="BOM（部品表）管理">
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
              label="商品を選択"
              options={productOptions}
              value={selectedProductId}
              onChange={setSelectedProductId}
            />
          </BlockStack>
        </Card>

        {selectedProductId && (
          <>
            {/* 原価・粗利情報 */}
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  原価・粗利情報
                </Text>
                {loading ? (
                  <Spinner size="small" />
                ) : (
                  <InlineStack gap="800" wrap={false}>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">販売価格</Text>
                      <Text as="p" fontWeight="bold">
                        ¥{(costInfo?.selling_price || selectedProduct?.price || 0).toLocaleString()}
                      </Text>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">製造原価</Text>
                      <Text as="p" fontWeight="bold">
                        ¥{(costInfo?.manufacturing_cost || totalCost).toLocaleString()}
                      </Text>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">粗利益</Text>
                      <Text
                        as="p"
                        fontWeight="bold"
                        tone={(costInfo?.gross_profit || 0) >= 0 ? "success" : "critical"}
                      >
                        ¥{(costInfo?.gross_profit || 0).toLocaleString()}
                      </Text>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">粗利率</Text>
                      <Badge tone={(costInfo?.gross_profit_rate || 0) >= 30 ? "success" : (costInfo?.gross_profit_rate || 0) >= 15 ? "warning" : "critical"}>
                        {`${costInfo?.gross_profit_rate || 0}%`}
                      </Badge>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">製造可能数</Text>
                      <Badge tone={(availability?.max_producible || 0) > 0 ? "success" : "critical"}>
                        {availability && availability.max_producible !== null
                          ? `${availability.max_producible}個`
                          : "BOM未設定"}
                      </Badge>
                    </BlockStack>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>

            {/* BOMテーブル */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">
                    材料構成
                  </Text>
                  <Button variant="primary" onClick={() => setAddModalOpen(true)}>
                    材料を追加
                  </Button>
                </InlineStack>

                {loading ? (
                  <InlineStack align="center">
                    <Spinner />
                  </InlineStack>
                ) : bomItems.length === 0 ? (
                  <Text as="p" tone="subdued">
                    この商品にはBOMが登録されていません。「材料を追加」ボタンから登録してください。
                  </Text>
                ) : (
                  <>
                    <DataTable
                      columnContentTypes={["text", "text", "text", "numeric", "numeric", "text"]}
                      headings={["材料名", "コード", "必要量", "単価", "材料費", "操作"]}
                      rows={rows}
                      totals={["", "", "", "合計", `¥${totalCost.toLocaleString()}`, ""]}
                      showTotalsInFooter
                    />
                  </>
                )}
              </BlockStack>
            </Card>

            {/* 在庫状況 */}
            {availability?.materials && availability.materials.length > 0 && (
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    材料在庫状況
                  </Text>
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                    headings={["材料名", "現在在庫", "1個あたり必要量", "製造可能数"]}
                    rows={availability.materials.map((m) => [
                      m.material_name,
                      `${m.current_stock} ${m.unit}`,
                      `${m.required_per_unit} ${m.unit}`,
                      `${m.producible_quantity}個`,
                    ])}
                  />
                </BlockStack>
              </Card>
            )}
          </>
        )}

        {/* 追加モーダル */}
        <Modal
          open={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setFormMaterialId("");
            setFormQuantity("");
          }}
          title="材料を追加"
          primaryAction={{
            content: "追加",
            onAction: handleAdd,
            loading: saving,
          }}
          secondaryActions={[
            {
              content: "キャンセル",
              onAction: () => {
                setAddModalOpen(false);
                setFormMaterialId("");
                setFormQuantity("");
              },
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Select
                label="材料"
                options={materialOptions}
                value={formMaterialId}
                onChange={setFormMaterialId}
              />
              <TextField
                label="1個あたりの必要量"
                type="number"
                value={formQuantity}
                onChange={setFormQuantity}
                autoComplete="off"
                helpText="商品1個を製造するのに必要な材料の量"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* 編集モーダル */}
        <Modal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedBomItem(null);
            setFormQuantity("");
          }}
          title="必要量を編集"
          primaryAction={{
            content: "保存",
            onAction: handleUpdate,
            loading: saving,
          }}
          secondaryActions={[
            {
              content: "キャンセル",
              onAction: () => {
                setEditModalOpen(false);
                setSelectedBomItem(null);
                setFormQuantity("");
              },
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p">
                材料: {selectedBomItem?.materials?.name}
              </Text>
              <TextField
                label="1個あたりの必要量"
                type="number"
                value={formQuantity}
                onChange={setFormQuantity}
                autoComplete="off"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* 削除確認モーダル */}
        <Modal
          open={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedBomItem(null);
          }}
          title="BOMを削除"
          primaryAction={{
            content: "削除",
            destructive: true,
            onAction: handleDelete,
            loading: saving,
          }}
          secondaryActions={[
            {
              content: "キャンセル",
              onAction: () => {
                setDeleteModalOpen(false);
                setSelectedBomItem(null);
              },
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              「{selectedBomItem?.materials?.name}」をBOMから削除しますか？
            </Text>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
