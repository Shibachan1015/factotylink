import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { customerAuth } from "../../../middleware/auth.ts";

const products = new Hono();

// 商品一覧取得（得意先用）
products.get("/", customerAuth, async (c) => {
  const shopId = c.get("shopId");
  const customerId = c.get("customerId");
  const search = c.req.query("search");
  const sku = c.req.query("sku");

  let query = supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .order("title");

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (sku) {
    query = query.eq("sku", sku);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: "商品の取得に失敗しました" }, 500);
  }

  // 得意先別価格を取得
  const productIds = (data || []).map((p) => p.id);
  const { data: customerPrices } = productIds.length > 0
    ? await supabase
        .from("customer_prices")
        .select("product_id, price")
        .eq("customer_id", customerId)
        .in("product_id", productIds)
    : { data: [] };

  // 得意先別価格をマップに変換
  const customerPriceMap: Record<number, number> = {};
  (customerPrices || []).forEach((cp) => {
    customerPriceMap[cp.product_id] = cp.price;
  });

  // 商品に得意先別価格を適用
  const productsWithCustomerPrice = (data || []).map((product) => ({
    ...product,
    original_price: product.price,
    price: customerPriceMap[product.id] ?? product.price,
    has_custom_price: customerPriceMap[product.id] !== undefined,
  }));

  return c.json({ products: productsWithCustomerPrice });
});

// 商品詳細取得
products.get("/:id", customerAuth, async (c) => {
  const shopId = c.get("shopId");
  const customerId = c.get("customerId");
  const productId = parseInt(c.req.param("id"));

  if (isNaN(productId)) {
    return c.json({ error: "無効な商品IDです" }, 400);
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("shop_id", shopId)
    .single();

  if (error || !data) {
    return c.json({ error: "商品が見つかりません" }, 404);
  }

  // 得意先別価格を取得
  const { data: customerPrice } = await supabase
    .from("customer_prices")
    .select("price")
    .eq("customer_id", customerId)
    .eq("product_id", productId)
    .single();

  const productWithCustomerPrice = {
    ...data,
    original_price: data.price,
    price: customerPrice?.price ?? data.price,
    has_custom_price: customerPrice !== null,
  };

  return c.json({ product: productWithCustomerPrice });
});

export default products;

