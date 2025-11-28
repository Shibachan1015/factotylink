import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  Spinner,
  DataTable,
  Divider,
  Box,
} from "@shopify/polaris";
import { apiGet, apiPost } from "../../../utils/api";

interface AiReport {
  id: string;
  type: string;
  period_start: string;
  period_end: string;
  summary: string;
  generated_at: string;
}

interface GeneratedAdvice {
  advice: string;
  metrics: {
    current_month: {
      sales: number;
      profit: number;
      profit_rate: number;
      order_count: number;
    };
    comparison: {
      sales_change: number;
      profit_change: number;
    };
  };
  generated_at: string;
}

export default function AdminAiPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [currentAdvice, setCurrentAdvice] = useState<GeneratedAdvice | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [settingsRes, reportsRes] = await Promise.all([
        apiGet<{ settings: { anthropic_api_key_masked?: string; ai_enabled?: boolean } }>(
          `/api/admin/settings?shop_id=${shopId}`
        ),
        apiGet<{ reports: AiReport[] }>(`/api/admin/ai/reports?shop_id=${shopId}`),
      ]);

      setApiKeyConfigured(!!settingsRes.settings?.anthropic_api_key_masked);
      setAiEnabled(settingsRes.settings?.ai_enabled || false);
      setReports(reportsRes.reports || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const generateAdvice = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiPost<GeneratedAdvice>(`/api/admin/ai/generate?shop_id=${shopId}`);
      setCurrentAdvice(result);
      setSuccess("AIアドバイスを生成しました");
      // レポート一覧を更新
      const reportsRes = await apiGet<{ reports: AiReport[] }>(`/api/admin/ai/reports?shop_id=${shopId}`);
      setReports(reportsRes.reports || []);
    } catch (err) {
      console.error("Failed to generate advice:", err);
      setError(err instanceof Error ? err.message : "AIアドバイスの生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  if (loading) {
    return (
      <Page title="AI経営アドバイス">
        <Card>
          <InlineStack align="center">
            <Spinner />
          </InlineStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="AI経営アドバイス"
      secondaryActions={[
        {
          content: "設定",
          onAction: () => navigate("/admin/settings"),
        },
      ]}
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

        {/* APIキー未設定の場合 */}
        {!apiKeyConfigured && (
          <Banner tone="warning">
            <BlockStack gap="200">
              <Text as="p">
                Claude APIキーが設定されていません。AI機能を利用するには、設定画面からAPIキーを登録してください。
              </Text>
              <Button onClick={() => navigate("/admin/settings")}>
                設定画面へ
              </Button>
            </BlockStack>
          </Banner>
        )}

        {/* AI無効の場合 */}
        {apiKeyConfigured && !aiEnabled && (
          <Banner tone="info">
            <BlockStack gap="200">
              <Text as="p">
                AI機能が無効になっています。設定画面から有効にしてください。
              </Text>
              <Button onClick={() => navigate("/admin/settings")}>
                設定画面へ
              </Button>
            </BlockStack>
          </Banner>
        )}

        {/* アドバイス生成 */}
        {apiKeyConfigured && aiEnabled && (
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">
                  経営アドバイスを生成
                </Text>
                <Button
                  variant="primary"
                  onClick={generateAdvice}
                  loading={generating}
                >
                  アドバイスを生成
                </Button>
              </InlineStack>
              <Text as="p" tone="subdued">
                現在の経営データを分析し、Claude AIが具体的な経営アドバイスを提供します。
              </Text>
            </BlockStack>
          </Card>
        )}

        {/* 最新のアドバイス */}
        {currentAdvice && (
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                最新のアドバイス
              </Text>
              <Text as="p" tone="subdued">
                生成日時: {formatDate(currentAdvice.generated_at)}
              </Text>

              {/* サマリー */}
              <InlineStack gap="400">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text as="p" tone="subdued">今月の売上</Text>
                    <Text as="p" fontWeight="bold">
                      {formatCurrency(currentAdvice.metrics.current_month.sales)}
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text as="p" tone="subdued">粗利益</Text>
                    <Text as="p" fontWeight="bold">
                      {formatCurrency(currentAdvice.metrics.current_month.profit)}
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text as="p" tone="subdued">粗利率</Text>
                    <Text as="p" fontWeight="bold">
                      {currentAdvice.metrics.current_month.profit_rate}%
                    </Text>
                  </BlockStack>
                </Box>
              </InlineStack>

              <Divider />

              {/* アドバイス本文 */}
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  {currentAdvice.advice.split("\n").map((line, index) => (
                    <Text key={index} as="p">
                      {line}
                    </Text>
                  ))}
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        )}

        {/* 過去のレポート */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              過去のレポート
            </Text>
            {reports.length === 0 ? (
              <Text as="p" tone="subdued">
                まだレポートがありません。「アドバイスを生成」ボタンを押して最初のレポートを作成してください。
              </Text>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text"]}
                headings={["生成日時", "期間", "操作"]}
                rows={reports.map((report) => [
                  formatDate(report.generated_at),
                  `${new Date(report.period_start).toLocaleDateString("ja-JP")} 〜`,
                  <Button
                    key={report.id}
                    size="slim"
                    onClick={() => {
                      setCurrentAdvice({
                        advice: report.summary,
                        metrics: {
                          current_month: { sales: 0, profit: 0, profit_rate: 0, order_count: 0 },
                          comparison: { sales_change: 0, profit_change: 0 },
                        },
                        generated_at: report.generated_at,
                      });
                    }}
                  >
                    表示
                  </Button>,
                ])}
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
