import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const ai = new Hono();

// AIアドバイスを生成するためのシステムプロンプト
const SYSTEM_PROMPT = `あなたは製造業向けの経営コンサルタントAIです。
提供されたデータを分析し、実践的で具体的な経営アドバイスを日本語で提供してください。

アドバイスは以下の形式で提供してください：
1. 【警告】- 即座に対応が必要な問題
2. 【改善提案】- 収益改善のための具体的な提案
3. 【好調】- 良い傾向を継続するためのアドバイス
4. 【注意】- 今後注意が必要な事項
5. 【予測】- 今後の見通しと目標達成に向けた提案

各アドバイスは具体的な数値を含め、実行可能なアクションを提示してください。`;

// 経営データを取得
async function getBusinessMetrics(shopId: string) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // 今月の注文
  const { data: currentMonthOrders } = await supabase
    .from("orders")
    .select(`
      id, total_amount, total_cost, gross_profit, shipped_at,
      customer_id, customers:customer_id (company_name)
    `)
    .eq("shop_id", shopId)
    .eq("status", "shipped")
    .gte("shipped_at", currentMonthStart.toISOString());

  // 先月の注文
  const { data: lastMonthOrders } = await supabase
    .from("orders")
    .select("total_amount, total_cost, gross_profit")
    .eq("shop_id", shopId)
    .eq("status", "shipped")
    .gte("shipped_at", lastMonthStart.toISOString())
    .lte("shipped_at", lastMonthEnd.toISOString());

  // 材料在庫
  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, current_stock, safety_stock, unit, unit_price")
    .eq("shop_id", shopId);

  // 未処理注文
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("id, status, ordered_at")
    .eq("shop_id", shopId)
    .in("status", ["new", "manufacturing", "completed"]);

  // 商品別売上
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(`
      product_id, product_name, quantity, subtotal, gross_profit,
      orders:order_id (shop_id, status, shipped_at)
    `)
    .eq("orders.shop_id", shopId)
    .eq("orders.status", "shipped")
    .gte("orders.shipped_at", currentMonthStart.toISOString());

  // 計算
  const currentSales = (currentMonthOrders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const currentProfit = (currentMonthOrders || []).reduce((sum, o) => sum + (o.gross_profit || 0), 0);
  const lastSales = (lastMonthOrders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const lastProfit = (lastMonthOrders || []).reduce((sum, o) => sum + (o.gross_profit || 0), 0);

  const lowStockMaterials = (materials || []).filter(m => m.current_stock < m.safety_stock);

  // 商品別集計
  const productSales: Record<string, { name: string; quantity: number; sales: number; profit: number }> = {};
  (orderItems || []).forEach(item => {
    if (!productSales[item.product_id]) {
      productSales[item.product_id] = { name: item.product_name, quantity: 0, sales: 0, profit: 0 };
    }
    productSales[item.product_id].quantity += item.quantity || 0;
    productSales[item.product_id].sales += item.subtotal || 0;
    productSales[item.product_id].profit += item.gross_profit || 0;
  });

  // 得意先別集計
  const customerSales: Record<string, { name: string; orders: number; sales: number }> = {};
  (currentMonthOrders || []).forEach(order => {
    const customerId = order.customer_id;
    const customerName = (order.customers as { company_name: string })?.company_name || "不明";
    if (!customerSales[customerId]) {
      customerSales[customerId] = { name: customerName, orders: 0, sales: 0 };
    }
    customerSales[customerId].orders += 1;
    customerSales[customerId].sales += order.total_amount || 0;
  });

  return {
    current_month: {
      sales: currentSales,
      profit: currentProfit,
      profit_rate: currentSales > 0 ? Math.round((currentProfit / currentSales) * 100) : 0,
      order_count: currentMonthOrders?.length || 0,
    },
    last_month: {
      sales: lastSales,
      profit: lastProfit,
    },
    comparison: {
      sales_change: lastSales > 0 ? Math.round(((currentSales - lastSales) / lastSales) * 100) : 0,
      profit_change: lastProfit > 0 ? Math.round(((currentProfit - lastProfit) / lastProfit) * 100) : 0,
    },
    pending_orders: {
      new: (pendingOrders || []).filter(o => o.status === "new").length,
      manufacturing: (pendingOrders || []).filter(o => o.status === "manufacturing").length,
      completed: (pendingOrders || []).filter(o => o.status === "completed").length,
    },
    low_stock_materials: lowStockMaterials.map(m => ({
      name: m.name,
      current: m.current_stock,
      safety: m.safety_stock,
      unit: m.unit,
    })),
    top_products: Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5),
    top_customers: Object.values(customerSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5),
  };
}

