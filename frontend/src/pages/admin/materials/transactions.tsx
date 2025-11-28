import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Select,
  TextField,
  Banner,
} from "@shopify/polaris";

interface Transaction {
  id: string;
  type: "in" | "out";
  quantity: number;
  date: string;
  notes: string | null;
  materials: {
    name: string;
    code: string | null;
    unit: string;
  };
}

export default function MaterialTransactionsPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [transactionType, setTransactionType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchMaterials();
  }, [selectedMaterial]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMaterial) {
        params.append("material_id", selectedMaterial);
      }

      const response = await fetch(`/api/admin/materials/transactions?${params}`);

      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const params = new URLSearchParams();
      params.append("shop_id", "00000000-0000-0000-0000-000000000000");

      const response = await fetch(`/api/admin/materials?${params}`);
      const data = await response.json();

      if (response.ok) {
        setMaterials(
          (data.materials || []).map((m: { id: string; name: string }) => ({
            id: m.id,
            name: m.name,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMaterial || !quantity) {
      setError("材料と数量を入力してください");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const endpoint = transactionType === "in"
        ? "/api/admin/materials/transactions/in"
        : "/api/admin/materials/transactions/out";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_id: selectedMaterial,
          quantity: parseFloat(quantity),
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setQuantity("");
        setNotes("");
        await fetchTransactions();
      } else {
        setError(data.error || "登録に失敗しました");
      }
    } catch (err) {
      setError("登録処理中にエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const materialOptions = [
    { label: "すべて", value: "" },
    ...materials.map((m) => ({ label: m.name, value: m.id })),
  ];

  return (
    <Page
      title="材料入出庫管理"
      backAction={{ onAction: () => navigate("/admin/materials") }}
    >
      <Card>
        <BlockStack gap="400">
          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}

          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                入出庫登録
              </Text>
              <Select
                label="材料"
                options={materialOptions.filter((o) => o.value !== "")}
                value={selectedMaterial}
                onChange={setSelectedMaterial}
              />
              <Select
                label="種別"
                options={[
                  { label: "入庫", value: "in" },
                  { label: "出庫", value: "out" },
                ]}
                value={transactionType}
                onChange={(value) => setTransactionType(value as "in" | "out")}
              />
              <TextField
                label="数量"
                type="number"
                value={quantity}
                onChange={setQuantity}
                autoComplete="off"
              />
              <TextField
                label="備考"
                value={notes}
                onChange={setNotes}
                multiline={2}
                autoComplete="off"
              />
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={submitting}
                disabled={!selectedMaterial || !quantity}
              >
                登録
              </Button>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">
                  入出庫履歴
                </Text>
                <Select
                  label="材料でフィルター"
                  options={materialOptions}
                  value={selectedMaterial}
                  onChange={setSelectedMaterial}
                />
              </InlineStack>
              <ResourceList
                resourceName={{ singular: "履歴", plural: "履歴" }}
                items={transactions}
                loading={loading}
                renderItem={(transaction) => {
                  return (
                    <ResourceItem id={transaction.id} onClick={() => {}}>
                      <InlineStack align="space-between" blockAlign="center" gap="400">
                        <div style={{flexGrow: 1}}>
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {transaction.materials.name}
                          </Text>
                          {transaction.materials.code && (
                            <Text variant="bodySm" tone="subdued" as="p">
                              コード: {transaction.materials.code}
                            </Text>
                          )}
                          <Text variant="bodySm" as="p">
                            {new Date(transaction.date).toLocaleDateString("ja-JP")}
                          </Text>
                          {transaction.notes && (
                            <Text variant="bodySm" as="p">
                              備考: {transaction.notes}
                            </Text>
                          )}
                        </div>
                        <div>
                          <Badge
                            tone={transaction.type === "in" ? "success" : "attention"}
                          >
                            {transaction.type === "in" ? "入庫" : "出庫"}
                          </Badge>
                        </div>
                        <div>
                          <Text variant="bodyMd" fontWeight="bold" as="p">
                            {transaction.type === "in" ? "+" : "-"}
                            {transaction.quantity} {transaction.materials.unit}
                          </Text>
                        </div>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            </BlockStack>
          </Card>
        </BlockStack>
      </Card>
    </Page>
  );
}
