-- BtoB受発注プラットフォーム データベーススキーマ

-- shops（ストア/管理者）
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  company_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  invoice_number TEXT,
  admin_login_id TEXT UNIQUE,
  admin_password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 既存テーブルに管理者認証カラムを追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS admin_login_id TEXT UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS admin_password_hash TEXT;

-- customers（得意先）
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  billing_type TEXT NOT NULL DEFAULT 'immediate' CHECK (billing_type IN ('immediate', 'credit')),
  login_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, login_id)
);

-- products（商品キャッシュ - Shopifyから同期）
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(10, 2) NOT NULL,
  inventory_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, id)
);

-- orders（注文）
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'manufacturing', 'completed', 'shipped')),
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  UNIQUE(shop_id, order_number)
);

-- order_items（注文明細）
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- materials（材料マスタ）
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  unit TEXT NOT NULL,
  current_stock DECIMAL(10, 3) DEFAULT 0,
  safety_stock DECIMAL(10, 3) DEFAULT 0,
  unit_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, code)
);

-- material_transactions（材料入出庫履歴）
CREATE TABLE IF NOT EXISTS material_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  quantity DECIMAL(10, 3) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- documents（発行済み帳票）
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('delivery_note', 'invoice', 'label')),
  document_number TEXT NOT NULL,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_login_id ON customers(login_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_materials_shop_id ON materials(shop_id);
CREATE INDEX IF NOT EXISTS idx_material_transactions_material_id ON material_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id);

