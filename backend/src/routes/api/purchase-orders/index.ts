import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";
import {
  generatePurchaseOrderHTML,
  type PurchaseOrderData,
} from "../../../services/pdf-service.ts";

const purchaseOrders = new Hono();

// 発注書一覧取得
purchaseOrders.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const status = c.req.query("status");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  let query = supabase
    .from("purchase_orders")
    .select(`
      *,
      suppliers:supplier_id (id, name)
    `)
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Purchase orders fetch error:", error);
    return c.json({ error: "発注書の取得に失敗しました" }, 500);
  }

  return c.json({ purchase_orders: data || [] });
});

// 発注書詳細取得
purchaseOrders.get("/:id", adminAuth, async (c) => {
  const orderId = c.req.param("id");

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      suppliers:supplier_id (*)
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return c.json({ error: "発注書が見つかりません" }, 404);
  }

  // 発注明細を取得
  const { data: items } = await supabase
    .from("purchase_order_items")
    .select(`
      *,
      materials:material_id (id, name, code, unit)
    `)
    .eq("purchase_order_id", orderId);

  return c.json({
    purchase_order: order,
    items: items || [],
  });
});

// 発注書番号を生成
async function generatePurchaseOrderNumber(shopId: string): Promise<string> {
  const today = new Date();
  const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;

  const { data } = await supabase
    .from("purchase_orders")
    .select("order_number")
    .eq("shop_id", shopId)
    .like("order_number", `${prefix}%`)
    .order("order_number", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].order_number.slice(-4)) || 0;
    return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
  }

  return `${prefix}0001`;
}

// 発注書作成
const createPurchaseOrderSchema = z.object({
  shop_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    material_id: z.string().uuid(),
    quantity: z.number().positive(),
    unit_price: z.number().min(0),
  })).min(1),
});

purchaseOrders.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createPurchaseOrderSchema.parse(body);

    // 発注書番号を生成
    const orderNumber = await generatePurchaseOrderNumber(data.shop_id);

    // 合計金額を計算
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    // 発注書を作成
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .insert({
        shop_id: data.shop_id,
        supplier_id: data.supplier_id,
        order_number: orderNumber,
        status: "draft",
        total_amount: totalAmount,
        expected_delivery_date: data.expected_delivery_date || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Purchase order create error:", orderError);
      return c.json({ error: "発注書の作成に失敗しました" }, 500);
    }

    // 発注明細を作成
    const itemsToInsert = data.items.map((item) => ({
      purchase_order_id: order.id,
      material_id: item.material_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from("purchase_order_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Purchase order items create error:", itemsError);
      // ロールバック（発注書を削除）
      await supabase.from("purchase_orders").delete().eq("id", order.id);
      return c.json({ error: "発注明細の作成に失敗しました" }, 500);
    }

    return c.json({
      message: "発注書を作成しました",
      purchase_order: order,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create purchase order error:", error);
    return c.json({ error: "発注書作成中にエラーが発生しました" }, 500);
  }
});

// 発注書ステータス更新
const updateStatusSchema = z.object({
  status: z.enum(["draft", "ordered", "received", "cancelled"]),
});

purchaseOrders.patch("/:id/status", adminAuth, async (c) => {
  try {
    const orderId = c.req.param("id");
    const body = await c.req.json();
    const { status } = updateStatusSchema.parse(body);

    // 現在の発注書を取得
    const { data: currentOrder } = await supabase
      .from("purchase_orders")
      .select("status, shop_id")
      .eq("id", orderId)
      .single();

    if (!currentOrder) {
      return c.json({ error: "発注書が見つかりません" }, 404);
    }

    const updateData: Record<string, unknown> = { status };

    if (status === "ordered") {
      updateData.ordered_at = new Date().toISOString();
    } else if (status === "received") {
      updateData.received_at = new Date().toISOString();

      // 入庫処理：材料在庫を増やす
      const { data: items } = await supabase
        .from("purchase_order_items")
        .select("material_id, quantity, unit_price")
        .eq("purchase_order_id", orderId);

      if (items) {
        for (const item of items) {
          // 現在の在庫を取得
          const { data: material } = await supabase
            .from("materials")
            .select("current_stock")
            .eq("id", item.material_id)
            .single();

          const currentStock = material?.current_stock || 0;

          // 在庫を更新
          await supabase
            .from("materials")
            .update({
              current_stock: currentStock + item.quantity,
              unit_price: item.unit_price, // 最新の仕入れ単価を更新
            })
            .eq("id", item.material_id);

          // 入庫履歴を作成
          await supabase
            .from("material_transactions")
            .insert({
              material_id: item.material_id,
              type: "in",
              quantity: item.quantity,
              unit_price: item.unit_price,
              notes: `発注書入庫 (発注ID: ${orderId})`,
            });
        }
      }
    }

    const { data: order, error } = await supabase
      .from("purchase_orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Purchase order status update error:", error);
      return c.json({ error: "発注書ステータスの更新に失敗しました" }, 500);
    }

    return c.json({
      message: status === "received" ? "入庫処理が完了しました" : "ステータスを更新しました",
      purchase_order: order,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update purchase order status error:", error);
    return c.json({ error: "ステータス更新中にエラーが発生しました" }, 500);
  }
});

// 発注書PDF（HTML）生成
purchaseOrders.get("/:id/pdf", adminAuth, async (c) => {
  try {
    const orderId = c.req.param("id");

    // 発注書を取得
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        suppliers:supplier_id (*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return c.json({ error: "発注書が見つかりません" }, 404);
    }

    // 発注明細を取得
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select(`
        *,
        materials:material_id (id, name, code, unit)
      `)
      .eq("purchase_order_id", orderId);

    // ショップ情報を取得
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("id", order.shop_id)
      .single();

    if (shopError || !shop) {
      return c.json({ error: "ショップ情報が見つかりません" }, 404);
    }

    const documentData: PurchaseOrderData = {
      purchaseOrder: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        expected_delivery_date: order.expected_delivery_date,
        notes: order.notes,
        created_at: order.created_at,
      },
      supplier: {
        name: order.suppliers?.name || "",
        contact_name: order.suppliers?.contact_name || null,
        phone: order.suppliers?.phone || null,
        email: order.suppliers?.email || null,
        address: order.suppliers?.address || null,
      },
      items: (items || []).map((item: any) => ({
        material_name: item.materials?.name || "",
        material_code: item.materials?.code || null,
        unit: item.materials?.unit || "",
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
      shop,
    };

    const html = generatePurchaseOrderHTML(documentData);

    return c.json({
      html,
      order_number: order.order_number,
    });
  } catch (error) {
    console.error("Generate purchase order PDF error:", error);
    return c.json({ error: "発注書PDF生成中にエラーが発生しました" }, 500);
  }
});

// 発注書削除（下書きのみ）
purchaseOrders.delete("/:id", adminAuth, async (c) => {
  const orderId = c.req.param("id");

  // 下書きステータスか確認
  const { data: order } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order) {
    return c.json({ error: "発注書が見つかりません" }, 404);
  }

  if (order.status !== "draft") {
    return c.json({ error: "下書き以外の発注書は削除できません" }, 400);
  }

  // 明細を削除
  await supabase
    .from("purchase_order_items")
    .delete()
    .eq("purchase_order_id", orderId);

  // 発注書を削除
  const { error } = await supabase
    .from("purchase_orders")
    .delete()
    .eq("id", orderId);

  if (error) {
    console.error("Purchase order delete error:", error);
    return c.json({ error: "発注書の削除に失敗しました" }, 500);
  }

  return c.json({ message: "発注書を削除しました" });
});

export default purchaseOrders;
