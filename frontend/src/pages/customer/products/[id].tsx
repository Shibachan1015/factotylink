import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  Layout,
  Thumbnail,
  Text,
  Button,
  Stack,
  Badge,
  Banner,
} from "@shopify/polaris";
import { useCartStore } from "../../../stores/cart-store.ts";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  price: number;
  inventory_quantity: number;
  image_url: string | null;
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
    return <Page title="商品詳細"><Card><Text>読み込み中...</Text></Card></Page>;
  }

  if (error || !product) {
    return (
      <Page title="商品詳細">
        <Card>
          <Banner status="critical">{error || "商品が見つかりません"}</Banner>
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
            <Stack vertical spacing="loose">
              {product.image_url && (
                <Thumbnail source={product.image_url} alt={product.title} size="large" />
              )}
              <Text variant="headingMd" as="h2">
                {product.title}
              </Text>
              {product.sku && (
                <Text variant="bodyMd" tone="subdued">
                  SKU: {product.sku}
                </Text>
              )}
              <Text variant="headingLg" as="p">
                ¥{product.price.toLocaleString()}
              </Text>
              <Badge
                status={product.inventory_quantity > 0 ? "success" : "critical"}
              >
                在庫: {product.inventory_quantity}
              </Badge>
              <Stack>
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
              </Stack>
              <Button
                primary
                onClick={handleAddToCart}
                disabled={product.inventory_quantity === 0}
                fullWidth
              >
                カートに追加
              </Button>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

