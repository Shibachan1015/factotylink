import { Hono } from "hono";
import { supabase } from "../../../services/supabase-service.ts";
import {
  generateDeliveryNoteHTML,
  generateInvoiceHTML,
  generateLabelHTML,
  generateManufacturingOrderHTML,
  type DocumentData,
  type ManufacturingOrderData,
} from "../../../services/pdf-service.ts";
import { adminAuth, customerAuth } from "../../../middleware/auth.ts";

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

// 得意先向け：自分の注文の請求書を表示
documents.get("/customer/:orderId/invoice", customerAuth, async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const customerId = c.get("customerId");

    // 注文情報を取得（得意先IDで検証）
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        customers (*)
      `)
      .eq("id", orderId)
      .eq("customer_id", customerId) // 自分の注文のみ
      .single();

    if (orderError || !orderData) {
      return c.json({ error: "注文が見つかりません" }, 404);
    }

    // 出荷済みの注文のみ請求書を表示
    if (orderData.status !== "shipped") {
      return c.json({ error: "請求書は出荷完了後にのみ閲覧できます" }, 400);
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

    const html = generateInvoiceHTML(documentData);
    return c.html(html);
  } catch (error) {
    console.error("Generate customer invoice error:", error);
    return c.json({ error: "請求書生成中にエラーが発生しました" }, 500);
  }
});

// 得意先向け：自分の注文の納品書を表示
documents.get("/customer/:orderId/delivery-note", customerAuth, async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const customerId = c.get("customerId");

    // 注文情報を取得（得意先IDで検証）
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        customers (*)
      `)
      .eq("id", orderId)
      .eq("customer_id", customerId) // 自分の注文のみ
      .single();

    if (orderError || !orderData) {
      return c.json({ error: "注文が見つかりません" }, 404);
    }

    // 出荷済みまたは製造完了の注文のみ納品書を表示
    if (!["completed", "shipped"].includes(orderData.status)) {
      return c.json({ error: "納品書は製造完了後にのみ閲覧できます" }, 400);
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

    const html = generateDeliveryNoteHTML(documentData);
    return c.html(html);
  } catch (error) {
    console.error("Generate customer delivery note error:", error);
    return c.json({ error: "納品書生成中にエラーが発生しました" }, 500);
  }
});

// 製造指示書を表示
documents.get("/manufacturing-order/:orderId", adminAuth, async (c) => {
  try {
    const orderId = c.req.param("orderId");

    // 注文情報を取得
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        ordered_at,
        requested_delivery_date,
        notes,
        shop_id,
        customers (company_name)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      return c.json({ error: "注文が見つかりません" }, 404);
    }

    // 注文明細を取得
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        product_id,
        product_name,
        sku,
        quantity,
        notes
      `)
      .eq("order_id", orderId);

    if (itemsError) {
      return c.json({ error: "注文明細の取得に失敗しました" }, 500);
    }

    // 各商品のBOM（部品表）を取得
    const productIds = (orderItems || []).map((item) => item.product_id);
    const { data: bomData } = productIds.length > 0
      ? await supabase
          .from("bom")
          .select(`
            product_id,
            quantity,
            materials (
              id,
              name,
              material_code,
              unit,
              current_stock
            )
          `)
          .in("product_id", productIds)
      : { data: [] };

    // ショップ設定を取得
    const { data: shopSettings } = await supabase
      .from("shop_settings")
      .select("*")
      .eq("shop_id", orderData.shop_id)
      .single();

    const shop = {
      company_name: shopSettings?.company_name || "店舗名未設定",
      address: shopSettings?.address || "",
      phone: shopSettings?.phone || "",
      invoice_number: shopSettings?.invoice_number || "",
    };

    // BOMデータを商品ごとにグループ化
    const bomByProduct: Record<number, ManufacturingOrderData["items"][0]["bom"]> = {};
    (bomData || []).forEach((bom) => {
      if (!bomByProduct[bom.product_id]) {
        bomByProduct[bom.product_id] = [];
      }
      const material = bom.materials as {
        id: string;
        name: string;
        material_code: string | null;
        unit: string;
        current_stock: number;
      };

      if (material) {
        const orderItem = orderItems?.find((i) => i.product_id === bom.product_id);
        const requiredTotal = bom.quantity * (orderItem?.quantity || 1);

        bomByProduct[bom.product_id].push({
          material_name: material.name,
          material_code: material.material_code,
          unit: material.unit,
          required_quantity: bom.quantity,
          current_stock: material.current_stock,
          is_sufficient: material.current_stock >= requiredTotal,
        });
      }
    });

    // 製造指示書データを構築
    const manufacturingData: ManufacturingOrderData = {
      shop: shop as ManufacturingOrderData["shop"],
      order: {
        id: orderData.id,
        order_number: orderData.order_number,
        ordered_at: orderData.ordered_at,
        requested_delivery_date: orderData.requested_delivery_date,
        notes: orderData.notes,
        customer: {
          company_name: (orderData.customers as { company_name: string })?.company_name || "不明",
        },
      },
      items: (orderItems || []).map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        notes: item.notes,
        bom: bomByProduct[item.product_id] || [],
      })),
    };

    const html = generateManufacturingOrderHTML(manufacturingData);
    return c.html(html);
  } catch (error) {
    console.error("Generate manufacturing order error:", error);
    return c.json({ error: "製造指示書生成中にエラーが発生しました" }, 500);
  }
});

export default documents;

