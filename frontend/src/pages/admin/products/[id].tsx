import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  BlockStack,
} from "@shopify/polaris";
import { apiGet, apiPost, apiPut } from "../../../utils/api";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  price: number;
  inventory_quantity: number;
  image_url: string | null;
}

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [inventoryQuantity, setInventoryQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!isNew);

  useEffect(() => {
    if (!isNew && id) {
      fetchProduct();
    }
  }, [id, isNew]);

  const fetchProduct = async () => {
    setFetching(true);
    try {
      const data = await apiGet<{ product: Product }>(
        `/api/admin/products/${id}`
      );
      const product = data.product;
      setTitle(product.title);
      setSku(product.sku || "");
      setPrice(product.price.toString());
      setInventoryQuantity(product.inventory_quantity.toString());
      setImageUrl(product.image_url || "");
    } catch (error) {
      console.error("Failed to fetch product:", error);
      setError("商品の取得に失敗しました");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) {
      setError("商品名は必須です");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("有効な価格を入力してください");
      return;
    }

    const quantityNum = parseInt(inventoryQuantity) || 0;
    if (quantityNum < 0) {
      setError("在庫数は0以上である必要があります");
      return;
    }

    setLoading(true);

    try {
      const productData = {
        title: title.trim(),
        sku: sku.trim() || null,
        price: priceNum,
        inventory_quantity: quantityNum,
        image_url: imageUrl.trim() || null,
      };

      if (isNew) {
        await apiPost("/api/admin/products", productData);
      } else {
        await apiPut(`/api/admin/products/${id}`, productData);
      }

      navigate("/admin/products");
    } catch (error) {
      console.error("Failed to save product:", error);
      setError(error instanceof Error ? error.message : "商品の保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Page title="商品編集">
        <Card>
          <BlockStack gap="400">
            <p>読み込み中...</p>
          </BlockStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title={isNew ? "商品を追加" : "商品を編集"}
      backAction={{ content: "戻る", onAction: () => navigate("/admin/products") }}
    >
      <Card>
        <BlockStack gap="400">
          <FormLayout>
            {error && (
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            )}
            <TextField
              label="商品名"
              value={title}
              onChange={setTitle}
              autoComplete="off"
              requiredIndicator
            />
            <TextField
              label="SKU（商品コード）"
              value={sku}
              onChange={setSku}
              autoComplete="off"
              helpText="任意。商品を識別するためのコード"
            />
            <TextField
              label="価格"
              type="number"
              value={price}
              onChange={setPrice}
              autoComplete="off"
              prefix="¥"
              requiredIndicator
            />
            <TextField
              label="在庫数"
              type="number"
              value={inventoryQuantity}
              onChange={setInventoryQuantity}
              autoComplete="off"
            />
            <TextField
              label="画像URL"
              value={imageUrl}
              onChange={setImageUrl}
              autoComplete="off"
              helpText="任意。商品画像のURL"
            />
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              fullWidth
            >
              {isNew ? "登録する" : "更新する"}
            </Button>
          </FormLayout>
        </BlockStack>
      </Card>
    </Page>
  );
}
