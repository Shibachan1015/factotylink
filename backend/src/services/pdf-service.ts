// PDF生成サービス
// 注意: Deno環境ではPuppeteerの直接使用が難しいため、
// 別のPDF生成ライブラリを使用するか、外部サービスを利用する必要があります
// ここでは簡易実装として、HTMLテンプレートを返す機能を実装します

import { supabase } from "./supabase-service.ts";
import type { Order, OrderItem, Customer, Shop } from "../models/types.ts";

export interface DocumentData {
  order: Order & {
    order_items: OrderItem[];
    customers: Customer;
  };
  shop: Shop;
}

// 納品書HTML生成
export function generateDeliveryNoteHTML(data: DocumentData): string {
  const { order, shop } = data;
  const orderDate = new Date(order.ordered_at).toLocaleDateString("ja-JP");
  const deliveryDate = new Date().toLocaleDateString("ja-JP");

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>納品書 - ${order.order_number}</title>
  <style>
    body { font-family: "Hiragino Sans", "Meiryo", sans-serif; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .shop-info { text-align: right; }
    .title { font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .info-table td { padding: 8px; border: 1px solid #ddd; }
    .info-table td:first-child { background: #f5f5f5; width: 150px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    .items-table th { background: #f5f5f5; }
    .items-table .number { text-align: right; }
    .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
    .notes { margin-top: 30px; padding: 10px; border: 1px solid #ddd; }
    .stamp-area { margin-top: 50px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2>納品書</h2>
    </div>
    <div class="shop-info">
      <div>${shop.company_name}</div>
      <div>${shop.address || ""}</div>
      <div>${shop.phone || ""}</div>
      ${shop.invoice_number ? `<div>インボイス登録番号: ${shop.invoice_number}</div>` : ""}
    </div>
  </div>

  <table class="info-table">
    <tr>
      <td>得意先</td>
      <td>${order.customers.company_name}</td>
    </tr>
    <tr>
      <td>住所</td>
      <td>${order.customers.address || ""}</td>
    </tr>
    <tr>
      <td>電話番号</td>
      <td>${order.customers.phone || ""}</td>
    </tr>
    <tr>
      <td>注文番号</td>
      <td>${order.order_number}</td>
    </tr>
    <tr>
      <td>注文日</td>
      <td>${orderDate}</td>
    </tr>
    <tr>
      <td>納品日</td>
      <td>${deliveryDate}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th>商品名</th>
        <th>SKU</th>
        <th class="number">数量</th>
        <th class="number">単価</th>
        <th class="number">小計</th>
      </tr>
    </thead>
    <tbody>
      ${order.order_items.map((item) => `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.sku || "-"}</td>
          <td class="number">${item.quantity}</td>
          <td class="number">¥${item.unit_price.toLocaleString()}</td>
          <td class="number">¥${item.subtotal.toLocaleString()}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="total">
    合計金額: ¥${order.total_amount.toLocaleString()}
  </div>

  ${order.notes ? `<div class="notes">備考: ${order.notes}</div>` : ""}

  <div class="stamp-area">
    <div>印</div>
  </div>
</body>
</html>
  `.trim();
}

// 請求書HTML生成
export function generateInvoiceHTML(data: DocumentData): string {
  const { order, shop } = data;
  const orderDate = new Date(order.ordered_at).toLocaleDateString("ja-JP");
  const invoiceDate = new Date().toLocaleDateString("ja-JP");
  const billingType = order.customers.billing_type === "credit" ? "掛売" : "都度";

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>請求書 - ${order.order_number}</title>
  <style>
    body { font-family: "Hiragino Sans", "Meiryo", sans-serif; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .shop-info { text-align: right; }
    .title { font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .info-table td { padding: 8px; border: 1px solid #ddd; }
    .info-table td:first-child { background: #f5f5f5; width: 150px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    .items-table th { background: #f5f5f5; }
    .items-table .number { text-align: right; }
    .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
    .payment-info { margin-top: 30px; padding: 10px; border: 1px solid #ddd; }
    .stamp-area { margin-top: 50px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2>請求書</h2>
    </div>
    <div class="shop-info">
      <div>${shop.company_name}</div>
      <div>${shop.address || ""}</div>
      <div>${shop.phone || ""}</div>
      ${shop.invoice_number ? `<div>インボイス登録番号: ${shop.invoice_number}</div>` : ""}
    </div>
  </div>

  <table class="info-table">
    <tr>
      <td>お客様</td>
      <td>${order.customers.company_name}</td>
    </tr>
    <tr>
      <td>住所</td>
      <td>${order.customers.address || ""}</td>
    </tr>
    <tr>
      <td>電話番号</td>
      <td>${order.customers.phone || ""}</td>
    </tr>
    <tr>
      <td>注文番号</td>
      <td>${order.order_number}</td>
    </tr>
    <tr>
      <td>請求日</td>
      <td>${invoiceDate}</td>
    </tr>
    <tr>
      <td>支払条件</td>
      <td>${billingType}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th>商品名</th>
        <th>SKU</th>
        <th class="number">数量</th>
        <th class="number">単価</th>
        <th class="number">小計</th>
      </tr>
    </thead>
    <tbody>
      ${order.order_items.map((item) => `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.sku || "-"}</td>
          <td class="number">${item.quantity}</td>
          <td class="number">¥${item.unit_price.toLocaleString()}</td>
          <td class="number">¥${item.subtotal.toLocaleString()}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="total">
    合計金額: ¥${order.total_amount.toLocaleString()}
  </div>

  <div class="payment-info">
    <h3>お振込先</h3>
    <p>振込先情報をここに記載してください</p>
  </div>

  ${order.notes ? `<div class="notes">備考: ${order.notes}</div>` : ""}

  <div class="stamp-area">
    <div>印</div>
  </div>
</body>
</html>
  `.trim();
}

// ラベルHTML生成（A4用紙22面シール）
export function generateLabelHTML(data: DocumentData): string {
  const { order } = data;

  // A4用紙に22面（5列×5行、上下左右にマージン）のシールを配置
  const labels = order.order_items.flatMap((item) =>
    Array(item.quantity).fill(item),
  );

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ラベル - ${order.order_number}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: "Hiragino Sans", "Meiryo", sans-serif; margin: 0; padding: 0; }
    .label-container { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2mm; }
    .label { border: 1px solid #000; padding: 5mm; text-align: center; page-break-inside: avoid; }
    .label img { max-width: 100%; height: auto; }
    .label .product-name { font-weight: bold; margin: 2mm 0; }
    .label .sku { font-size: 10px; margin: 1mm 0; }
    .label .barcode { margin: 2mm 0; }
  </style>
</head>
<body>
  <div class="label-container">
    ${labels.map((item) => `
      <div class="label">
        <div class="product-name">${item.product_name}</div>
        <div class="sku">SKU: ${item.sku || "-"}</div>
        <div class="barcode">[バーコード画像]</div>
      </div>
    `).join("")}
  </div>
</body>
</html>
  `.trim();
}

// 発注書データ型
export interface PurchaseOrderData {
  purchaseOrder: {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    expected_delivery_date: string | null;
    notes: string | null;
    created_at: string;
  };
  supplier: {
    name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  items: Array<{
    material_name: string;
    material_code: string | null;
    unit: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  shop: Shop;
}

// 発注書HTML生成
export function generatePurchaseOrderHTML(data: PurchaseOrderData): string {
  const { purchaseOrder, supplier, items, shop } = data;
  const orderDate = new Date(purchaseOrder.created_at).toLocaleDateString("ja-JP");
  const deliveryDate = purchaseOrder.expected_delivery_date
    ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString("ja-JP")
    : "未定";

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>発注書 - ${purchaseOrder.order_number}</title>
  <style>
    body { font-family: "Hiragino Sans", "Meiryo", sans-serif; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .shop-info { text-align: right; }
    .supplier-box { border: 2px solid #333; padding: 15px; margin-bottom: 20px; }
    .supplier-box h3 { margin: 0 0 10px 0; }
    .title { font-size: 28px; font-weight: bold; text-align: center; margin: 30px 0; border-bottom: 3px double #333; padding-bottom: 10px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .info-table td { padding: 8px; border: 1px solid #ddd; }
    .info-table td:first-child { background: #f5f5f5; width: 150px; font-weight: bold; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { padding: 10px; border: 1px solid #333; text-align: left; }
    .items-table th { background: #e0e0e0; font-weight: bold; }
    .items-table .number { text-align: right; }
    .total-section { text-align: right; margin-top: 20px; }
    .total { font-size: 20px; font-weight: bold; border: 2px solid #333; padding: 10px 20px; display: inline-block; }
    .notes { margin-top: 30px; padding: 10px; border: 1px solid #ddd; background: #fafafa; }
    .stamp-area { margin-top: 50px; display: flex; justify-content: flex-end; gap: 50px; }
    .stamp-box { width: 80px; height: 80px; border: 1px solid #333; text-align: center; line-height: 80px; }
    .footer { margin-top: 50px; font-size: 12px; color: #666; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="supplier-box">
      <h3>宛先</h3>
      <div style="font-size: 18px; font-weight: bold;">${supplier.name} 御中</div>
      ${supplier.contact_name ? `<div>担当: ${supplier.contact_name} 様</div>` : ""}
      ${supplier.address ? `<div>${supplier.address}</div>` : ""}
      ${supplier.phone ? `<div>TEL: ${supplier.phone}</div>` : ""}
    </div>
    <div class="shop-info">
      <div style="font-weight: bold; font-size: 16px;">${shop.company_name}</div>
      <div>${shop.address || ""}</div>
      <div>TEL: ${shop.phone || ""}</div>
      ${shop.invoice_number ? `<div>登録番号: ${shop.invoice_number}</div>` : ""}
    </div>
  </div>

  <h1 class="title">発 注 書</h1>

  <table class="info-table">
    <tr>
      <td>発注番号</td>
      <td>${purchaseOrder.order_number}</td>
      <td>発注日</td>
      <td>${orderDate}</td>
    </tr>
    <tr>
      <td>納品希望日</td>
      <td colspan="3">${deliveryDate}</td>
    </tr>
  </table>

  <p>下記の通り発注いたします。</p>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 40px;">No.</th>
        <th>品名</th>
        <th style="width: 100px;">品番</th>
        <th style="width: 60px;">単位</th>
        <th style="width: 80px;" class="number">数量</th>
        <th style="width: 100px;" class="number">単価</th>
        <th style="width: 120px;" class="number">金額</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.material_name}</td>
          <td>${item.material_code || "-"}</td>
          <td>${item.unit}</td>
          <td class="number">${item.quantity.toLocaleString()}</td>
          <td class="number">¥${item.unit_price.toLocaleString()}</td>
          <td class="number">¥${item.subtotal.toLocaleString()}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total">
      合計金額: ¥${purchaseOrder.total_amount.toLocaleString()}
    </div>
  </div>

  ${purchaseOrder.notes ? `
    <div class="notes">
      <strong>備考:</strong><br>
      ${purchaseOrder.notes}
    </div>
  ` : ""}

  <div class="stamp-area">
    <div>
      <div style="margin-bottom: 5px; text-align: center;">承認</div>
      <div class="stamp-box"></div>
    </div>
    <div>
      <div style="margin-bottom: 5px; text-align: center;">確認</div>
      <div class="stamp-box"></div>
    </div>
    <div>
      <div style="margin-bottom: 5px; text-align: center;">担当</div>
      <div class="stamp-box"></div>
    </div>
  </div>

  <div class="footer">
    <p>※ 本発注書の内容にご不明な点がございましたら、担当者までご連絡ください。</p>
  </div>
</body>
</html>
  `.trim();
}

// 帳票番号生成
export function generateDocumentNumber(
  type: "delivery_note" | "invoice" | "label" | "purchase_order",
  orderNumber: string,
): string {
  const prefix = {
    delivery_note: "DN",
    invoice: "INV",
    label: "LAB",
    purchase_order: "PO",
  }[type];

  return `${prefix}-${orderNumber}`;
}

