import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { getShopifyService } from "../../../services/shopify-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const sync = new Hono();

const syncSchema = z.object({
  shop_id: z.string().uuid(),
});

// 商品データ同期（手動）
sync.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { shop_id } = syncSchema.parse(body);

    const shopifyService = await getShopifyService(shop_id);
    const syncedCount = await shopifyService.syncProducts(shop_id);

    return c.json({
      message: "商品データの同期が完了しました",
      synced_count: syncedCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Sync error:", error);
    return c.json({ error: "同期処理中にエラーが発生しました" }, 500);
  }
});

export default sync;

