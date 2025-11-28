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
  Banner,
} from "@shopify/polaris";
import { useCartStore } from "../../../stores/cart-store.ts";
import Layout from "../../../components/Layout.tsx";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  price: number;
  inventory_quantity: number;
  image_url: string | null;
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("customerToken");
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const response = await fetch(`/api/products?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  const handleAddToCart = (product: Product) => {
    addItem({
      product_id: product.id,
      product_name: product.title,
      sku: product.sku,
      price: product.price,
      image_url: product.image_url,
    });
  };

  return (
    <Layout>
      <Page
        title="商品一覧"
        primaryAction={{
          content: "カートを見る",
          onAction: () => navigate("/customer/cart"),
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

              return (
                <ResourceItem
                  id={String(id)}
                  media={media}
                  accessibilityLabel={`${title}を表示`}
                  onClick={() => navigate(`/customer/products/${id}`)}
                >
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
                      <Badge
                        tone={inventory_quantity > 0 ? "success" : "critical"}
                      >
                        在庫: {inventory_quantity}
                      </Badge>
                    </div>
                    <div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={inventory_quantity === 0}
                      >
                        カートに追加
                      </Button>
                    </div>
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        </BlockStack>
      </Card>
    </Page>
    </Layout>
  );
}

