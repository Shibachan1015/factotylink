import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { getShopifyService } from "../../../services/shopify-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const inventory = new Hono();

const updateInventorySchema = z.object({
  product_id: z.number(),
  shop_id: z.string().uuid(),
  quantity: z.number().int(),
});

// 在庫数更新
inventory.put("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { product_id, shop_id, quantity } = updateInventorySchema.parse(body);

    const shopifyService = await getShopifyService(shop_id);

    // 現在の在庫数を取得
    const currentQuantity = await shopifyService.getInventory(product_id);
    const adjustment = quantity - currentQuantity;

    // Shopify在庫を更新
    await shopifyService.updateInventory(product_id, adjustment);

    // Supabaseの商品キャッシュも更新
    await supabase
      .from("products")
      .update({ inventory_quantity: quantity })
      .eq("id", product_id)
      .eq("shop_id", shop_id);

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

