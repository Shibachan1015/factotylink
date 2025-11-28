import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  BlockStack,
} from "@shopify/polaris";

interface MaterialFormData {
  name: string;
  code: string;
  unit: string;
  current_stock: string;
  safety_stock: string;
  unit_price: string;
}

export default function MaterialFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<MaterialFormData>({
    name: "",
    code: "",
    unit: "",
    current_stock: "0",
    safety_stock: "0",
    unit_price: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MaterialFormData, string>>>({});

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
        setFormData({
          name: material.name || "",
          code: material.code || "",
          unit: material.unit || "",
          current_stock: String(material.current_stock ?? 0),
          safety_stock: String(material.safety_stock ?? 0),
          unit_price: material.unit_price ? String(material.unit_price) : "",
        });
      }
    } catch (err) {
      setError("材料の取得中にエラーが発生しました");
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof MaterialFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "材料名は必須です";
    }
    if (!formData.unit.trim()) {
      newErrors.unit = "単位は必須です";
    }

    const currentStock = parseFloat(formData.current_stock);
    if (isNaN(currentStock) || currentStock < 0) {
      newErrors.current_stock = "在庫数は0以上である必要があります";
    }

    const safetyStock = parseFloat(formData.safety_stock);
    if (isNaN(safetyStock) || safetyStock < 0) {
      newErrors.safety_stock = "安全在庫は0以上である必要があります";
    }

    if (formData.unit_price) {
      const unitPrice = parseFloat(formData.unit_price);
      if (isNaN(unitPrice) || unitPrice < 0) {
        newErrors.unit_price = "単価は0以上である必要があります";
      }
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
        ? "/api/admin/materials"
        : `/api/admin/materials/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const payload: Record<string, unknown> = {
        name: formData.name,
        unit: formData.unit,
        current_stock: parseFloat(formData.current_stock),
        safety_stock: parseFloat(formData.safety_stock),
      };

      if (formData.code) payload.code = formData.code;
      if (formData.unit_price) payload.unit_price = parseFloat(formData.unit_price);

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

  const handleChange = (field: keyof MaterialFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Page
      title={isNew ? "材料新規登録" : "材料編集"}
      backAction={{ onAction: () => navigate("/admin/materials") }}
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
              label="材料名"
              value={formData.name}
              onChange={handleChange("name")}
              error={errors.name}
              autoComplete="off"
              requiredIndicator
            />
            <TextField
              label="コード"
              value={formData.code}
              onChange={handleChange("code")}
              error={errors.code}
              autoComplete="off"
            />
            <TextField
              label="単位"
              value={formData.unit}
              onChange={handleChange("unit")}
              error={errors.unit}
              helpText="例: kg, 本, L, m"
              autoComplete="off"
              requiredIndicator
            />
            <TextField
              label="現在在庫"
              type="number"
              value={formData.current_stock}
              onChange={handleChange("current_stock")}
              error={errors.current_stock}
              autoComplete="off"
            />
            <TextField
              label="安全在庫"
              type="number"
              value={formData.safety_stock}
              onChange={handleChange("safety_stock")}
              error={errors.safety_stock}
              autoComplete="off"
            />
            <TextField
              label="単価"
              type="number"
              value={formData.unit_price}
              onChange={handleChange("unit_price")}
              error={errors.unit_price}
              autoComplete="off"
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
