import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Modal,
  Banner,
  DropZone,
} from "@shopify/polaris";
import { apiPost } from "../../../utils/api";

interface Customer {
  id: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  billing_type: "immediate" | "credit";
  login_id: string;
}

interface ImportResult {
  success: number;
  created: number;
  updated: number;
  errors: string[];
}

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/customers");

      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm("この得意先を削除しますか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCustomers();
      } else {
        const data = await response.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      alert("削除処理中にエラーが発生しました");
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/customers/export/csv", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("エクスポートに失敗しました");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("エクスポートに失敗しました");
    }
  };

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setImportFile(acceptedFiles[0]);
        setImportError(null);
        setImportResult(null);
      }
    },
    []
  );

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const csvData = await importFile.text();
      const data = await apiPost<{ message: string; results: ImportResult }>(
        "/api/admin/customers/import/csv",
        { csvData }
      );

      setImportResult(data.results);
      await fetchCustomers();
    } catch (error) {
      console.error("Import error:", error);
      setImportError("インポートに失敗しました");
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
  };

  return (
    <Page
      title="得意先管理"
      primaryAction={{
        content: "新規登録",
        onAction: () => navigate("/admin/customers/new"),
      }}
      secondaryActions={[
        {
          content: "CSVインポート",
          onAction: () => setImportModalOpen(true),
        },
        {
          content: "CSVエクスポート",
          onAction: handleExport,
        },
      ]}
    >
      <Card>
        <ResourceList
          resourceName={{ singular: "得意先", plural: "得意先" }}
          items={customers}
          loading={loading}
          renderItem={(customer) => {
            return (
              <ResourceItem
                id={customer.id}
                onClick={() => navigate(`/admin/customers/${customer.id}`)}
              >
                <InlineStack align="space-between" blockAlign="center" gap="400">
                  <div style={{flexGrow: 1}}>
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      {customer.company_name}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="p">
                      ログインID: {customer.login_id}
                    </Text>
                    {customer.address && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        住所: {customer.address}
                      </Text>
                    )}
                    {customer.phone && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        電話: {customer.phone}
                      </Text>
                    )}
                    {customer.email && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        メール: {customer.email}
                      </Text>
                    )}
                  </div>
                  <div>
                    <Badge
                      tone={customer.billing_type === "credit" ? "info" : "success"}
                    >
                      {customer.billing_type === "credit" ? "掛売" : "都度"}
                    </Badge>
                  </div>
                  <div>
                    <Button
                      tone="critical"
                      onClick={() => handleDelete(customer.id)}
                    >
                      削除
                    </Button>
                  </div>
                </InlineStack>
              </ResourceItem>
            );
          }}
        />
      </Card>

      <Modal
        open={importModalOpen}
        onClose={closeImportModal}
        title="CSVインポート"
        primaryAction={{
          content: "インポート",
          onAction: handleImport,
          loading: importing,
          disabled: !importFile || importing,
        }}
        secondaryActions={[
          {
            content: "閉じる",
            onAction: closeImportModal,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p">
              CSVファイルをアップロードして得意先を一括登録・更新できます。
            </Text>
            <Text as="p" tone="subdued">
              必須カラム: company_name, login_id
            </Text>
            <Text as="p" tone="subdued">
              オプション: id (更新時), email, phone, address, billing_type, password (新規時必須・8文字以上)
            </Text>

            <DropZone
              accept=".csv"
              type="file"
              onDrop={handleDropZoneDrop}
              allowMultiple={false}
            >
              {importFile ? (
                <div style={{ padding: "16px", textAlign: "center" }}>
                  <Text as="p" fontWeight="bold">{importFile.name}</Text>
                  <Text as="p" tone="subdued">
                    {(importFile.size / 1024).toFixed(2)} KB
                  </Text>
                </div>
              ) : (
                <DropZone.FileUpload actionHint="CSVファイルをドラッグ＆ドロップまたはクリックして選択" />
              )}
            </DropZone>

            {importError && (
              <Banner tone="critical">{importError}</Banner>
            )}

            {importResult && (
              <Banner tone={importResult.errors.length > 0 ? "warning" : "success"}>
                <BlockStack gap="200">
                  <Text as="p" fontWeight="bold">
                    インポート完了: 成功 {importResult.success}件
                    (新規 {importResult.created}件, 更新 {importResult.updated}件)
                  </Text>
                  {importResult.errors.length > 0 && (
                    <>
                      <Text as="p">エラー:</Text>
                      {importResult.errors.slice(0, 5).map((err, idx) => (
                        <Text key={idx} as="p" tone="subdued">{err}</Text>
                      ))}
                      {importResult.errors.length > 5 && (
                        <Text as="p" tone="subdued">
                          他 {importResult.errors.length - 5}件のエラー
                        </Text>
                      )}
                    </>
                  )}
                </BlockStack>
              </Banner>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
