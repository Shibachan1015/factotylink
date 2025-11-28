import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  BlockStack,
} from "@shopify/polaris";

interface CustomerFormData {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  billing_type: "immediate" | "credit";
  login_id: string;
  password: string;
}

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CustomerFormData>({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    billing_type: "immediate",
    login_id: "",
    password: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});

  useEffect(() => {
    if (!isNew && id) {
      fetchCustomer(id);
    }
  }, [id, isNew]);

  const fetchCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`);
      const data = await response.json();

      if (response.ok && data.customer) {
        const customer = data.customer;
        setFormData({
          company_name: customer.company_name || "",
          address: customer.address || "",
          phone: customer.phone || "",
          email: customer.email || "",
          billing_type: customer.billing_type || "immediate",
          login_id: customer.login_id || "",
          password: "",
        });
      }
    } catch (err) {
      setError("得意先の取得中にエラーが発生しました");
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerFormData, string>> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = "会社名は必須です";
    }
    if (!formData.login_id.trim()) {
      newErrors.login_id = "ログインIDは必須です";
    }
    if (isNew && formData.password.length < 8) {
      newErrors.password = "パスワードは8文字以上必要です";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "有効なメールアドレスを入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setError(null);
    setLoading(true);

    try {
      const url = isNew
        ? "/api/admin/customers"
        : `/api/admin/customers/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const payload: Record<string, unknown> = {
        company_name: formData.company_name,
        billing_type: formData.billing_type,
        login_id: formData.login_id,
      };

      if (formData.address) payload.address = formData.address;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.email) payload.email = formData.email;
      if (formData.password) payload.password = formData.password;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        navigate("/admin/customers");
      } else {
        setError(result.error || "保存に失敗しました");
      }
    } catch (err) {
      setError("保存処理中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CustomerFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Page
      title={isNew ? "得意先新規登録" : "得意先編集"}
      backAction={{ onAction: () => navigate("/admin/customers") }}
    >
      <Card>
        <BlockStack gap="400">
          <FormLayout>
            {error && (
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            )}
            <TextField
              label="会社名"
              value={formData.company_name}
              onChange={handleChange("company_name")}
              error={errors.company_name}
              autoComplete="organization"
              requiredIndicator
            />
            <TextField
              label="住所"
              value={formData.address}
              onChange={handleChange("address")}
              error={errors.address}
              autoComplete="street-address"
            />
            <TextField
              label="電話番号"
              value={formData.phone}
              onChange={handleChange("phone")}
              error={errors.phone}
              autoComplete="tel"
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              error={errors.email}
              autoComplete="email"
            />
            <Select
              label="請求方式"
              options={[
                { label: "都度", value: "immediate" },
                { label: "掛売", value: "credit" },
              ]}
              value={formData.billing_type}
              onChange={(value) => handleChange("billing_type")(value)}
            />
            <TextField
              label="ログインID"
              value={formData.login_id}
              onChange={handleChange("login_id")}
              error={errors.login_id}
              autoComplete="username"
              requiredIndicator
            />
            <TextField
              label={isNew ? "パスワード" : "パスワード（変更する場合のみ）"}
              type="password"
              value={formData.password}
              onChange={handleChange("password")}
              error={errors.password}
              autoComplete="new-password"
              requiredIndicator={isNew}
            />
            <Button variant="primary" onClick={handleSubmit} loading={loading}>
              {isNew ? "登録" : "更新"}
            </Button>
          </FormLayout>
        </BlockStack>
      </Card>
    </Page>
  );
}
