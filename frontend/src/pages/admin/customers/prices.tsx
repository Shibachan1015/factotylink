import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Banner,
  DataTable,
  Badge,
} from "@shopify/polaris";
import { apiGet, apiPost } from "../../../utils/api";

interface Product {
  id: number;
  title: string;
  sku: string | null;
  standard_price: number;
  customer_price: number | null;
  effective_price: number;
  has_custom_price: boolean;
}

interface Customer {
  id: string;
  company_name: string;
}

export default function CustomerPricesPage() {
  const { id: customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editedPrices, setEditedPrices] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customerRes, productsRes] = await Promise.all([
        apiGet<{ customer: Customer }>(`/api/admin/customers/${customerId}`),
        apiGet<{ products: Product[] }>(`/api/admin/customer-prices/products/${customerId}`),
      ]);
      setCustomer(customerRes.customer);
      setProducts(productsRes.products || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (productId: number, value: string) => {
    const newPrices = new Map(editedPrices);
    newPrices.set(productId, value);
    setEditedPrices(newPrices);
  };

  const handleSave = async () => {
    if (editedPrices.size === 0) {
      setError("変更がありません");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const prices = Array.from(editedPrices.entries())
        .filter(([_, value]) => value !== "")
        .map(([productId, value]) => ({
          product_id: productId,
          price: Number(value),
        }));

      if (prices.length === 0) {
        setError("有効な価格を入力してください");
        setSaving(false);
        return;
      }

      await apiPost("/api/admin/customer-prices/bulk", {
        customer_id: customerId,
        prices,
      });

      setSuccess("価格を保存しました");
      setEditedPrices(new Map());
      await fetchData();
    } catch (err) {
      console.error("Failed to save prices:", err);
      setError("価格の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  if (loading) {
    return <Page title="得意先別価格設定"><Card><Text as="p">読み込み中...</Text></Card></Page>;
  }

  const rows = products.map((product) => {
    const editedPrice = editedPrices.get(product.id);
    const currentValue = editedPrice !== undefined ? editedPrice : (product.customer_price?.toString() || "");

    return [
      product.title,
      product.sku || "-",
      formatCurrency(product.standard_price),
      product.has_custom_price ? (
        <Badge tone="success">設定済み</Badge>
      ) : (
        <Badge>未設定</Badge>
      ),
      <TextField
        label=""
        labelHidden
        type="number"
        value={currentValue}
        onChange={(value) => handlePriceChange(product.id, value)}
        prefix="¥"
        placeholder={product.standard_price.toString()}
        autoComplete="off"
      />,
      formatCurrency(
        editedPrice !== undefined && editedPrice !== ""
          ? Number(editedPrice)
          : product.effective_price
      ),
    ];
  });

  return (
    <Page
      title={`得意先別価格設定: ${customer?.company_name || ""}`}
      backAction={{ onAction: () => navigate(`/admin/customers/${customerId}`) }}
      primaryAction={{
        content: "保存",
        onAction: handleSave,
        loading: saving,
        disabled: editedPrices.size === 0,
      }}
    >
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
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">商品価格一覧</Text>
              <Text as="p" tone="subdued">
                空欄の場合は標準価格が適用されます
              </Text>
            </InlineStack>
            <DataTable
              columnContentTypes={["text", "text", "numeric", "text", "text", "numeric"]}
              headings={["商品名", "SKU", "標準価格", "状態", "特別価格", "適用価格"]}
              rows={rows}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
