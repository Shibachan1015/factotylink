import { Hono } from "hono";
import { supabase } from "../../../services/supabase-service.ts";
import {
  generateInvoiceHTML,
  generateDocumentNumber,
  type DocumentData,
} from "../../../services/pdf-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const invoice = new Hono();

// 請求書生成
invoice.post("/:orderId", adminAuth, async (c) => {
  try {
    const orderId = c.req.param("orderId");

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
    const html = generateInvoiceHTML(documentData);

    // 帳票番号生成
    const documentNumber = generateDocumentNumber(
      "invoice",
      orderData.order_number,
    );

    // 帳票を保存
    const pdfUrl = `/api/documents/${orderId}/invoice.html`;

    // データベースに記録
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        order_id: orderId,
        type: "invoice",
        document_number: documentNumber,
        pdf_url: pdfUrl,
      })
      .select()
      .single();

    if (docError) {
      return c.json({ error: "帳票の保存に失敗しました" }, 500);
    }

    return c.json({
      message: "請求書を生成しました",
      document,
      html, // 実際の実装ではPDF URLを返す
    });
  } catch (error) {
    console.error("Generate invoice error:", error);
    return c.json({ error: "請求書生成中にエラーが発生しました" }, 500);
  }
});

export default invoice;

