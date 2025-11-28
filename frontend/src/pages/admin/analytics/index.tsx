import { useState, useEffect } from "react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Tabs,
  DataTable,
  Badge,
  Banner,
  Spinner,
  Select,
  Button,
  Box,
} from "@shopify/polaris";
import { apiGet, apiPatch } from "../../../utils/api";

interface DashboardData {
  current_month: {
    sales: number;
    cost: number;
    gross_profit: number;
    gross_profit_rate: number;
    order_count: number;
  };
  comparison: {
    sales_change_rate: number;
    profit_change_rate: number;
    last_month_sales: number;
    last_month_profit: number;
  };
  order_status: {
    new: number;
    manufacturing: number;
    completed: number;
    shipped: number;
  };
  alerts: {
    low_stock_materials: Array<{
      id: string;
      name: string;
      current_stock: number;
      safety_stock: number;
      unit: string;
    }>;
    low_stock_count: number;
  };
}

interface SalesTrendData {
  trend: Array<{
    month: string;
    sales: number;
    profit: number;
  }>;
}

interface ProductAnalytics {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  gross_profit_rate: number;
}

interface CustomerAnalytics {
  customer_id: string;
  company_name: string;
  total_orders: number;
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  gross_profit_rate: number;
  last_order_date: string | null;
}

interface SalesByPeriod {
  period: string;
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  order_count: number;
}

interface InventoryTurnover {
  product_id: number;
  product_name: string;
  sku: string | null;
  current_stock: number;
  annual_sold: number;
  turnover_rate: number;
  days_of_inventory: number | null;
  stock_value: number;
  status: string;
}

interface InventoryTurnoverData {
  products: InventoryTurnover[];
  summary: {
    total_stock_value: number;
    total_products: number;
    slow_moving_count: number;
    slow_moving_value: number;
  };
  slow_moving: InventoryTurnover[];
}

