import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { customerAuth } from "../../../middleware/auth.ts";
import { notifyNewOrder as notifySlackNewOrder } from "../../../services/slack-service.ts";
import { notifyNewOrder as notifyLineNewOrder } from "../../../services/line-service.ts";

const createOrder = new Hono();

const orderItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
});

// 注文番号生成
function generateOrderNumber(shopId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${year}${month}${day}-${random}`;
}

// 注文作成
createOrder.post("/", customerAuth, async (c) => {
  try {
    const customerId = c.get("customerId");
    const shopId = c.get("shopId");
    const body = await c.req.json();
    const { items, notes } = createOrderSchema.parse(body);

    // 商品情報を取得
    const productIds = items.map((item) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("shop_id", shopId);

    if (productsError || !products || products.length !== productIds.length) {
      return c.json({ error: "商品情報の取得に失敗しました" }, 500);
    }

    // 注文明細を計算
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) {
        throw new Error(`商品ID ${item.product_id} が見つかりません`);
      }

      return {
        product_id: product.id,
        product_name: product.title,
        sku: product.sku,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal: product.price * item.quantity,
      };
    });

    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    // 注文番号を生成
    const orderNumber = generateOrderNumber(shopId);

    // トランザクション開始（Supabaseは自動的にトランザクションを処理）
    // 注文を作成
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        shop_id: shopId,
        customer_id: customerId,
        order_number: orderNumber,
        status: "new",
        total_amount: totalAmount,
        notes: notes || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      return c.json({ error: "注文の作成に失敗しました" }, 500);
    }

    // 注文明細を作成
    const orderItemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsWithOrderId);

    if (itemsError) {
      // 注文を削除（ロールバック）
      await supabase.from("orders").delete().eq("id", order.id);
      return c.json({ error: "注文明細の作成に失敗しました" }, 500);
    }

    // 注文詳細を取得
    const { data: orderWithItems } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        customers (company_name)
      `)
      .eq("id", order.id)
      .single();

    // 通知送信（非同期、エラーは無視）
    if (orderWithItems) {
      const customerName = (orderWithItems as any).customers?.company_name || "不明";
      notifySlackNewOrder(
        order.order_number,
        customerName,
        order.total_amount,
      ).catch(console.error);
      notifyLineNewOrder(
        order.order_number,
        customerName,
        order.total_amount,
      ).catch(console.error);
    }

    return c.json({
      message: "注文が確定しました",
      order: orderWithItems,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create order error:", error);
    return c.json({ error: "注文処理中にエラーが発生しました" }, 500);
  }
});

export default createOrder;

