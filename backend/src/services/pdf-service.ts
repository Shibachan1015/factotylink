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

// 帳票番号生成
export function generateDocumentNumber(
  type: "delivery_note" | "invoice" | "label",
  orderNumber: string,
): string {
  const prefix = {
    delivery_note: "DN",
    invoice: "INV",
    label: "LAB",
  }[type];

  return `${prefix}-${orderNumber}`;
}

