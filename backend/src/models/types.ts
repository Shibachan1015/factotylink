// データモデル型定義

export interface Shop {
  id: string;
  shop_domain: string;
  access_token: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  invoice_number: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  billing_type: "immediate" | "credit";
  login_id: string;
  password_hash: string;
  created_at: string;
}

export interface Product {
  id: number;
  shop_id: string;
  title: string;
  sku: string | null;
  price: number;
  inventory_quantity: number;
  image_url: string | null;
  synced_at: string;
}

export type OrderStatus = "new" | "manufacturing" | "completed" | "shipped";

export interface Order {
  id: string;
  shop_id: string;
  customer_id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  ordered_at: string;
  shipped_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Material {
  id: string;
  shop_id: string;
  name: string;
  code: string | null;
  unit: string;
  current_stock: number;
  safety_stock: number;
  unit_price: number | null;
  created_at: string;
}

export interface MaterialTransaction {
  id: string;
  material_id: string;
  type: "in" | "out";
  quantity: number;
  date: string;
  order_id: string | null;
  notes: string | null;
  created_at: string;
}

export type DocumentType = "delivery_note" | "invoice" | "label";

export interface Document {
  id: string;
  order_id: string;
  type: DocumentType;
  document_number: string;
  pdf_url: string | null;
  generated_at: string;
}

