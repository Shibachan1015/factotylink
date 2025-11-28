import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
} from "@shopify/polaris";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/customer/login", {
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
      localStorage.setItem("customerToken", data.token);
      localStorage.setItem("customer", JSON.stringify(data.customer));

      // 商品一覧ページにリダイレクト
      navigate("/customer/products");
    } catch (err) {
      setError("ログイン処理中にエラーが発生しました");
      setLoading(false);
    }
  };

  return (
    <Page title="得意先ログイン">
      <Card>
        <FormLayout>
          {error && (
            <Banner status="critical" onDismiss={() => setError(null)}>
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
            primary
            onClick={handleSubmit}
            loading={loading}
            disabled={!loginId || !password}
          >
            ログイン
          </Button>
        </FormLayout>
      </Card>
    </Page>
  );
}

