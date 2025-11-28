import { useState, useEffect } from "react";
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
} from "@shopify/polaris";
import { apiGet, apiDelete } from "../../../utils/api";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  price: number;
  inventory_quantity: number;
  image_url: string | null;
}

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

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

  return (
    <Page
      title="商品管理"
      primaryAction={{
        content: "商品を追加",
        onAction: () => navigate("/admin/products/new"),
      }}
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
    </Page>
  );
}
