import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { getShopifyService } from "../../../services/shopify-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";
import { notifyOrderStatusChange } from "../../../services/line-service.ts";

const adminOrders = new Hono();

// 注文一覧取得（管理者用）
adminOrders.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const status = c.req.query("status");
  const customerId = c.req.query("customer_id");
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  let query = supabase
    .from("orders")
    .select(`
      *,
      order_items (*),
      customers (id, company_name, login_id)
    `)
    .order("ordered_at", { ascending: false });

  if (shopId) {
    query = query.eq("shop_id", shopId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  if (startDate) {
    query = query.gte("ordered_at", startDate);
  }

  if (endDate) {
    query = query.lte("ordered_at", endDate);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: "注文の取得に失敗しました" }, 500);
  }

  return c.json({ orders: data || [] });
});

// 注文詳細取得（管理者用）
adminOrders.get("/:id", adminAuth, async (c) => {
  const orderId = c.req.param("id");

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (*),
      customers (*)
    `)
    .eq("id", orderId)
    .single();

  if (error || !data) {
    return c.json({ error: "注文が見つかりません" }, 404);
  }

  return c.json({ order: data });
});

// ステータス変更
const updateStatusSchema = z.object({
  status: z.enum(["new", "manufacturing", "completed", "shipped"]),
});

adminOrders.patch("/:id/status", adminAuth, async (c) => {
  try {
    const orderId = c.req.param("id");
    const body = await c.req.json();
    const { status } = updateStatusSchema.parse(body);

    // 現在の注文情報を取得
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return c.json({ error: "注文が見つかりません" }, 404);
    }

    // ステータスを更新
    const updateData: { status: string; shipped_at?: string } = { status };

    if (status === "shipped" && !order.shipped_at) {
      updateData.shipped_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      return c.json({ error: "ステータスの更新に失敗しました" }, 500);
    }

    // 在庫連携処理
    if (status === "completed") {
      // 製造完了時: Shopify在庫+
      try {
        const shopifyService = await getShopifyService(order.shop_id);
        for (const item of order.order_items) {
          const currentQuantity = await shopifyService.getInventory(
            item.product_id,
          );
          await shopifyService.updateInventory(
            item.product_id,
            item.quantity,
          );

          // Supabaseの商品キャッシュも更新
          await supabase
            .from("products")
            .update({
              inventory_quantity: currentQuantity + item.quantity,
            })
            .eq("id", item.product_id)
            .eq("shop_id", order.shop_id);
        }
      } catch (error) {
        console.error("Inventory update error:", error);
        // エラーが発生しても注文ステータスは更新済み
      }
    } else if (status === "shipped") {
      // 出荷時: Shopify在庫-
      try {
        const shopifyService = await getShopifyService(order.shop_id);
        for (const item of order.order_items) {
          const currentQuantity = await shopifyService.getInventory(
            item.product_id,
          );
          await shopifyService.updateInventory(
            item.product_id,
            -item.quantity,
          );

          // Supabaseの商品キャッシュも更新
          await supabase
            .from("products")
            .update({
              inventory_quantity: Math.max(0, currentQuantity - item.quantity),
            })
            .eq("id", item.product_id)
            .eq("shop_id", order.shop_id);
        }
      } catch (error) {
        console.error("Inventory update error:", error);
        // エラーが発生しても注文ステータスは更新済み
      }
    }

    // ステータス変更通知（非同期、エラーは無視）
    if (order.customers) {
      const customerName = (order.customers as any).company_name || "不明";
      notifyOrderStatusChange(
        order.order_number,
        status,
        customerName,
      ).catch(console.error);
    }

    return c.json({
      message: "ステータスを更新しました",
      order_id: orderId,
      status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update status error:", error);
    return c.json({ error: "ステータス更新中にエラーが発生しました" }, 500);
  }
});

export default adminOrders;

