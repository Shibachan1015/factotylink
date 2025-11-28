import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  Layout,
  Thumbnail,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
} from "@shopify/polaris";
import { useCartStore } from "../../../stores/cart-store.ts";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  price: number;
  original_price?: number;
  has_custom_price?: boolean;
  inventory_quantity: number;
  image_url: string | null;
  description?: string | null;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCartStore();

  useEffect(() => {
    if (id) {
      fetchProduct(parseInt(id));
    }
  }, [id]);

  const fetchProduct = async (productId: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch(`/api/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setProduct(data.product);
      } else {
        setError(data.error || "商品の取得に失敗しました");
      }
    } catch (err) {
      setError("商品の取得中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    for (let i = 0; i < quantity; i++) {
      addItem({
        product_id: product.id,
        product_name: product.title,
        sku: product.sku,
        price: product.price,
        image_url: product.image_url,
      });
    }

    navigate("/customer/cart");
  };

  if (loading) {
    return <Page title="商品詳細"><Card><Text as="p">読み込み中...</Text></Card></Page>;
  }

  if (error || !product) {
    return (
      <Page title="商品詳細">
        <Card>
          <Banner tone="critical">{error || "商品が見つかりません"}</Banner>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title={product.title}
      backAction={{ onAction: () => navigate("/customer/products") }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              {product.image_url && (
                <Thumbnail source={product.image_url} alt={product.title} size="large" />
              )}
              <Text variant="headingMd" as="h2">
                {product.title}
              </Text>
              {product.sku && (
                <Text variant="bodyMd" tone="subdued" as="p">
                  SKU: {product.sku}
                </Text>
              )}
              {product.has_custom_price && product.original_price ? (
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingLg" as="p" tone="success">
                    ¥{product.price.toLocaleString()}
                  </Text>
                  <Text variant="bodyMd" as="span" tone="subdued">
                    <span style={{ textDecoration: "line-through" }}>
                      ¥{product.original_price.toLocaleString()}
                    </span>
                  </Text>
                  <Badge tone="success">特別価格</Badge>
                </InlineStack>
              ) : (
                <Text variant="headingLg" as="p">
                  ¥{product.price.toLocaleString()}
                </Text>
              )}
              {product.description && (
                <Text variant="bodyMd" as="p">
                  {product.description}
                </Text>
              )}
              <Badge
                tone={product.inventory_quantity > 0 ? "success" : "critical"}
              >
                {`在庫: ${product.inventory_quantity}`}
              </Badge>
              <InlineStack gap="200" blockAlign="center">
                <Button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Text variant="bodyMd" as="span">
                  {quantity}
                </Text>
                <Button
                  onClick={() =>
                    setQuantity(
                      Math.min(product.inventory_quantity, quantity + 1),
                    )
                  }
                  disabled={quantity >= product.inventory_quantity}
                >
                  +
                </Button>
              </InlineStack>
              <Button
                variant="primary"
                onClick={handleAddToCart}
                disabled={product.inventory_quantity === 0}
                fullWidth
              >
                カートに追加
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
