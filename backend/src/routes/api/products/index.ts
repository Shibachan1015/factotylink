import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { customerAuth } from "../../../middleware/auth.ts";

const products = new Hono();

// 商品一覧取得（得意先用）
products.get("/", customerAuth, async (c) => {
  const shopId = c.get("shopId");
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

  return c.json({ products: data || [] });
});

// 商品詳細取得
products.get("/:id", customerAuth, async (c) => {
  const shopId = c.get("shopId");
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

  return c.json({ product: data });
});

export default products;

