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

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    // バリデーション
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上必要です");
      return;
    }

    if (loginId.length < 4) {
      setError("ログインIDは4文字以上必要です");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          login_id: loginId,
          password,
          address: address || undefined,
          phone: phone || undefined,
          email: email || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "登録に失敗しました");
        setLoading(false);
        return;
      }

      // トークンを保存（自動ログイン）
      localStorage.setItem("customerToken", data.token);
      localStorage.setItem("customer", JSON.stringify(data.customer));

      // 商品一覧ページにリダイレクト
      navigate("/customer/products");
    } catch (err) {
      setError("登録処理中にエラーが発生しました");
      setLoading(false);
    }
  };

  const isFormValid = companyName && loginId && password && confirmPassword;

  return (
    <Page title="新規会員登録">
      <Card>
        <BlockStack gap="400">
          <FormLayout>
            {error && (
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            )}
            <TextField
              label="会社名 / 屋号"
              value={companyName}
              onChange={setCompanyName}
              autoComplete="organization"
              requiredIndicator
            />
            <TextField
              label="ログインID"
              value={loginId}
              onChange={setLoginId}
              autoComplete="username"
              helpText="4文字以上で設定してください"
              requiredIndicator
            />
            <TextField
              label="パスワード"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              helpText="8文字以上で設定してください"
              requiredIndicator
            />
            <TextField
              label="パスワード（確認）"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              requiredIndicator
            />
            <TextField
              label="住所"
              value={address}
              onChange={setAddress}
              autoComplete="street-address"
            />
            <TextField
              label="電話番号"
              value={phone}
              onChange={setPhone}
              autoComplete="tel"
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!isFormValid}
              fullWidth
            >
              登録する
            </Button>
          </FormLayout>
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <Text as="p" tone="subdued">
              既にアカウントをお持ちの方は{" "}
              <Link to="/customer/login" style={{ color: "#2c6ecb" }}>
                ログイン
              </Link>
            </Text>
          </div>
        </BlockStack>
      </Card>
    </Page>
  );
}
