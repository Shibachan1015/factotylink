-- Row Level Security (RLS) ポリシー

-- shopsテーブル: サービスロールのみアクセス可能
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all shops" ON shops
  FOR ALL USING (true);

-- customersテーブル: サービスロールのみアクセス可能
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all customers" ON customers
  FOR ALL USING (true);

-- productsテーブル: サービスロールのみアクセス可能
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all products" ON products
  FOR ALL USING (true);

-- ordersテーブル: サービスロールのみアクセス可能
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all orders" ON orders
  FOR ALL USING (true);

-- order_itemsテーブル: サービスロールのみアクセス可能
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all order_items" ON order_items
  FOR ALL USING (true);

-- materialsテーブル: サービスロールのみアクセス可能
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all materials" ON materials
  FOR ALL USING (true);

-- material_transactionsテーブル: サービスロールのみアクセス可能
ALTER TABLE material_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all material_transactions" ON material_transactions
  FOR ALL USING (true);

-- documentsテーブル: サービスロールのみアクセス可能
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all documents" ON documents
  FOR ALL USING (true);

