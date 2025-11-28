import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  TextField,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Modal,
  Banner,
  DropZone,
} from "@shopify/polaris";
import { apiGet, apiDelete, apiPost } from "../../../utils/api";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  price: number;
  inventory_quantity: number;
  image_url: string | null;
}

interface ImportResult {
  success: number;
  created: number;
  updated: number;
  errors: string[];
}

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) {
        params.append("search", search);
      }

      const data = await apiGet<{ products: Product[] }>(
        `/api/admin/products?${params}`
      );
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await apiDelete(`/api/admin/products/${deleteTarget.id}`);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      await fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("商品の削除に失敗しました");
    }
  };

  const openDeleteModal = (product: Product) => {
    setDeleteTarget(product);
    setDeleteModalOpen(true);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/products/export/csv", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("エクスポートに失敗しました");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("エクスポートに失敗しました");
    }
  };

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setImportFile(acceptedFiles[0]);
        setImportError(null);
        setImportResult(null);
      }
    },
    []
  );

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const csvData = await importFile.text();
      const data = await apiPost<{ message: string; results: ImportResult }>(
        "/api/admin/products/import/csv",
        { csvData }
      );

      setImportResult(data.results);
      await fetchProducts();
    } catch (error) {
      console.error("Import error:", error);
      setImportError("インポートに失敗しました");
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
  };

  return (
    <Page
      title="商品管理"
      primaryAction={{
        content: "商品を追加",
        onAction: () => navigate("/admin/products/new"),
      }}
      secondaryActions={[
        {
          content: "CSVインポート",
          onAction: () => setImportModalOpen(true),
        },
        {
          content: "CSVエクスポート",
          onAction: handleExport,
        },
      ]}
    >
      <Card>
        <BlockStack gap="400">
          <TextField
            label="商品検索"
            value={search}
            onChange={setSearch}
            placeholder="商品名で検索"
            clearButton
            onClearButtonClick={() => setSearch("")}
            autoComplete="off"
          />
          <ResourceList
            resourceName={{ singular: "商品", plural: "商品" }}
            items={products}
            loading={loading}
            emptyState={
              <BlockStack gap="200" inlineAlign="center">
                <Text as="p" tone="subdued">
                  商品がありません
                </Text>
                <Button onClick={() => navigate("/admin/products/new")}>
                  商品を追加
                </Button>
              </BlockStack>
            }
            renderItem={(product) => {
              const { id, title, sku, price, inventory_quantity, image_url } =
                product;
              const media = image_url ? (
                <Thumbnail source={image_url} alt={title} />
              ) : undefined;

              return (
                <ResourceItem
                  id={String(id)}
                  media={media}
                  onClick={() => navigate(`/admin/products/${id}`)}
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {title}
                      </Text>
                      {sku && (
                        <Text variant="bodySm" tone="subdued" as="p">
                          SKU: {sku}
                        </Text>
                      )}
                      <Text variant="bodySm" as="p">
                        ¥{price.toLocaleString()}
                      </Text>
                    </BlockStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Badge
                        tone={inventory_quantity > 0 ? "success" : "critical"}
                      >
                        {`在庫: ${inventory_quantity}`}
                      </Badge>
                      <Button
                        tone="critical"
                        onClick={() => openDeleteModal(product)}
                      >
                        削除
                      </Button>
                    </InlineStack>
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        </BlockStack>
      </Card>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="商品を削除"
        primaryAction={{
          content: "削除",
          destructive: true,
          onAction: handleDelete,
        }}
        secondaryActions={[
          {
            content: "キャンセル",
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            「{deleteTarget?.title}」を削除しますか？この操作は取り消せません。
          </Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={importModalOpen}
        onClose={closeImportModal}
        title="CSVインポート"
        primaryAction={{
          content: "インポート",
          onAction: handleImport,
          loading: importing,
          disabled: !importFile || importing,
        }}
        secondaryActions={[
          {
            content: "閉じる",
            onAction: closeImportModal,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p">
              CSVファイルをアップロードして商品を一括登録・更新できます。
            </Text>
            <Text as="p" tone="subdued">
              必須カラム: title, price
            </Text>
            <Text as="p" tone="subdued">
              オプション: id (更新時), sku, inventory_quantity, description, image_url
            </Text>

            <DropZone
              accept=".csv"
              type="file"
              onDrop={handleDropZoneDrop}
              allowMultiple={false}
            >
              {importFile ? (
                <div style={{ padding: "16px", textAlign: "center" }}>
                  <Text as="p" fontWeight="bold">{importFile.name}</Text>
                  <Text as="p" tone="subdued">
                    {(importFile.size / 1024).toFixed(2)} KB
                  </Text>
                </div>
              ) : (
                <DropZone.FileUpload actionHint="CSVファイルをドラッグ＆ドロップまたはクリックして選択" />
              )}
            </DropZone>

            {importError && (
              <Banner tone="critical">{importError}</Banner>
            )}

            {importResult && (
              <Banner tone={importResult.errors.length > 0 ? "warning" : "success"}>
                <BlockStack gap="200">
                  <Text as="p" fontWeight="bold">
                    インポート完了: 成功 {importResult.success}件
                    (新規 {importResult.created}件, 更新 {importResult.updated}件)
                  </Text>
                  {importResult.errors.length > 0 && (
                    <>
                      <Text as="p">エラー:</Text>
                      {importResult.errors.slice(0, 5).map((err, idx) => (
                        <Text key={idx} as="p" tone="subdued">{err}</Text>
                      ))}
                      {importResult.errors.length > 5 && (
                        <Text as="p" tone="subdued">
                          他 {importResult.errors.length - 5}件のエラー
                        </Text>
                      )}
                    </>
                  )}
                </BlockStack>
              </Banner>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