// AIアドバイス生成
ai.post("/generate", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const reportType = c.req.query("type") || "summary"; // summary, weekly, monthly

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 設定からAPIキーを取得
  const { data: settings } = await supabase
    .from("shop_settings")
    .select("anthropic_api_key, ai_enabled")
    .eq("shop_id", shopId)
    .single();

  if (!settings?.anthropic_api_key) {
    return c.json({
      error: "Claude APIキーが設定されていません。設定画面からAPIキーを登録してください。"
    }, 400);
  }

  if (!settings.ai_enabled) {
    return c.json({
      error: "AI機能が無効になっています。設定画面から有効にしてください。"
    }, 400);
  }

  try {
    // 経営データを取得
    const metrics = await getBusinessMetrics(shopId);

    // プロンプト作成
    const userPrompt = `
以下は製造業を営む会社の今月の経営データです。このデータを分析し、経営アドバイスを提供してください。

## 今月の実績
- 売上: ¥${metrics.current_month.sales.toLocaleString()}
- 粗利益: ¥${metrics.current_month.profit.toLocaleString()}
- 粗利率: ${metrics.current_month.profit_rate}%
- 注文件数: ${metrics.current_month.order_count}件

## 前月比
- 売上: ${metrics.comparison.sales_change >= 0 ? '+' : ''}${metrics.comparison.sales_change}%
- 粗利益: ${metrics.comparison.profit_change >= 0 ? '+' : ''}${metrics.comparison.profit_change}%

## 未処理注文
- 新規: ${metrics.pending_orders.new}件
- 製造中: ${metrics.pending_orders.manufacturing}件
- 製造完了（未出荷）: ${metrics.pending_orders.completed}件

## 材料在庫アラート
${metrics.low_stock_materials.length > 0
  ? metrics.low_stock_materials.map(m => `- ${m.name}: 現在 ${m.current}${m.unit} / 安全在庫 ${m.safety}${m.unit}`).join('\n')
  : '- 在庫不足の材料はありません'}

## 売上上位商品
${metrics.top_products.map((p, i) => `${i + 1}. ${p.name}: ${p.quantity}個 / ¥${p.sales.toLocaleString()}`).join('\n')}

## 売上上位得意先
${metrics.top_customers.map((c, i) => `${i + 1}. ${c.name}: ${c.orders}件 / ¥${c.sales.toLocaleString()}`).join('\n')}

上記のデータを基に、5つ程度の具体的なアドバイスを提供してください。
`;

    // Claude APIを呼び出し
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API error:", errorData);
      return c.json({
        error: errorData.error?.message || "AIアドバイスの生成に失敗しました"
      }, 500);
    }

    const result = await response.json();
    const advice = result.content?.[0]?.text || "";

    // レポートを保存
    const { data: report, error: saveError } = await supabase
      .from("ai_reports")
      .insert({
        shop_id: shopId,
        type: reportType,
        period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        period_end: new Date().toISOString(),
        summary: advice,
        metrics: metrics,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error("Report save error:", saveError);
    }

    return c.json({
      advice,
      metrics,
      report_id: report?.id,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return c.json({ error: "AIアドバイスの生成中にエラーが発生しました" }, 500);
  }
});

// 過去のレポート一覧取得
ai.get("/reports", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const limit = parseInt(c.req.query("limit") || "10");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  const { data, error } = await supabase
    .from("ai_reports")
    .select("id, type, period_start, period_end, summary, generated_at")
    .eq("shop_id", shopId)
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Reports fetch error:", error);
    return c.json({ error: "レポートの取得に失敗しました" }, 500);
  }

  return c.json({ reports: data || [] });
});

// 特定のレポート取得
ai.get("/reports/:id", adminAuth, async (c) => {
  const reportId = c.req.param("id");

  const { data, error } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !data) {
    return c.json({ error: "レポートが見つかりません" }, 404);
  }

  return c.json({ report: data });
});

// アラートチェック（自動実行用）
ai.post("/check-alerts", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 設定を確認
  const { data: settings } = await supabase
    .from("shop_settings")
    .select("ai_enabled, ai_alert_enabled")
    .eq("shop_id", shopId)
    .single();

  if (!settings?.ai_enabled || !settings?.ai_alert_enabled) {
    return c.json({ message: "アラート機能が無効です" });
  }

  const metrics = await getBusinessMetrics(shopId);
  const alerts: Array<{ type: string; message: string; severity: string }> = [];

  // 材料在庫アラート
  metrics.low_stock_materials.forEach(m => {
    alerts.push({
      type: "low_stock",
      message: `材料「${m.name}」が安全在庫を下回っています（現在: ${m.current}${m.unit}、安全在庫: ${m.safety}${m.unit}）`,
      severity: "warning",
    });
  });

  // 粗利率低下アラート
  if (metrics.current_month.profit_rate < 20) {
    alerts.push({
      type: "low_profit_rate",
      message: `今月の粗利率が${metrics.current_month.profit_rate}%と低くなっています`,
      severity: "critical",
    });
  }

  // 売上減少アラート
  if (metrics.comparison.sales_change < -10) {
    alerts.push({
      type: "sales_decline",
      message: `売上が前月比${metrics.comparison.sales_change}%減少しています`,
      severity: "warning",
    });
  }

  // 未出荷注文アラート
  if (metrics.pending_orders.completed > 5) {
    alerts.push({
      type: "pending_shipment",
      message: `製造完了済みで未出荷の注文が${metrics.pending_orders.completed}件あります`,
      severity: "info",
    });
  }

  return c.json({
    alerts,
    alert_count: alerts.length,
    checked_at: new Date().toISOString(),
  });
});

export default ai;
