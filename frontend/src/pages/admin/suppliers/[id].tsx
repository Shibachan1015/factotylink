import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  BlockStack,
  TextField,
  Button,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import { apiGet, apiPost, apiPatch } from "../../../utils/api";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const shopId = localStorage.getItem("shopId") || "default-shop-id";

  useEffect(() => {
    if (!isNew && id) {
      fetchSupplier();
    }
  }, [id, isNew]);

  const fetchSupplier = async () => {
    try {
      const data = await apiGet<{ supplier: Supplier }>(
        `/api/admin/suppliers/${id}`
      );
      const s = data.supplier;
      setName(s.name);
      setContactName(s.contact_name || "");
      setPhone(s.phone || "");
      setEmail(s.email || "");
      setAddress(s.address || "");
      setNotes(s.notes || "");
    } catch (err) {
      console.error("Failed to fetch supplier:", err);
      setError("仕入れ先の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("会社名は必須です");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        shop_id: shopId,
        name: name.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (isNew) {
        await apiPost("/api/admin/suppliers", payload);
      } else {
        await apiPatch(`/api/admin/suppliers/${id}`, payload);
      }

      navigate("/admin/suppliers");
    } catch (err) {
      console.error("Failed to save supplier:", err);
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Page title="仕入れ先">読み込み中...</Page>;
  }

  return (
    <Page
      title={isNew ? "仕入れ先を追加" : "仕入れ先を編集"}
      backAction={{ onAction: () => navigate("/admin/suppliers") }}
    >
      <BlockStack gap="400">
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <TextField
              label="会社名"
              value={name}
              onChange={setName}
              autoComplete="organization"
              requiredIndicator
            />
            <TextField
              label="担当者名"
              value={contactName}
              onChange={setContactName}
              autoComplete="name"
            />
            <TextField
              label="電話番号"
              value={phone}
              onChange={setPhone}
              type="tel"
              autoComplete="tel"
            />
            <TextField
              label="メールアドレス"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
            <TextField
              label="住所"
              value={address}
              onChange={setAddress}
              multiline={2}
              autoComplete="street-address"
            />
            <TextField
              label="備考"
              value={notes}
              onChange={setNotes}
              multiline={3}
              autoComplete="off"
            />

            <InlineStack gap="200" align="end">
              <Button onClick={() => navigate("/admin/suppliers")}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={handleSubmit} loading={saving}>
                {isNew ? "追加" : "保存"}
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
