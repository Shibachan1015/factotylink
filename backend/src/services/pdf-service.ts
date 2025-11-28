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

// 製造指示書データ型
export interface ManufacturingOrderData {
  shop: Shop;
  order: {
    id: string;
    order_number: string;
    ordered_at: string;
    requested_delivery_date: string | null;
    notes: string | null;
    customer: {
      company_name: string;
    };
  };
  items: Array<{
    product_id: number;
    product_name: string;
    sku: string | null;
    quantity: number;
    notes: string | null;
    bom: Array<{
      material_name: string;
      material_code: string | null;
      unit: string;
      required_quantity: number;
      current_stock: number;
      is_sufficient: boolean;
    }>;
  }>;
}

// 製造指示書HTML生成
export function generateManufacturingOrderHTML(data: ManufacturingOrderData): string {
  const { shop, order, items } = data;
  const orderDate = new Date(order.ordered_at).toLocaleDateString("ja-JP");
  const deliveryDate = order.requested_delivery_date
    ? new Date(order.requested_delivery_date).toLocaleDateString("ja-JP")
    : "未定";
  const printDate = new Date().toLocaleDateString("ja-JP");

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>製造指示書 - ${order.order_number}</title>
  <style>
    body { font-family: "Hiragino Sans", "Meiryo", sans-serif; padding: 20px; color: #333; font-size: 12px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .shop-info { text-align: right; font-size: 11px; }
    .title { font-size: 22px; font-weight: bold; text-align: center; margin: 15px 0; }

    .order-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .info-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
    .info-box h3 { margin: 0 0 8px 0; font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .info-label { color: #666; }
    .info-value { font-weight: bold; }

    .product-section { margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #333; }
    .product-header { background: #f0f0f0; padding: 10px; border-bottom: 1px solid #333; }
    .product-name { font-size: 16px; font-weight: bold; }
    .product-meta { color: #666; margin-top: 5px; }
    .product-body { padding: 10px; }

    .bom-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .bom-table th, .bom-table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
    .bom-table th { background: #f5f5f5; font-weight: bold; }
    .bom-table .number { text-align: right; }
    .bom-table .status-ok { color: #28a745; }
    .bom-table .status-ng { color: #dc3545; font-weight: bold; }

    .checkbox-area { margin-top: 15px; }
    .checkbox-row { display: flex; align-items: center; margin: 8px 0; }
    .checkbox { width: 18px; height: 18px; border: 1px solid #333; margin-right: 10px; display: inline-block; }

    .notes-box { background: #fffde7; border: 1px solid #ffd600; padding: 10px; margin-top: 15px; border-radius: 4px; }
    .notes-box h4 { margin: 0 0 5px 0; color: #f57f17; }

    .stamp-area { margin-top: 30px; display: flex; justify-content: flex-end; gap: 30px; }
    .stamp-box { text-align: center; }
    .stamp-box .label { font-size: 10px; margin-bottom: 3px; }
    .stamp-box .box { width: 60px; height: 60px; border: 1px solid #333; }

    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }

    @media print {
      body { padding: 10px; }
      .product-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">製 造 指 示 書</div>
    </div>
    <div class="shop-info">
      <div style="font-weight: bold;">${shop.company_name}</div>
      <div>印刷日: ${printDate}</div>
    </div>
  </div>

  <div class="order-info">
    <div class="info-box">
      <h3>注文情報</h3>
      <div class="info-row">
        <span class="info-label">注文番号:</span>
        <span class="info-value">${order.order_number}</span>
      </div>
      <div class="info-row">
        <span class="info-label">受注日:</span>
        <span class="info-value">${orderDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">希望納期:</span>
        <span class="info-value">${deliveryDate}</span>
      </div>
    </div>
    <div class="info-box">
      <h3>得意先情報</h3>
      <div class="info-row">
        <span class="info-label">得意先名:</span>
        <span class="info-value">${order.customer.company_name}</span>
      </div>
    </div>
  </div>

  ${order.notes ? `
    <div class="notes-box">
      <h4>注文備考</h4>
      <div>${order.notes}</div>
    </div>
  ` : ""}

  ${items.map((item, index) => `
    <div class="product-section">
      <div class="product-header">
        <div class="product-name">${index + 1}. ${item.product_name}</div>
        <div class="product-meta">
          SKU: ${item.sku || "-"} | 製造数量: <strong>${item.quantity}</strong>
        </div>
      </div>
      <div class="product-body">
        ${item.bom.length > 0 ? `
          <table class="bom-table">
            <thead>
              <tr>
                <th>材料名</th>
                <th>品番</th>
                <th class="number">単位</th>
                <th class="number">必要数量</th>
                <th class="number">現在在庫</th>
                <th>在庫状況</th>
              </tr>
            </thead>
            <tbody>
              ${item.bom.map((bom) => `
                <tr>
                  <td>${bom.material_name}</td>
                  <td>${bom.material_code || "-"}</td>
                  <td class="number">${bom.unit}</td>
                  <td class="number">${(bom.required_quantity * item.quantity).toLocaleString()}</td>
                  <td class="number">${bom.current_stock.toLocaleString()}</td>
                  <td class="${bom.is_sufficient ? 'status-ok' : 'status-ng'}">
                    ${bom.is_sufficient ? "OK" : "不足"}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `
          <p style="color: #999;">BOM（部品表）が登録されていません</p>
        `}

        <div class="checkbox-area">
          <div class="checkbox-row">
            <span class="checkbox"></span>
            <span>材料準備完了</span>
          </div>
          <div class="checkbox-row">
            <span class="checkbox"></span>
            <span>製造開始</span>
          </div>
          <div class="checkbox-row">
            <span class="checkbox"></span>
            <span>品質検査完了</span>
          </div>
          <div class="checkbox-row">
            <span class="checkbox"></span>
            <span>製造完了</span>
          </div>
        </div>

        ${item.notes ? `
          <div class="notes-box" style="margin-top: 10px;">
            <h4>製造備考</h4>
            <div>${item.notes}</div>
          </div>
        ` : ""}
      </div>
    </div>
  `).join("")}

  <div class="stamp-area">
    <div class="stamp-box">
      <div class="label">製造責任者</div>
      <div class="box"></div>
    </div>
    <div class="stamp-box">
      <div class="label">品質管理</div>
      <div class="box"></div>
    </div>
    <div class="stamp-box">
      <div class="label">担当者</div>
      <div class="box"></div>
    </div>
  </div>

  <div class="footer">
    <p>この製造指示書は ${shop.company_name} の内部文書です。</p>
  </div>
</body>
</html>
  `.trim();
}

// 売上レポートデータ型
export interface SalesReportData {
  shop: Shop;
  period: {
    start: string;
    end: string;
    label: string; // "2024年11月" など
  };
  summary: {
    total_sales: number;
    total_cost: number;
    gross_profit: number;
    gross_profit_rate: number;
    order_count: number;
  };
  salesByPeriod: Array<{
    period: string;
    total_sales: number;
    total_cost: number;
    gross_profit: number;
    order_count: number;
  }>;
  productStats: Array<{
    product_name: string;
    total_quantity: number;
    total_sales: number;
    total_cost: number;
    gross_profit: number;
    gross_profit_rate: number;
  }>;
  customerStats: Array<{
    company_name: string;
    total_orders: number;
    total_sales: number;
    gross_profit: number;
    gross_profit_rate: number;
  }>;
}

// 売上レポートHTML生成
export function generateSalesReportHTML(data: SalesReportData): string {
  const { shop, period, summary, salesByPeriod, productStats, customerStats } = data;
  const generatedDate = new Date().toLocaleDateString("ja-JP");

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatRate = (rate: number) => `${rate.toFixed(1)}%`;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>売上レポート - ${period.label}</title>
  <style>
    body { font-family: "Hiragino Sans", "Meiryo", sans-serif; padding: 20px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .shop-info { text-align: right; font-size: 12px; }
    .title { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0 30px; }
    .period-info { text-align: center; font-size: 18px; color: #666; margin-bottom: 30px; }

    .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 40px; }
    .summary-card { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; text-align: center; }
    .summary-card .label { font-size: 12px; color: #666; margin-bottom: 5px; }
    .summary-card .value { font-size: 20px; font-weight: bold; }
    .summary-card .value.positive { color: #28a745; }
    .summary-card .value.negative { color: #dc3545; }

    .section { margin-bottom: 40px; page-break-inside: avoid; }
    .section-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #007bff; padding-bottom: 8px; margin-bottom: 15px; }

    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
    th { background: #f5f5f5; font-weight: bold; }
    .number { text-align: right; }
    .rank { text-align: center; width: 40px; }

    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }

    @media print {
      body { padding: 0; }
      .summary-cards { grid-template-columns: repeat(5, 1fr); }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin: 0;">売上レポート</h2>
      <div style="color: #666; font-size: 12px;">Sales Report</div>
    </div>
    <div class="shop-info">
      <div style="font-weight: bold;">${shop.company_name}</div>
      <div>作成日: ${generatedDate}</div>
    </div>
  </div>

  <div class="period-info">
    対象期間: ${period.start} ～ ${period.end}
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="label">総売上</div>
      <div class="value">${formatCurrency(summary.total_sales)}</div>
    </div>
    <div class="summary-card">
      <div class="label">総原価</div>
      <div class="value">${formatCurrency(summary.total_cost)}</div>
    </div>
    <div class="summary-card">
      <div class="label">粗利益</div>
      <div class="value ${summary.gross_profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(summary.gross_profit)}</div>
    </div>
    <div class="summary-card">
      <div class="label">粗利率</div>
      <div class="value ${summary.gross_profit_rate >= 30 ? 'positive' : summary.gross_profit_rate < 20 ? 'negative' : ''}">${formatRate(summary.gross_profit_rate)}</div>
    </div>
    <div class="summary-card">
      <div class="label">受注件数</div>
      <div class="value">${summary.order_count}件</div>
    </div>
  </div>

  ${salesByPeriod.length > 0 ? `
  <div class="section">
    <h3 class="section-title">期間別売上推移</h3>
    <table>
      <thead>
        <tr>
          <th>期間</th>
          <th class="number">売上</th>
          <th class="number">原価</th>
          <th class="number">粗利益</th>
          <th class="number">件数</th>
        </tr>
      </thead>
      <tbody>
        ${salesByPeriod.slice(0, 12).map((item) => `
          <tr>
            <td>${item.period}</td>
            <td class="number">${formatCurrency(item.total_sales)}</td>
            <td class="number">${formatCurrency(item.total_cost)}</td>
            <td class="number">${formatCurrency(item.gross_profit)}</td>
            <td class="number">${item.order_count}件</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${productStats.length > 0 ? `
  <div class="section">
    <h3 class="section-title">商品別売上ランキング（上位20）</h3>
    <table>
      <thead>
        <tr>
          <th class="rank">順位</th>
          <th>商品名</th>
          <th class="number">販売数</th>
          <th class="number">売上</th>
          <th class="number">粗利益</th>
          <th class="number">粗利率</th>
        </tr>
      </thead>
      <tbody>
        ${productStats.slice(0, 20).map((item, index) => `
          <tr>
            <td class="rank">${index + 1}</td>
            <td>${item.product_name}</td>
            <td class="number">${item.total_quantity.toLocaleString()}</td>
            <td class="number">${formatCurrency(item.total_sales)}</td>
            <td class="number">${formatCurrency(item.gross_profit)}</td>
            <td class="number">${formatRate(item.gross_profit_rate)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${customerStats.length > 0 ? `
  <div class="section">
    <h3 class="section-title">得意先別売上ランキング（上位20）</h3>
    <table>
      <thead>
        <tr>
          <th class="rank">順位</th>
          <th>得意先名</th>
          <th class="number">受注数</th>
          <th class="number">売上</th>
          <th class="number">粗利益</th>
          <th class="number">粗利率</th>
        </tr>
      </thead>
      <tbody>
        ${customerStats.slice(0, 20).map((item, index) => `
          <tr>
            <td class="rank">${index + 1}</td>
            <td>${item.company_name}</td>
            <td class="number">${item.total_orders}件</td>
            <td class="number">${formatCurrency(item.total_sales)}</td>
            <td class="number">${formatCurrency(item.gross_profit)}</td>
            <td class="number">${formatRate(item.gross_profit_rate)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    <p>このレポートは ${shop.company_name} の売上データに基づいて自動生成されました。</p>
    <p>Generated by FactoryLink BtoB Platform</p>
  </div>
</body>
</html>
  `.trim();
}

// 月次請求書データ型
export interface MonthlyInvoiceData {
  shop: Shop;
  customer: {
    id: string;
    company_name: string;
    address: string | null;
    phone: string | null;
    billing_type: string;
  };
  period: {
    year: number;
    month: number;
    label: string;
  };
  orders: Array<{
    order_number: string;
    ordered_at: string;
    shipped_at: string;
    total_amount: number;
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  }>;
  summary: {
    total_amount: number;
    order_count: number;
  };
  dueDate: string;
}

// 月次請求書HTML生成
export function generateMonthlyInvoiceHTML(data: MonthlyInvoiceData): string {
  const { shop, customer, period, orders, summary, dueDate } = data;
  const invoiceDate = new Date().toLocaleDateString("ja-JP");
  const invoiceNumber = `MI-${period.year}${String(period.month).padStart(2, "0")}-${customer.id.slice(0, 8).toUpperCase()}`;

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>月次請求書 - ${period.label} - ${customer.company_name}</title>
  <style>
    body { font-family: "Hiragino Sans", "Meiryo", sans-serif; padding: 20px; color: #333; font-size: 12px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .shop-info { text-align: right; font-size: 11px; }
    .title { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; border-bottom: 3px double #333; padding-bottom: 10px; }

    .customer-box { border: 2px solid #333; padding: 15px; margin-bottom: 20px; max-width: 350px; }
    .customer-box .name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }

    .summary-box { background: #f8f9fa; border: 1px solid #ddd; padding: 20px; margin-bottom: 30px; }
    .summary-box .total { font-size: 28px; font-weight: bold; text-align: center; margin: 10px 0; }
    .summary-box .details { display: flex; justify-content: space-between; margin-top: 15px; }

    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 8px; border: 1px solid #ddd; }
    .info-table td:first-child { background: #f5f5f5; width: 150px; font-weight: bold; }

    .order-section { margin-bottom: 20px; page-break-inside: avoid; }
    .order-header { background: #e8e8e8; padding: 8px; font-weight: bold; border: 1px solid #ddd; border-bottom: none; }

    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th, .items-table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
    .items-table th { background: #f5f5f5; font-weight: bold; }
    .items-table .number { text-align: right; }
    .items-table .subtotal { background: #fafafa; }

    .total-section { margin-top: 30px; text-align: right; }
    .total-box { display: inline-block; border: 2px solid #333; padding: 15px 30px; }
    .total-label { font-size: 14px; margin-bottom: 5px; }
    .total-amount { font-size: 24px; font-weight: bold; }

    .payment-info { margin-top: 30px; padding: 15px; border: 1px solid #ddd; background: #fffde7; }
    .payment-info h3 { margin: 0 0 10px 0; font-size: 14px; }

    .stamp-area { margin-top: 40px; display: flex; justify-content: flex-end; gap: 30px; }
    .stamp-box { text-align: center; }
    .stamp-box .label { font-size: 10px; margin-bottom: 3px; }
    .stamp-box .box { width: 60px; height: 60px; border: 1px solid #333; }

    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }

    @media print {
      body { padding: 10px; }
      .order-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="customer-box">
      <div class="name">${customer.company_name} 御中</div>
      ${customer.address ? `<div>${customer.address}</div>` : ""}
      ${customer.phone ? `<div>TEL: ${customer.phone}</div>` : ""}
    </div>
    <div class="shop-info">
      <div style="font-weight: bold; font-size: 14px;">${shop.company_name}</div>
      <div>${shop.address || ""}</div>
      <div>TEL: ${shop.phone || ""}</div>
      ${shop.invoice_number ? `<div>インボイス登録番号: ${shop.invoice_number}</div>` : ""}
    </div>
  </div>

  <h1 class="title">月 次 請 求 書</h1>

  <table class="info-table">
    <tr>
      <td>請求書番号</td>
      <td>${invoiceNumber}</td>
      <td>発行日</td>
      <td>${invoiceDate}</td>
    </tr>
    <tr>
      <td>対象期間</td>
      <td>${period.label}</td>
      <td>お支払期限</td>
      <td style="color: #d32f2f; font-weight: bold;">${dueDate}</td>
    </tr>
  </table>

  <div class="summary-box">
    <div style="text-align: center; font-size: 14px;">ご請求金額</div>
    <div class="total">${formatCurrency(summary.total_amount)}</div>
    <div class="details">
      <div>対象注文数: ${summary.order_count}件</div>
      <div>支払方法: ${customer.billing_type === "credit" ? "掛売（月末締め翌月末払い）" : "都度払い"}</div>
    </div>
  </div>

  <h3>注文明細</h3>

  ${orders.map((order) => `
    <div class="order-section">
      <div class="order-header">
        注文番号: ${order.order_number} | 注文日: ${new Date(order.ordered_at).toLocaleDateString("ja-JP")} | 出荷日: ${new Date(order.shipped_at).toLocaleDateString("ja-JP")}
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th>商品名</th>
            <th class="number" style="width: 80px;">数量</th>
            <th class="number" style="width: 100px;">単価</th>
            <th class="number" style="width: 120px;">小計</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item) => `
            <tr>
              <td>${item.product_name}</td>
              <td class="number">${item.quantity}</td>
              <td class="number">${formatCurrency(item.unit_price)}</td>
              <td class="number">${formatCurrency(item.subtotal)}</td>
            </tr>
          `).join("")}
          <tr class="subtotal">
            <td colspan="3" style="text-align: right; font-weight: bold;">注文小計:</td>
            <td class="number" style="font-weight: bold;">${formatCurrency(order.total_amount)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `).join("")}

  <div class="total-section">
    <div class="total-box">
      <div class="total-label">ご請求金額合計</div>
      <div class="total-amount">${formatCurrency(summary.total_amount)}</div>
    </div>
  </div>

  <div class="payment-info">
    <h3>お振込先</h3>
    <p>
      銀行名: ○○銀行 ○○支店<br>
      口座種別: 普通<br>
      口座番号: 1234567<br>
      口座名義: ${shop.company_name}
    </p>
    <p style="color: #666; font-size: 11px;">
      ※ 振込手数料はお客様のご負担となります。<br>
      ※ お支払期限までにお振込みをお願いいたします。
    </p>
  </div>

  <div class="stamp-area">
    <div class="stamp-box">
      <div class="label">承認</div>
      <div class="box"></div>
    </div>
    <div class="stamp-box">
      <div class="label">担当</div>
      <div class="box"></div>
    </div>
  </div>

  <div class="footer">
    <p>この請求書は ${shop.company_name} より発行されました。</p>
    <p>Generated by FactoryLink BtoB Platform</p>
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

