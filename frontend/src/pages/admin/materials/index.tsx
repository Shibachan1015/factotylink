import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Button,
  InlineStack,
  Badge,
  Banner,
} from "@shopify/polaris";

interface Material {
  id: string;
  name: string;
  code: string | null;
  unit: string;
  current_stock: number;
  safety_stock: number;
  unit_price: number | null;
}

export default function AdminMaterialsPage() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("shop_id", "00000000-0000-0000-0000-000000000000"); // 簡易実装

      const response = await fetch(`/api/admin/materials?${params}`);

      const data = await response.json();
      if (response.ok) {
        setMaterials(data.materials || []);
      } else {
        setError(data.error || "材料の取得に失敗しました");
      }
    } catch (error) {
      setError("材料の取得中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm("この材料を削除しますか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/materials/${materialId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchMaterials();
      } else {
        const data = await response.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      alert("削除処理中にエラーが発生しました");
    }
  };

  return (
    <Page
      title="材料在庫管理"
      primaryAction={{
        content: "新規登録",
        onAction: () => navigate("/admin/materials/new"),
      }}
      secondaryActions={[
        {
          content: "入出庫履歴",
          onAction: () => navigate("/admin/materials/transactions"),
        },
      ]}
    >
      <Card>
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}
        <ResourceList
          resourceName={{ singular: "材料", plural: "材料" }}
          items={materials}
          loading={loading}
          renderItem={(material) => {
            const isLowStock = material.current_stock < material.safety_stock;

            return (
              <ResourceItem
                id={material.id}
                onClick={() => navigate(`/admin/materials/${material.id}`)}
              >
                <InlineStack align="space-between" blockAlign="center" gap="400">
                  <div style={{flexGrow: 1}}>
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      {material.name}
                    </Text>
                    {material.code && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        コード: {material.code}
                      </Text>
                    )}
                    <Text variant="bodySm" as="p">
                      在庫: {material.current_stock} {material.unit}
                    </Text>
                    <Text variant="bodySm" as="p">
                      安全在庫: {material.safety_stock} {material.unit}
                    </Text>
                    {material.unit_price && (
                      <Text variant="bodySm" as="p">
                        単価: ¥{material.unit_price.toLocaleString()}
                      </Text>
                    )}
                    {isLowStock && (
                      <Badge tone="critical">在庫不足</Badge>
                    )}
                  </div>
                  <div>
                    <Button
                      tone="critical"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(material.id);
                      }}
                    >
                      削除
                    </Button>
                  </div>
                </InlineStack>
              </ResourceItem>
            );
          }}
        />
      </Card>
    </Page>
  );
}
