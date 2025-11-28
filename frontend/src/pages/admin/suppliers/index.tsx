import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  TextField,
  Button,
  BlockStack,
  InlineStack,
  Modal,
  Banner,
} from "@shopify/polaris";
import { apiGet, apiDelete } from "../../../utils/api";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export default function AdminSuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ suppliers: Supplier[] }>(
        `/api/admin/suppliers?shop_id=${shopId}`
      );
      setSuppliers(data.suppliers || []);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      setError("仕入れ先の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await apiDelete(`/api/admin/suppliers/${deleteTarget.id}`);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      await fetchSuppliers();
    } catch (err) {
      console.error("Failed to delete supplier:", err);
      setError(err instanceof Error ? err.message : "仕入れ先の削除に失敗しました");
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Page
      title="仕入れ先管理"
      primaryAction={{
        content: "仕入れ先を追加",
        onAction: () => navigate("/admin/suppliers/new"),
      }}
    >
      <BlockStack gap="400">
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <TextField
              label="仕入れ先検索"
              value={search}
              onChange={setSearch}
              placeholder="会社名または担当者名で検索"
              clearButton
              onClearButtonClick={() => setSearch("")}
              autoComplete="off"
            />
            <ResourceList
              resourceName={{ singular: "仕入れ先", plural: "仕入れ先" }}
              items={filteredSuppliers}
              loading={loading}
              emptyState={
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" tone="subdued">
                    仕入れ先がありません
                  </Text>
                  <Button onClick={() => navigate("/admin/suppliers/new")}>
                    仕入れ先を追加
                  </Button>
                </BlockStack>
              }
              renderItem={(supplier) => {
                const { id, name, contact_name, phone, email } = supplier;

                return (
                  <ResourceItem
                    id={id}
                    onClick={() => navigate(`/admin/suppliers/${id}`)}
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                          {name}
                        </Text>
                        {contact_name && (
                          <Text variant="bodySm" tone="subdued" as="p">
                            担当: {contact_name}
                          </Text>
                        )}
                        <InlineStack gap="200">
                          {phone && (
                            <Text variant="bodySm" as="p">
                              TEL: {phone}
                            </Text>
                          )}
                          {email && (
                            <Text variant="bodySm" as="p">
                              {email}
                            </Text>
                          )}
                        </InlineStack>
                      </BlockStack>
                      <Button
                        tone="critical"
                        onClick={() => {
                          setDeleteTarget(supplier);
                          setDeleteModalOpen(true);
                        }}
                      >
                        削除
                      </Button>
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
          title="仕入れ先を削除"
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
              「{deleteTarget?.name}」を削除しますか？この操作は取り消せません。
            </Text>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
