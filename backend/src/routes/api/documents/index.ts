import { Hono } from "hono";
import { supabase } from "../../../services/supabase-service.ts";
import {
  generateDeliveryNoteHTML,
  generateInvoiceHTML,
  generateLabelHTML,
  type DocumentData,
} from "../../../services/pdf-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const documents = new Hono();

// 帳票HTML表示（開発用）
documents.get("/:orderId/:type", adminAuth, async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const type = c.req.param("type") as "delivery_note" | "invoice" | "label";

    if (!["delivery_note", "invoice", "label"].includes(type)) {
      return c.json({ error: "無効な帳票タイプです" }, 400);
    }

    // 注文情報を取得
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        customers (*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      return c.json({ error: "注文が見つかりません" }, 404);
    }

    // ショップ情報を取得
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("id", orderData.shop_id)
      .single();

    if (shopError || !shop) {
      return c.json({ error: "ショップ情報が見つかりません" }, 404);
    }

    const documentData: DocumentData = {
      order: orderData as any,
      shop,
    };

    // HTML生成
    let html: string;
    switch (type) {
      case "delivery_note":
        html = generateDeliveryNoteHTML(documentData);
        break;
      case "invoice":
        html = generateInvoiceHTML(documentData);
        break;
      case "label":
        html = generateLabelHTML(documentData);
        break;
    }

    return c.html(html);
  } catch (error) {
    console.error("Generate document HTML error:", error);
    return c.json({ error: "帳票生成中にエラーが発生しました" }, 500);
  }
});

export default documents;

