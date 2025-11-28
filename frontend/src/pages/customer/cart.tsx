import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Banner,
} from "@shopify/polaris";
import { useCartStore } from "../../stores/cart-store.ts";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, getTotal } =
    useCartStore();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "注文の確定に失敗しました");
        setLoading(false);
        return;
      }

      clearCart();
      navigate(`/customer/orders/${data.order.id}`);
    } catch (err) {
      setError("注文処理中にエラーが発生しました");
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Page title="カート">
        <Card>
          <Text as="p">カートは空です</Text>
          <Button onClick={() => navigate("/customer/products")}>
            商品一覧に戻る
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="カート"
      primaryAction={{
        content: "注文を確定",
        onAction: handleCheckout,
        loading,
      }}
    >
      <Card>
        <BlockStack gap="400">
          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}
          <ResourceList
            resourceName={{ singular: "商品", plural: "商品" }}
            items={items}
            renderItem={(item) => {
              const media = item.image_url ? (
                <Thumbnail source={item.image_url} alt={item.product_name} />
              ) : undefined;

              return (
                <ResourceItem
                  id={String(item.product_id)}
                  media={media}
                  onClick={() => {}}
                >
                  <InlineStack align="space-between" blockAlign="center" gap="400">
                    <div style={{flexGrow: 1}}>
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {item.product_name}
                      </Text>
                      {item.sku && (
                        <Text variant="bodySm" tone="subdued" as="p">
                          SKU: {item.sku}
                        </Text>
                      )}
                      <Text variant="bodySm" as="p">
                        ¥{item.price.toLocaleString()} × {item.quantity} = ¥
                        {(item.price * item.quantity).toLocaleString()}
                      </Text>
                    </div>
                    <div>
                      <InlineStack gap="200">
                        <Button
                          onClick={() =>
                            updateQuantity(
                              item.product_id,
                              item.quantity - 1,
                            )
                          }
                        >
                          -
                        </Button>
                        <Text variant="bodyMd" as="span">
                          {item.quantity}
                        </Text>
                        <Button
                          onClick={() =>
                            updateQuantity(
                              item.product_id,
                              item.quantity + 1,
                            )
                          }
                        >
                          +
                        </Button>
                        <Button
                          tone="critical"
                          onClick={() => removeItem(item.product_id)}
                        >
                          削除
                        </Button>
                      </InlineStack>
                    </div>
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
          <TextField
            label="備考"
            value={notes}
            onChange={setNotes}
            multiline={3}
            placeholder="注文に関する備考があれば入力してください"
            autoComplete="off"
          />
          <Card>
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h3">
                合計
              </Text>
              <Text variant="headingLg" as="p">
                ¥{getTotal().toLocaleString()}
              </Text>
            </InlineStack>
          </Card>
        </BlockStack>
      </Card>
    </Page>
  );
}
