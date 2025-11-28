import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  Button,
  Banner,
  DataTable,
  Badge,
  Checkbox,
} from "@shopify/polaris";
import { apiGet } from "../../../utils/api";

interface CustomerInvoice {
  customer_id: string;
  company_name: string;
  billing_type: string;
  order_count: number;
  total_amount: number;
}

interface MonthlyInvoiceList {
  year: number;
  month: number;
  period_label: string;
  customers: CustomerInvoice[];
  total_customers: number;
  total_amount: number;
}

export default function MonthlyInvoicePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyInvoiceList | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear.toString());
  const [month, setMonth] = useState(currentMonth.toString());

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  const yearOptions = [
    { label: `${currentYear - 1}年`, value: (currentYear - 1).toString() },
    { label: `${currentYear}年`, value: currentYear.toString() },
    { label: `${currentYear + 1}年`, value: (currentYear + 1).toString() },
  ];

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: (i + 1).toString(),
  }));

  useEffect(() => {
    fetchInvoiceList();
  }, [year, month]);

  const fetchInvoiceList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<MonthlyInvoiceList>(
        `/api/documents/monthly-invoice/list?shop_id=${shopId}&year=${year}&month=${month}`
      );
      setData(response);
      setSelectedCustomers(new Set());
    } catch (err) {
      console.error("Failed to fetch invoice list:", err);
      setError("月次請求書対象の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (data) {
      if (selectedCustomers.size === data.customers.length) {
        setSelectedCustomers(new Set());
      } else {
        setSelectedCustomers(new Set(data.customers.map((c) => c.customer_id)));
      }
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const openInvoice = (customerId: string) => {
    const token = localStorage.getItem("adminToken");
    fetch(
      `/api/documents/monthly-invoice/${customerId}?shop_id=${shopId}&year=${year}&month=${month}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate invoice");
        return res.text();
      })
      .then((html) => {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      })
      .catch((err) => {
        console.error("Invoice generation error:", err);
        alert("請求書の生成に失敗しました");
      });
  };

  const openSelectedInvoices = async () => {
    if (selectedCustomers.size === 0) {
      alert("請求書を発行する得意先を選択してください");
      return;
    }

    const token = localStorage.getItem("adminToken");

    for (const customerId of selectedCustomers) {
      try {
        const res = await fetch(
          `/api/documents/monthly-invoice/${customerId}?shop_id=${shopId}&year=${year}&month=${month}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.ok) {
          const html = await res.text();
          const win = window.open("", "_blank");
          if (win) {
            win.document.write(html);
            win.document.close();
          }
        }
      } catch (err) {
        console.error(`Invoice generation error for ${customerId}:`, err);
      }

      // 少し待ってから次を開く（ブラウザのポップアップブロック対策）
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const rows =
    data?.customers.map((customer) => [
      <Checkbox
        key={customer.customer_id}
        label=""
        labelHidden
        checked={selectedCustomers.has(customer.customer_id)}
        onChange={() => handleSelectCustomer(customer.customer_id)}
      />,
      customer.company_name,
      customer.billing_type === "credit" ? (
        <Badge tone="info">掛売</Badge>
      ) : (
        <Badge>都度</Badge>
      ),
      customer.order_count,
      formatCurrency(customer.total_amount),
      <Button
        key={`btn-${customer.customer_id}`}
        size="slim"
        onClick={() => openInvoice(customer.customer_id)}
      >
        請求書表示
      </Button>,
    ]) || [];

  return (
    <Page
      title="月次請求書一括発行"
      backAction={{ onAction: () => navigate("/admin") }}
      primaryAction={{
        content: `選択した${selectedCustomers.size}件を一括発行`,
        onAction: openSelectedInvoices,
        disabled: selectedCustomers.size === 0,
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
            <Text variant="headingMd" as="h2">
              対象期間を選択
            </Text>
            <InlineStack gap="400" blockAlign="end">
              <Select
                label="年"
                options={yearOptions}
                value={year}
                onChange={setYear}
              />
              <Select
                label="月"
                options={monthOptions}
                value={month}
                onChange={setMonth}
              />
              <Button onClick={fetchInvoiceList} loading={loading}>
                検索
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {data && (
          <>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">
                    {data.period_label} 請求対象一覧
                  </Text>
                  <InlineStack gap="200">
                    <Text as="p" tone="subdued">
                      対象得意先: {data.total_customers}社
                    </Text>
                    <Text as="p" fontWeight="bold">
                      合計: {formatCurrency(data.total_amount)}
                    </Text>
                  </InlineStack>
                </InlineStack>

                {data.customers.length === 0 ? (
                  <Text as="p" tone="subdued">
                    対象期間に出荷済みの注文がありません
                  </Text>
                ) : (
                  <>
                    <InlineStack gap="200" blockAlign="center">
                      <Checkbox
                        label="すべて選択"
                        checked={
                          selectedCustomers.size === data.customers.length &&
                          data.customers.length > 0
                        }
                        onChange={handleSelectAll}
                      />
                      <Text as="span" tone="subdued">
                        ({selectedCustomers.size}件選択中)
                      </Text>
                    </InlineStack>

                    <DataTable
                      columnContentTypes={[
                        "text",
                        "text",
                        "text",
                        "numeric",
                        "numeric",
                        "text",
                      ]}
                      headings={[
                        "",
                        "得意先名",
                        "支払区分",
                        "注文数",
                        "請求金額",
                        "操作",
                      ]}
                      rows={rows}
                    />
                  </>
                )}
              </BlockStack>
            </Card>

            {data.customers.length > 0 && (
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">
                    一括発行について
                  </Text>
                  <Text as="p" tone="subdued">
                    選択した得意先の月次請求書を一括で生成できます。
                    各請求書は新しいタブで開きます。
                    ブラウザのポップアップブロックを許可してください。
                  </Text>
                </BlockStack>
              </Card>
            )}
          </>
        )}
      </BlockStack>
    </Page>
  );
}
