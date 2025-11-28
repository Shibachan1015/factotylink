import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
} from "@shopify/polaris";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const materialSchema = z.object({
  name: z.string().min(1, "材料名は必須です"),
  code: z.string().optional(),
  unit: z.string().min(1, "単位は必須です"),
  current_stock: z.number().min(0, "在庫数は0以上である必要があります"),
  safety_stock: z.number().min(0, "安全在庫は0以上である必要があります"),
  unit_price: z.number().min(0, "単価は0以上である必要があります").optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

export default function MaterialFormPage() {
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
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      current_stock: 0,
      safety_stock: 0,
    },
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchMaterial(id);
    }
  }, [id, isNew]);

  const fetchMaterial = async (materialId: string) => {
    try {
      const response = await fetch(`/api/admin/materials/${materialId}`);
      const data = await response.json();

      if (response.ok && data.material) {
        const material = data.material;
        setValue("name", material.name);
        setValue("code", material.code || "");
        setValue("unit", material.unit);
        setValue("current_stock", material.current_stock);
        setValue("safety_stock", material.safety_stock);
        setValue("unit_price", material.unit_price || undefined);
      }
    } catch (err) {
      setError("材料の取得中にエラーが発生しました");
    }
  };

  const onSubmit = async (data: MaterialFormData) => {
    setError(null);
    setLoading(true);

    try {
      const url = isNew
        ? "/api/admin/materials"
        : `/api/admin/materials/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const payload: any = { ...data };
      if (!payload.code) delete payload.code;
      if (payload.unit_price === undefined) delete payload.unit_price;

      if (isNew) {
        payload.shop_id = "00000000-0000-0000-0000-000000000000"; // 簡易実装
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        navigate("/admin/materials");
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
      title={isNew ? "材料新規登録" : "材料編集"}
      backAction={{ onAction: () => navigate("/admin/materials") }}
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
              label="材料名"
              {...register("name")}
              error={errors.name?.message}
            />
            <TextField
              label="コード"
              {...register("code")}
              error={errors.code?.message}
            />
            <TextField
              label="単位"
              {...register("unit")}
              error={errors.unit?.message}
              helpText="例: kg, 本, L, m"
            />
            <TextField
              label="現在在庫"
              type="number"
              step="0.001"
              {...register("current_stock", { valueAsNumber: true })}
              error={errors.current_stock?.message}
            />
            <TextField
              label="安全在庫"
              type="number"
              step="0.001"
              {...register("safety_stock", { valueAsNumber: true })}
              error={errors.safety_stock?.message}
            />
            <TextField
              label="単価"
              type="number"
              step="0.01"
              {...register("unit_price", { valueAsNumber: true })}
              error={errors.unit_price?.message}
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

