import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  BlockStack,
} from "@shopify/polaris";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: loginId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ログインに失敗しました");
        setLoading(false);
        return;
      }

      // トークンを保存
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminShop", JSON.stringify(data.shop));

      // 管理画面にリダイレクト
      navigate("/admin");
    } catch (err) {
      setError("ログイン処理中にエラーが発生しました");
      setLoading(false);
    }
  };

  return (
    <Page title="管理者ログイン">
      <Card>
        <BlockStack gap="400">
          <FormLayout>
            {error && (
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            )}
            <TextField
              label="ログインID"
              value={loginId}
              onChange={setLoginId}
              autoComplete="username"
            />
            <TextField
              label="パスワード"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!loginId || !password}
              fullWidth
            >
              ログイン
            </Button>
          </FormLayout>
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <Text as="p" tone="subdued">
              管理者アカウントをお持ちでない方は{" "}
              <Link to="/admin/register" style={{ color: "#2c6ecb" }}>
                新規登録
              </Link>
            </Text>
            <Text as="p" tone="subdued">
              得意先の方は{" "}
              <Link to="/customer/login" style={{ color: "#2c6ecb" }}>
                こちら
              </Link>
            </Text>
          </div>
        </BlockStack>
      </Card>
    </Page>
  );
}
