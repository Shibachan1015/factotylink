import { Hono } from "hono";
import { supabase } from "../../../services/supabase-service.ts";
import {
  generateDeliveryNoteHTML,
  generateInvoiceHTML,
  generateLabelHTML,
  generateManufacturingOrderHTML,
  generateMonthlyInvoiceHTML,
  type DocumentData,
  type ManufacturingOrderData,
  type MonthlyInvoiceData,
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

// 月次請求書一覧を取得（対象得意先リスト）
documents.get("/monthly-invoice/list", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const year = parseInt(c.req.query("year") || new Date().getFullYear().toString());
  const month = parseInt(c.req.query("month") || (new Date().getMonth() + 1).toString());

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 対象月の開始日と終了日
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // 対象月に出荷済みの注文がある得意先を取得
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      customer_id,
      total_amount,
      customers (
        id,
        company_name,
        billing_type
      )
    `)
    .eq("shop_id", shopId)
    .eq("status", "shipped")
    .gte("shipped_at", startDate.toISOString())
    .lte("shipped_at", endDate.toISOString());

  if (error) {
    console.error("Monthly invoice list error:", error);
    return c.json({ error: "対象得意先の取得に失敗しました" }, 500);
  }

  // 得意先ごとに集計
  const customerSummary: Record<string, {
    customer_id: string;
    company_name: string;
    billing_type: string;
    order_count: number;
    total_amount: number;
  }> = {};

  (orders || []).forEach((order) => {
    const customer = order.customers as {
      id: string;
      company_name: string;
      billing_type: string;
    };

    if (!customer) return;

    if (!customerSummary[customer.id]) {
      customerSummary[customer.id] = {
        customer_id: customer.id,
        company_name: customer.company_name,
        billing_type: customer.billing_type,
        order_count: 0,
        total_amount: 0,
      };
    }

    customerSummary[customer.id].order_count += 1;
    customerSummary[customer.id].total_amount += order.total_amount || 0;
  });

  const customers = Object.values(customerSummary).sort(
    (a, b) => b.total_amount - a.total_amount
  );

  return c.json({
    year,
    month,
    period_label: `${year}年${month}月`,
    customers,
    total_customers: customers.length,
    total_amount: customers.reduce((sum, c) => sum + c.total_amount, 0),
  });
});

// 月次請求書を生成（特定の得意先）
documents.get("/monthly-invoice/:customerId", adminAuth, async (c) => {
  try {
    const customerId = c.req.param("customerId");
    const shopId = c.req.query("shop_id");
    const year = parseInt(c.req.query("year") || new Date().getFullYear().toString());
    const month = parseInt(c.req.query("month") || (new Date().getMonth() + 1).toString());

    if (!shopId) {
      return c.json({ error: "shop_idパラメータが必要です" }, 400);
    }

    // 対象月の開始日と終了日
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 得意先情報を取得
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return c.json({ error: "得意先が見つかりません" }, 404);
    }

    // 対象月の出荷済み注文を取得
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        ordered_at,
        shipped_at,
        total_amount,
        order_items (
          product_name,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .eq("shop_id", shopId)
      .eq("customer_id", customerId)
      .eq("status", "shipped")
      .gte("shipped_at", startDate.toISOString())
      .lte("shipped_at", endDate.toISOString())
      .order("shipped_at", { ascending: true });

    if (ordersError) {
      console.error("Monthly invoice orders error:", ordersError);
      return c.json({ error: "注文の取得に失敗しました" }, 500);
    }

    if (!orders || orders.length === 0) {
      return c.json({ error: "対象期間に出荷済みの注文がありません" }, 404);
    }

    // ショップ設定を取得
    const { data: shopSettings } = await supabase
      .from("shop_settings")
      .select("*")
      .eq("shop_id", shopId)
      .single();

    const shop = {
      company_name: shopSettings?.company_name || "店舗名未設定",
      address: shopSettings?.address || "",
      phone: shopSettings?.phone || "",
      invoice_number: shopSettings?.invoice_number || "",
    };

    // 支払期限（翌月末）
    const dueDate = new Date(year, month, 0);
    dueDate.setMonth(dueDate.getMonth() + 1);

    // 月次請求書データを構築
    const invoiceData: MonthlyInvoiceData = {
      shop: shop as MonthlyInvoiceData["shop"],
      customer: {
        id: customer.id,
        company_name: customer.company_name,
        address: customer.address,
        phone: customer.phone,
        billing_type: customer.billing_type,
      },
      period: {
        year,
        month,
        label: `${year}年${month}月`,
      },
      orders: orders.map((order) => ({
        order_number: order.order_number,
        ordered_at: order.ordered_at,
        shipped_at: order.shipped_at!,
        total_amount: order.total_amount,
        items: (order.order_items as Array<{
          product_name: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        }>).map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
      })),
      summary: {
        total_amount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        order_count: orders.length,
      },
      dueDate: dueDate.toLocaleDateString("ja-JP"),
    };

    const html = generateMonthlyInvoiceHTML(invoiceData);
    return c.html(html);
  } catch (error) {
    console.error("Generate monthly invoice error:", error);
    return c.json({ error: "月次請求書生成中にエラーが発生しました" }, 500);
  }
});

export default documents;

