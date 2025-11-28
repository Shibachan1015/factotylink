import { useState, useEffect } from "react";
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
} from "@shopify/polaris";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  price: number;
  inventory_quantity: number;
  image_url: string | null;
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("shop_id", "00000000-0000-0000-0000-000000000000"); // 簡易実装
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/admin/inventory?${params}`);

      const data = await response.json();
      if (response.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditQuantity(product.inventory_quantity.toString());
  };

  const handleSave = async (productId: number) => {
    const quantity = parseInt(editQuantity);
    if (isNaN(quantity) || quantity < 0) {
      alert("有効な数量を入力してください");
      return;
    }

    try {
      const response = await fetch("/api/admin/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          quantity,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setEditingId(null);
        await fetchProducts();
      } else {
        alert(data.error || "在庫数の更新に失敗しました");
      }
    } catch (error) {
      alert("在庫数更新中にエラーが発生しました");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditQuantity("");
  };

  return (
    <Page title="在庫管理">
      <Card>
        <BlockStack gap="400">
          <TextField
            label="商品検索"
            value={search}
            onChange={setSearch}
            placeholder="商品名で検索"
            clearButton
            onClearButtonClick={() => setSearch("")}
          />
          <ResourceList
            resourceName={{ singular: "商品", plural: "商品" }}
            items={products}
            loading={loading}
            renderItem={(product) => {
              const { id, title, sku, price, inventory_quantity, image_url } =
                product;
              const media = image_url ? (
                <Thumbnail source={image_url} alt={title} />
              ) : null;

              const isEditing = editingId === id;

              return (
                <ResourceItem id={String(id)} media={media}>
                  <InlineStack align="space-between" blockAlign="center" gap="400">
                    <div style={{flexGrow: 1}}>
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
                      {isEditing ? (
                        <InlineStack gap="200" blockAlign="center">
                          <TextField
                            label="在庫数"
                            type="number"
                            value={editQuantity}
                            onChange={setEditQuantity}
                            autoFocus
                          />
                          <Button onClick={() => handleSave(id)}>保存</Button>
                          <Button onClick={handleCancel}>キャンセル</Button>
                        </InlineStack>
                      ) : (
                        <Badge
                          tone={inventory_quantity > 0 ? "success" : "critical"}
                        >
                          在庫: {inventory_quantity}
                        </Badge>
                      )}
                    </div>
                    {!isEditing && (
                      <div>
                        <Button onClick={() => handleEdit(product)}>
                          編集
                        </Button>
                      </div>
                    )}
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        </BlockStack>
      </Card>
    </Page>
  );
}
