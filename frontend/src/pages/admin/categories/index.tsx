import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Banner,
  Modal,
  ResourceList,
  ResourceItem,
} from "@shopify/polaris";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../utils/api";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 新規カテゴリ用
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // 編集用
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");

  // 削除用
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ categories: Category[] }>(
        `/api/admin/categories?shop_id=${shopId}`
      );
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError("カテゴリの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("カテゴリ名を入力してください");
      return;
    }

    setAddingCategory(true);
    setError(null);

    try {
      await apiPost("/api/admin/categories", {
        shop_id: shopId,
        name: newCategoryName.trim(),
        sort_order: categories.length,
      });
      setSuccess("カテゴリを追加しました");
      setNewCategoryName("");
      await fetchCategories();
    } catch (err) {
      console.error("Failed to add category:", err);
      setError(err instanceof Error ? err.message : "カテゴリの追加に失敗しました");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editCategory || !editName.trim()) return;

    try {
      await apiPatch(`/api/admin/categories/${editCategory.id}`, {
        name: editName.trim(),
      });
      setSuccess("カテゴリを更新しました");
      setEditModalOpen(false);
      setEditCategory(null);
      await fetchCategories();
    } catch (err) {
      console.error("Failed to update category:", err);
      setError(err instanceof Error ? err.message : "カテゴリの更新に失敗しました");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;

    try {
      await apiDelete(`/api/admin/categories/${deleteTarget.id}`);
      setSuccess("カテゴリを削除しました");
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      await fetchCategories();
    } catch (err) {
      console.error("Failed to delete category:", err);
      setError(err instanceof Error ? err.message : "カテゴリの削除に失敗しました");
    }
  };

  const openEditModal = (category: Category) => {
    setEditCategory(category);
    setEditName(category.name);
    setEditModalOpen(true);
  };

  const openDeleteModal = (category: Category) => {
    setDeleteTarget(category);
    setDeleteModalOpen(true);
  };

  return (
    <Page
      title="商品カテゴリ管理"
      backAction={{ onAction: () => navigate("/admin/products") }}
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

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">カテゴリを追加</Text>
            <InlineStack gap="200" blockAlign="end">
              <div style={{ flex: 1 }}>
                <TextField
                  label="カテゴリ名"
                  value={newCategoryName}
                  onChange={setNewCategoryName}
                  autoComplete="off"
                  placeholder="例: 調味料、冷凍食品、乾物"
                />
              </div>
              <Button
                variant="primary"
                onClick={handleAddCategory}
                loading={addingCategory}
              >
                追加
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">カテゴリ一覧</Text>
            <ResourceList
              resourceName={{ singular: "カテゴリ", plural: "カテゴリ" }}
              items={categories}
              loading={loading}
              emptyState={
                <Text as="p" tone="subdued">
                  カテゴリがありません
                </Text>
              }
              renderItem={(category) => (
                <ResourceItem
                  id={category.id}
                  onClick={() => openEditModal(category)}
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      {category.name}
                    </Text>
                    <InlineStack gap="200">
                      <Button
                        size="slim"
                        onClick={() => openEditModal(category)}
                      >
                        編集
                      </Button>
                      <Button
                        size="slim"
                        tone="critical"
                        onClick={() => openDeleteModal(category)}
                      >
                        削除
                      </Button>
                    </InlineStack>
                  </InlineStack>
                </ResourceItem>
              )}
            />
          </BlockStack>
        </Card>

        {/* 編集モーダル */}
        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="カテゴリを編集"
          primaryAction={{
            content: "保存",
            onAction: handleEditCategory,
          }}
          secondaryActions={[
            {
              content: "キャンセル",
              onAction: () => setEditModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <TextField
              label="カテゴリ名"
              value={editName}
              onChange={setEditName}
              autoComplete="off"
            />
          </Modal.Section>
        </Modal>

        {/* 削除確認モーダル */}
        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="カテゴリを削除"
          primaryAction={{
            content: "削除",
            destructive: true,
            onAction: handleDeleteCategory,
          }}
          secondaryActions={[
            {
              content: "キャンセル",
              onAction: () => setDeleteModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              「{deleteTarget?.name}」を削除しますか？この操作は取り消せません。
            </Text>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