interface ReceivablesData {
  summary: {
    total_unpaid: number;
    total_overdue: number;
    unpaid_count: number;
    overdue_count: number;
  };
  aging: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
  };
  by_customer: Array<{
    customer_id: string;
    company_name: string;
    total_unpaid: number;
    overdue_amount: number;
    oldest_due_date: string | null;
    invoice_count: number;
  }>;
  overdue_list: Array<{
    id: string;
    customer_name: string;
    order_number: string;
    amount: number;
    due_date: string;
    days_overdue: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics[]>([]);
  const [salesByPeriod, setSalesByPeriod] = useState<SalesByPeriod[]>([]);
  const [inventoryTurnover, setInventoryTurnover] = useState<InventoryTurnoverData | null>(null);
  const [receivables, setReceivables] = useState<ReceivablesData | null>(null);
  const [period, setPeriod] = useState("monthly");

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedTab === 1) {
      fetchSalesData();
    } else if (selectedTab === 2) {
      fetchProductAnalytics();
    } else if (selectedTab === 3) {
      fetchCustomerAnalytics();
    } else if (selectedTab === 4) {
      fetchInventoryTurnover();
    } else if (selectedTab === 5) {
      fetchReceivables();
    }
  }, [selectedTab, period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, trendRes] = await Promise.all([
        apiGet<DashboardData>(`/api/admin/analytics/dashboard?shop_id=${shopId}`),
        apiGet<SalesTrendData>(`/api/admin/analytics/sales-trend?shop_id=${shopId}`),
      ]);
      setDashboard(dashboardRes);
      setSalesTrend(trendRes);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      const res = await apiGet<{ by_period: SalesByPeriod[] }>(
        `/api/admin/analytics/sales?shop_id=${shopId}&period=${period}`
      );
      setSalesByPeriod(res.by_period || []);
    } catch (err) {
      console.error("Failed to fetch sales data:", err);
    }
  };

  const fetchProductAnalytics = async () => {
    try {
      const res = await apiGet<{ products: ProductAnalytics[] }>(
        `/api/admin/analytics/products?shop_id=${shopId}`
      );
      setProductAnalytics(res.products || []);
    } catch (err) {
      console.error("Failed to fetch product analytics:", err);
    }
  };

  const fetchCustomerAnalytics = async () => {
    try {
      const res = await apiGet<{ customers: CustomerAnalytics[] }>(
        `/api/admin/analytics/customers?shop_id=${shopId}`
      );
      setCustomerAnalytics(res.customers || []);
    } catch (err) {
      console.error("Failed to fetch customer analytics:", err);
    }
  };

  const fetchInventoryTurnover = async () => {
    try {
      const res = await apiGet<InventoryTurnoverData>(
        `/api/admin/analytics/inventory-turnover?shop_id=${shopId}`
      );
      setInventoryTurnover(res);
    } catch (err) {
      console.error("Failed to fetch inventory turnover:", err);
    }
  };

  const fetchReceivables = async () => {
    try {
      const res = await apiGet<ReceivablesData>(
        `/api/admin/analytics/receivables?shop_id=${shopId}`
      );
      setReceivables(res);
    } catch (err) {
      console.error("Failed to fetch receivables:", err);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await apiPatch(`/api/admin/analytics/receivables/${id}`, { status: "paid" });
      fetchReceivables();
    } catch (err) {
      console.error("Failed to mark as paid:", err);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const formatChangeRate = (rate: number) => {
    const prefix = rate >= 0 ? "+" : "";
    return `${prefix}${rate}%`;
  };

  const tabs = [
    { id: "dashboard", content: "サマリー" },
    { id: "sales", content: "売上推移" },
    { id: "products", content: "商品別分析" },
    { id: "customers", content: "得意先別分析" },
    { id: "inventory", content: "在庫回転率" },
    { id: "receivables", content: "売掛金管理" },
  ];

  if (loading) {
    return (
      <Page title="経営分析">
        <Card>
          <InlineStack align="center">
            <Spinner />
          </InlineStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="経営分析">
      <BlockStack gap="400">
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          {/* サマリータブ */}
          {selectedTab === 0 && dashboard && (
            <BlockStack gap="400">
              {/* アラート */}
              {dashboard.alerts.low_stock_count > 0 && (
                <Banner tone="warning">
                  {dashboard.alerts.low_stock_count}件の材料が安全在庫を下回っています
                </Banner>
              )}

              {/* 今月のサマリー */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    今月の実績
                  </Text>
                  <InlineStack gap="800" wrap={false}>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">売上</Text>
                      <Text as="p" variant="heading2xl">
                        {formatCurrency(dashboard.current_month.sales)}
                      </Text>
                      <Badge tone={dashboard.comparison.sales_change_rate >= 0 ? "success" : "critical"}>
                        {`前月比 ${formatChangeRate(dashboard.comparison.sales_change_rate)}`}
                      </Badge>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">粗利益</Text>
                      <Text as="p" variant="heading2xl">
                        {formatCurrency(dashboard.current_month.gross_profit)}
                      </Text>
                      <Badge tone={dashboard.comparison.profit_change_rate >= 0 ? "success" : "critical"}>
                        {`前月比 ${formatChangeRate(dashboard.comparison.profit_change_rate)}`}
                      </Badge>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">粗利率</Text>
                      <Text as="p" variant="heading2xl">
                        {dashboard.current_month.gross_profit_rate}%
                      </Text>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">注文件数</Text>
                      <Text as="p" variant="heading2xl">
                        {dashboard.current_month.order_count}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* 注文ステータス */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    注文ステータス
                  </Text>
                  <InlineStack gap="400">
                    <Badge tone="attention">{`新規: ${dashboard.order_status.new}`}</Badge>
                    <Badge tone="info">{`製造中: ${dashboard.order_status.manufacturing}`}</Badge>
                    <Badge tone="warning">{`製造完了: ${dashboard.order_status.completed}`}</Badge>
                    <Badge tone="success">{`出荷済み: ${dashboard.order_status.shipped}`}</Badge>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* 売上推移（簡易グラフ） */}
              {salesTrend && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      売上推移（過去12ヶ月）
                    </Text>
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric"]}
                      headings={["月", "売上", "粗利益"]}
                      rows={salesTrend.trend.map((item) => [
                        item.month,
                        formatCurrency(item.sales),
                        formatCurrency(item.profit),
                      ])}
                    />
                  </BlockStack>
                </Card>
              )}

              {/* 材料在庫アラート */}
              {dashboard.alerts.low_stock_materials.length > 0 && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      在庫アラート
                    </Text>
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric", "text"]}
                      headings={["材料名", "現在在庫", "安全在庫", "単位"]}
                      rows={dashboard.alerts.low_stock_materials.map((m) => [
                        m.name,
                        m.current_stock,
                        m.safety_stock,
                        m.unit,
                      ])}
                    />
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          )}

          {/* 売上推移タブ */}
          {selectedTab === 1 && (
            <Card>
              <BlockStack gap="400">
                <Select
                  label="集計期間"
                  options={[
                    { label: "日別", value: "daily" },
                    { label: "週別", value: "weekly" },
                    { label: "月別", value: "monthly" },
                  ]}
                  value={period}
                  onChange={setPeriod}
                />
                {salesByPeriod.length === 0 ? (
                  <Text as="p" tone="subdued">データがありません</Text>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric"]}
                    headings={["期間", "売上", "原価", "粗利益", "注文数"]}
                    rows={salesByPeriod.map((item) => [
                      item.period,
                      formatCurrency(item.total_sales),
                      formatCurrency(item.total_cost),
                      formatCurrency(item.gross_profit),
                      item.order_count,
                    ])}
                  />
                )}
              </BlockStack>
            </Card>
          )}

          {/* 商品別分析タブ */}
          {selectedTab === 2 && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  商品別売上・粗利分析
                </Text>
                {productAnalytics.length === 0 ? (
                  <Text as="p" tone="subdued">データがありません</Text>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "numeric"]}
                    headings={["商品名", "販売数", "売上", "原価", "粗利益", "粗利率"]}
                    rows={productAnalytics.map((p) => [
                      p.product_name,
                      p.total_quantity,
                      formatCurrency(p.total_sales),
                      formatCurrency(p.total_cost),
                      formatCurrency(p.gross_profit),
                      `${p.gross_profit_rate}%`,
                    ])}
                  />
                )}
              </BlockStack>
            </Card>
          )}

          {/* 得意先別分析タブ */}
          {selectedTab === 3 && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  得意先別売上・粗利分析
                </Text>
                {customerAnalytics.length === 0 ? (
                  <Text as="p" tone="subdued">データがありません</Text>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "numeric", "text"]}
                    headings={["得意先", "注文数", "売上", "原価", "粗利益", "粗利率", "最終注文日"]}
                    rows={customerAnalytics.map((c) => [
                      c.company_name,
                      c.total_orders,
                      formatCurrency(c.total_sales),
                      formatCurrency(c.total_cost),
                      formatCurrency(c.gross_profit),
                      `${c.gross_profit_rate}%`,
                      c.last_order_date
                        ? new Date(c.last_order_date).toLocaleDateString("ja-JP")
                        : "-",
                    ])}
                  />
                )}
              </BlockStack>
            </Card>
          )}

          {/* 在庫回転率タブ */}
          {selectedTab === 4 && (
            <BlockStack gap="400">
              {inventoryTurnover && (
                <>
                  {/* サマリー */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">
                        在庫サマリー
                      </Text>
                      <InlineStack gap="800">
                        <BlockStack gap="100">
                          <Text as="p" tone="subdued">総在庫金額</Text>
                          <Text as="p" variant="headingLg">
                            {formatCurrency(inventoryTurnover.summary.total_stock_value)}
                          </Text>
                        </BlockStack>
                        <BlockStack gap="100">
                          <Text as="p" tone="subdued">商品数</Text>
                          <Text as="p" variant="headingLg">
                            {inventoryTurnover.summary.total_products}
                          </Text>
                        </BlockStack>
                        <BlockStack gap="100">
                          <Text as="p" tone="subdued">滞留在庫数</Text>
                          <Text as="p" variant="headingLg" tone="critical">
                            {inventoryTurnover.summary.slow_moving_count}
                          </Text>
                        </BlockStack>
                        <BlockStack gap="100">
                          <Text as="p" tone="subdued">滞留在庫金額</Text>
                          <Text as="p" variant="headingLg" tone="critical">
                            {formatCurrency(inventoryTurnover.summary.slow_moving_value)}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  {/* 商品別回転率 */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">
                        商品別在庫回転率
                      </Text>
                      <DataTable
                        columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "numeric", "text"]}
                        headings={["商品名", "SKU", "現在在庫", "年間出荷数", "回転率", "在庫日数", "状態"]}
                        rows={inventoryTurnover.products.map((p) => [
                          p.product_name,
                          p.sku || "-",
                          p.current_stock,
                          p.annual_sold,
                          p.turnover_rate,
                          p.days_of_inventory !== null ? `${p.days_of_inventory}日` : "-",
                          <Badge
                            key={p.product_id}
                            tone={p.status === "good" ? "success" : p.status === "normal" ? "info" : "critical"}
                          >
                            {p.status === "good" ? "良好" : p.status === "normal" ? "普通" : "滞留"}
                          </Badge>,
                        ])}
                      />
                    </BlockStack>
                  </Card>

                  {/* 滞留在庫 */}
                  {inventoryTurnover.slow_moving.length > 0 && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingMd" as="h2">
                          滞留在庫（回転率1未満）
                        </Text>
                        <Banner tone="warning">
                          滞留在庫は販売促進や値下げを検討してください
                        </Banner>
                        <DataTable
                          columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                          headings={["商品名", "現在在庫", "在庫金額", "回転率"]}
                          rows={inventoryTurnover.slow_moving.map((p) => [
                            p.product_name,
                            p.current_stock,
                            formatCurrency(p.stock_value),
                            p.turnover_rate,
                          ])}
                        />
                      </BlockStack>
                    </Card>
                  )}
                </>
              )}
            </BlockStack>
          )}

          {/* 売掛金管理タブ */}
          {selectedTab === 5 && (
            <BlockStack gap="400">
              {receivables && (
                <>
                  {/* サマリー */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">
                        売掛金サマリー
                      </Text>
                      <InlineStack gap="800">
                        <BlockStack gap="100">
                          <Text as="p" tone="subdued">売掛金残高</Text>
                          <Text as="p" variant="headingLg">
                            {formatCurrency(receivables.summary.total_unpaid)}
                          </Text>
                          <Text as="p" tone="subdued">{receivables.summary.unpaid_count}件</Text>
                        </BlockStack>
                        <BlockStack gap="100">
                          <Text as="p" tone="subdued">延滞金額</Text>
                          <Text as="p" variant="headingLg" tone="critical">
                            {formatCurrency(receivables.summary.total_overdue)}
                          </Text>
                          <Text as="p" tone="subdued">{receivables.summary.overdue_count}件</Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  {/* 滞留日数別 */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">
                        滞留日数別残高
                      </Text>
                      <InlineStack gap="400" wrap>
                        <Box padding="300" background="bg-surface-success" borderRadius="200">
                          <BlockStack gap="100">
                            <Text as="p" tone="subdued">期日前</Text>
                            <Text as="p" fontWeight="bold">{formatCurrency(receivables.aging.current)}</Text>
                          </BlockStack>
                        </Box>
                        <Box padding="300" background="bg-surface-warning" borderRadius="200">
                          <BlockStack gap="100">
                            <Text as="p" tone="subdued">1-30日</Text>
                            <Text as="p" fontWeight="bold">{formatCurrency(receivables.aging.days_1_30)}</Text>
                          </BlockStack>
                        </Box>
                        <Box padding="300" background="bg-surface-warning" borderRadius="200">
                          <BlockStack gap="100">
                            <Text as="p" tone="subdued">31-60日</Text>
                            <Text as="p" fontWeight="bold">{formatCurrency(receivables.aging.days_31_60)}</Text>
                          </BlockStack>
                        </Box>
                        <Box padding="300" background="bg-surface-critical" borderRadius="200">
                          <BlockStack gap="100">
                            <Text as="p" tone="subdued">61-90日</Text>
                            <Text as="p" fontWeight="bold">{formatCurrency(receivables.aging.days_61_90)}</Text>
                          </BlockStack>
                        </Box>
                        <Box padding="300" background="bg-surface-critical" borderRadius="200">
                          <BlockStack gap="100">
                            <Text as="p" tone="subdued">90日超</Text>
                            <Text as="p" fontWeight="bold">{formatCurrency(receivables.aging.over_90)}</Text>
                          </BlockStack>
                        </Box>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  {/* 得意先別残高 */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">
                        得意先別売掛金残高
                      </Text>
                      {receivables.by_customer.length === 0 ? (
                        <Text as="p" tone="subdued">売掛金はありません</Text>
                      ) : (
                        <DataTable
                          columnContentTypes={["text", "numeric", "numeric", "numeric", "text"]}
                          headings={["得意先", "未回収金額", "延滞金額", "請求数", "最古支払期日"]}
                          rows={receivables.by_customer.map((c) => [
                            c.company_name,
                            formatCurrency(c.total_unpaid),
                            formatCurrency(c.overdue_amount),
                            c.invoice_count,
                            c.oldest_due_date
                              ? new Date(c.oldest_due_date).toLocaleDateString("ja-JP")
                              : "-",
                          ])}
                        />
                      )}
                    </BlockStack>
                  </Card>

                  {/* 延滞リスト */}
                  {receivables.overdue_list.length > 0 && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingMd" as="h2">
                          延滞一覧
                        </Text>
                        <Banner tone="critical">
                          支払期日を過ぎた請求があります。回収をご確認ください。
                        </Banner>
                        <DataTable
                          columnContentTypes={["text", "text", "numeric", "text", "numeric", "text"]}
                          headings={["得意先", "注文番号", "金額", "支払期日", "延滞日数", "操作"]}
                          rows={receivables.overdue_list.map((r) => [
                            r.customer_name,
                            r.order_number,
                            formatCurrency(r.amount),
                            new Date(r.due_date).toLocaleDateString("ja-JP"),
                            `${r.days_overdue}日`,
                            <Button key={r.id} size="slim" onClick={() => markAsPaid(r.id)}>
                              入金済み
                            </Button>,
                          ])}
                        />
                      </BlockStack>
                    </Card>
                  )}
                </>
              )}
            </BlockStack>
          )}
        </Tabs>
      </BlockStack>
    </Page>
  );
}
