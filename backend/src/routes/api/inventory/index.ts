import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { getShopifyService } from "../../../services/shopify-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const inventory = new Hono();

// 商品在庫一覧取得
inventory.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const search = c.req.query("search");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  let query = supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .order("title");

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: "商品の取得に失敗しました" }, 500);
  }

  return c.json({ products: data || [] });
});

// 在庫数更新
const updateInventorySchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().min(0),
});

inventory.put("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { product_id, quantity } = updateInventorySchema.parse(body);

    // 商品情報を取得
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return c.json({ error: "商品が見つかりません" }, 404);
    }

    // Shopify在庫を更新
    try {
      const shopifyService = await getShopifyService(product.shop_id);
      const currentQuantity = await shopifyService.getInventory(product_id);
      const adjustment = quantity - currentQuantity;
      await shopifyService.updateInventory(product_id, adjustment);
    } catch (error) {
      console.error("Shopify inventory update error:", error);
      return c.json({ error: "Shopify在庫の更新に失敗しました" }, 500);
    }

    // Supabaseの商品キャッシュも更新
    const { error: updateError } = await supabase
      .from("products")
      .update({ inventory_quantity: quantity })
      .eq("id", product_id)
      .eq("shop_id", product.shop_id);

    if (updateError) {
      return c.json({ error: "在庫数の更新に失敗しました" }, 500);
    }

    return c.json({
      message: "在庫数を更新しました",
      product_id,
      quantity,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update inventory error:", error);
    return c.json({ error: "在庫数更新中にエラーが発生しました" }, 500);
  }
});

export default inventory;

