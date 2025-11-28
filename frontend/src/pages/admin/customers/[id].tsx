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
} from "@shopify/polaris";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const customerSchema = z.object({
  company_name: z.string().min(1, "会社名は必須です"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください").optional().or(z.literal("")),
  billing_type: z.enum(["immediate", "credit"]),
  login_id: z.string().min(1, "ログインIDは必須です"),
  password: z.string().min(8, "パスワードは8文字以上必要です").optional().or(z.literal("")),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      billing_type: "immediate",
    },
  });

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
        setValue("company_name", customer.company_name);
        setValue("address", customer.address || "");
        setValue("phone", customer.phone || "");
        setValue("email", customer.email || "");
        setValue("billing_type", customer.billing_type);
        setValue("login_id", customer.login_id);
      }
    } catch (err) {
      setError("得意先の取得中にエラーが発生しました");
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    setError(null);
    setLoading(true);

    try {
      const url = isNew
        ? "/api/admin/customers"
        : `/api/admin/customers/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const payload: any = { ...data };
      if (!isNew && !data.password) {
        delete payload.password;
      }
      if (!data.address) delete payload.address;
      if (!data.phone) delete payload.phone;
      if (!data.email) delete payload.email;

      if (isNew) {
        // 新規作成時はshop_idが必要（簡易実装として固定値）
        payload.shop_id = "00000000-0000-0000-0000-000000000000";
      }

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

  return (
    <Page
      title={isNew ? "得意先新規登録" : "得意先編集"}
      backAction={{ onAction: () => navigate("/admin/customers") }}
    >
      <Card>
        <FormLayout>
          {error && (
            <Banner status="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="会社名"
              {...register("company_name")}
              error={errors.company_name?.message}
            />
            <TextField
              label="住所"
              {...register("address")}
              error={errors.address?.message}
            />
            <TextField
              label="電話番号"
              {...register("phone")}
              error={errors.phone?.message}
            />
            <TextField
              label="メールアドレス"
              type="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <Select
              label="請求方式"
              options={[
                { label: "都度", value: "immediate" },
                { label: "掛売", value: "credit" },
              ]}
              value={watch("billing_type")}
              onChange={(value) => setValue("billing_type", value as "immediate" | "credit")}
            />
            <TextField
              label="ログインID"
              {...register("login_id")}
              error={errors.login_id?.message}
            />
            <TextField
              label={isNew ? "パスワード" : "パスワード（変更する場合のみ）"}
              type="password"
              {...register("password")}
              error={errors.password?.message}
            />
            <Button primary submit loading={loading}>
              {isNew ? "登録" : "更新"}
            </Button>
          </form>
        </FormLayout>
      </Card>
    </Page>
  );
}

