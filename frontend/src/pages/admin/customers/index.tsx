import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  InlineStack,
} from "@shopify/polaris";

interface Customer {
  id: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  billing_type: "immediate" | "credit";
  login_id: string;
}

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/customers");

      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm("この得意先を削除しますか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCustomers();
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
      title="得意先管理"
      primaryAction={{
        content: "新規登録",
        onAction: () => navigate("/admin/customers/new"),
      }}
    >
      <Card>
        <ResourceList
          resourceName={{ singular: "得意先", plural: "得意先" }}
          items={customers}
          loading={loading}
          renderItem={(customer) => {
            return (
              <ResourceItem
                id={customer.id}
                onClick={() => navigate(`/admin/customers/${customer.id}`)}
              >
                <InlineStack align="space-between" blockAlign="center" gap="400">
                  <div style={{flexGrow: 1}}>
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      {customer.company_name}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="p">
                      ログインID: {customer.login_id}
                    </Text>
                    {customer.address && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        住所: {customer.address}
                      </Text>
                    )}
                    {customer.phone && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        電話: {customer.phone}
                      </Text>
                    )}
                    {customer.email && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        メール: {customer.email}
                      </Text>
                    )}
                  </div>
                  <div>
                    <Badge
                      tone={customer.billing_type === "credit" ? "info" : "success"}
                    >
                      {customer.billing_type === "credit" ? "掛売" : "都度"}
                    </Badge>
                  </div>
                  <div>
                    <Button
                      tone="critical"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(customer.id);
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
