import { useState, useEffect } from "react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Checkbox,
  Button,
  Banner,
  Spinner,
  Divider,
} from "@shopify/polaris";
import { apiGet, apiPatch, apiPost } from "../../../utils/api";

interface ShopSettings {
  anthropic_api_key_masked?: string;
  ai_enabled: boolean;
  ai_weekly_report: boolean;
  ai_monthly_report: boolean;
  ai_alert_enabled: boolean;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState<ShopSettings>({
    ai_enabled: false,
    ai_weekly_report: false,
    ai_monthly_report: false,
    ai_alert_enabled: false,
  });

  const [apiKey, setApiKey] = useState("");
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ settings: ShopSettings }>(
        `/api/admin/settings?shop_id=${shopId}`
      );
      if (res.settings) {
        setSettings({
          ai_enabled: res.settings.ai_enabled || false,
          ai_weekly_report: res.settings.ai_weekly_report || false,
          ai_monthly_report: res.settings.ai_monthly_report || false,
          ai_alert_enabled: res.settings.ai_alert_enabled || false,
        });
        setApiKeyMasked(res.settings.anthropic_api_key_masked || null);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setError("設定の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: Record<string, unknown> = {
        ai_enabled: settings.ai_enabled,
        ai_weekly_report: settings.ai_weekly_report,
        ai_monthly_report: settings.ai_monthly_report,
        ai_alert_enabled: settings.ai_alert_enabled,
      };

      // 新しいAPIキーが入力されている場合のみ更新
      if (apiKey) {
        updateData.anthropic_api_key = apiKey;
      }

      const res = await apiPatch<{ settings: ShopSettings }>(
        `/api/admin/settings?shop_id=${shopId}`,
        updateData
      );

      if (res.settings?.anthropic_api_key_masked) {
        setApiKeyMasked(res.settings.anthropic_api_key_masked);
      }
      setApiKey("");
      setSuccess("設定を保存しました");
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err instanceof Error ? err.message : "設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const validateApiKey = async () => {
    setValidating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiPost<{ valid: boolean; message?: string; error?: string }>(
        `/api/admin/settings/validate-api-key?shop_id=${shopId}`
      );

      if (res.valid) {
        setSuccess("APIキーは有効です");
      } else {
        setError(res.error || "APIキーが無効です");
      }
    } catch (err) {
      console.error("Failed to validate API key:", err);
      setError("APIキーの検証に失敗しました");
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <Page title="設定">
        <Card>
          <InlineStack align="center">
            <Spinner />
          </InlineStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="設定">
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

        {/* AI設定 */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              AI経営アドバイス設定
            </Text>

            <Text as="p" tone="subdued">
              Claude APIを使用してAI経営アドバイス機能を利用できます。
              APIキーはAnthropicのコンソールから取得できます。
            </Text>

            <Divider />

            {/* APIキー */}
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">
                Claude APIキー
              </Text>

              {apiKeyMasked && (
                <Text as="p" tone="subdued">
                  現在のAPIキー: {apiKeyMasked}
                </Text>
              )}

              <TextField
                label="新しいAPIキー"
                type="password"
                value={apiKey}
                onChange={setApiKey}
                placeholder="sk-ant-..."
                autoComplete="off"
                helpText="APIキーを変更する場合のみ入力してください"
              />

              {apiKeyMasked && (
                <Button
                  onClick={validateApiKey}
                  loading={validating}
                  disabled={!apiKeyMasked}
                >
                  APIキーを検証
                </Button>
              )}
            </BlockStack>

            <Divider />

            {/* AI機能トグル */}
            <BlockStack gap="300">
              <Checkbox
                label="AI機能を有効にする"
                checked={settings.ai_enabled}
                onChange={(checked) => setSettings({ ...settings, ai_enabled: checked })}
                helpText="オンにするとAI経営アドバイス機能が利用可能になります"
              />

              <Checkbox
                label="週次レポート自動生成"
                checked={settings.ai_weekly_report}
                onChange={(checked) => setSettings({ ...settings, ai_weekly_report: checked })}
                helpText="毎週月曜日に自動でレポートを生成します"
                disabled={!settings.ai_enabled}
              />

              <Checkbox
                label="月次レポート自動生成"
                checked={settings.ai_monthly_report}
                onChange={(checked) => setSettings({ ...settings, ai_monthly_report: checked })}
                helpText="毎月1日に自動でレポートを生成します"
                disabled={!settings.ai_enabled}
              />

              <Checkbox
                label="アラート機能を有効にする"
                checked={settings.ai_alert_enabled}
                onChange={(checked) => setSettings({ ...settings, ai_alert_enabled: checked })}
                helpText="材料在庫不足や粗利率低下などを自動検知します"
                disabled={!settings.ai_enabled}
              />
            </BlockStack>

            <Divider />

            <InlineStack align="end">
              <Button variant="primary" onClick={saveSettings} loading={saving}>
                設定を保存
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* API料金の注意 */}
        <Card>
          <BlockStack gap="200">
            <Text variant="headingSm" as="h3">
              ご利用にあたって
            </Text>
            <Text as="p" tone="subdued">
              AI機能の利用にはClaude APIの利用料金が発生します。
              料金はAnthropicの料金体系に準じます。
              詳細はAnthropicの公式サイトをご確認ください。
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
