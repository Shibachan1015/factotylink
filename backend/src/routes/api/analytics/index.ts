import { Hono } from "hono";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const analytics = new Hono();

// 売上サマリー（日次/週次/月次）
analytics.get("/sales", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const period = c.req.query("period") || "monthly"; // daily, weekly, monthly

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 出荷済み注文を取得
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      total_amount,
      total_cost,
      gross_profit,
      shipped_at,
      customer_id,
      customers:customer_id (company_name)
    `)
    .eq("shop_id", shopId)
    .eq("status", "shipped")
    .order("shipped_at", { ascending: false });

  if (error) {
    console.error("Sales fetch error:", error);
    return c.json({ error: "売上データの取得に失敗しました" }, 500);
  }

  // 期間ごとに集計
  const now = new Date();
  const salesByPeriod: Record<string, {
    period: string;
    total_sales: number;
    total_cost: number;
    gross_profit: number;
    order_count: number;
  }> = {};

  (orders || []).forEach((order) => {
    if (!order.shipped_at) return;

    const date = new Date(order.shipped_at);
    let periodKey: string;

    if (period === "daily") {
      periodKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (period === "weekly") {
      // 週の始まり（月曜日）を計算
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      periodKey = weekStart.toISOString().split("T")[0];
    } else {
      // monthly
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!salesByPeriod[periodKey]) {
      salesByPeriod[periodKey] = {
        period: periodKey,
        total_sales: 0,
        total_cost: 0,
        gross_profit: 0,
        order_count: 0,
      };
    }

    salesByPeriod[periodKey].total_sales += order.total_amount || 0;
    salesByPeriod[periodKey].total_cost += order.total_cost || 0;
    salesByPeriod[periodKey].gross_profit += order.gross_profit || 0;
    salesByPeriod[periodKey].order_count += 1;
  });

  // 配列に変換して日付順にソート
  const salesData = Object.values(salesByPeriod).sort((a, b) =>
    b.period.localeCompare(a.period)
  );

  // 合計
  const totalSales = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalCost = (orders || []).reduce((sum, o) => sum + (o.total_cost || 0), 0);
  const totalGrossProfit = (orders || []).reduce((sum, o) => sum + (o.gross_profit || 0), 0);
  const grossProfitRate = totalSales > 0 ? (totalGrossProfit / totalSales) * 100 : 0;

  return c.json({
    summary: {
      total_sales: totalSales,
      total_cost: totalCost,
      gross_profit: totalGrossProfit,
      gross_profit_rate: Math.round(grossProfitRate * 10) / 10,
      order_count: orders?.length || 0,
    },
    by_period: salesData,
  });
});

// 商品別粗利分析
analytics.get("/products", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 出荷済み注文の明細を取得
  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select(`
      product_id,
      product_name,
      quantity,
      unit_price,
      unit_cost,
      subtotal,
      cost_subtotal,
      gross_profit,
      orders:order_id (shop_id, status)
    `)
    .eq("orders.shop_id", shopId)
    .eq("orders.status", "shipped");

  if (error) {
    console.error("Product analytics error:", error);
    return c.json({ error: "商品別データの取得に失敗しました" }, 500);
  }

  // 商品別に集計
  const productStats: Record<number, {
    product_id: number;
    product_name: string;
    total_quantity: number;
    total_sales: number;
    total_cost: number;
    gross_profit: number;
    gross_profit_rate: number;
  }> = {};

  (orderItems || []).forEach((item) => {
    if (!item.product_id) return;

    if (!productStats[item.product_id]) {
      productStats[item.product_id] = {
        product_id: item.product_id,
        product_name: item.product_name || "不明",
        total_quantity: 0,
        total_sales: 0,
        total_cost: 0,
        gross_profit: 0,
        gross_profit_rate: 0,
      };
    }

    productStats[item.product_id].total_quantity += item.quantity || 0;
    productStats[item.product_id].total_sales += item.subtotal || 0;
    productStats[item.product_id].total_cost += item.cost_subtotal || 0;
    productStats[item.product_id].gross_profit += item.gross_profit || 0;
  });

  // 粗利率を計算
  Object.values(productStats).forEach((stat) => {
    stat.gross_profit_rate = stat.total_sales > 0
      ? Math.round((stat.gross_profit / stat.total_sales) * 1000) / 10
      : 0;
  });

  // 売上順にソート
  const productData = Object.values(productStats).sort(
    (a, b) => b.total_sales - a.total_sales
  );

  return c.json({
    products: productData,
  });
});

// 得意先別粗利分析
analytics.get("/customers", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 出荷済み注文を取得
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_id,
      total_amount,
      total_cost,
      gross_profit,
      shipped_at,
      customers:customer_id (id, company_name)
    `)
    .eq("shop_id", shopId)
    .eq("status", "shipped");

  if (error) {
    console.error("Customer analytics error:", error);
    return c.json({ error: "得意先別データの取得に失敗しました" }, 500);
  }

  // 得意先別に集計
  const customerStats: Record<string, {
    customer_id: string;
    company_name: string;
    total_orders: number;
    total_sales: number;
    total_cost: number;
    gross_profit: number;
    gross_profit_rate: number;
    last_order_date: string | null;
  }> = {};

  (orders || []).forEach((order) => {
    if (!order.customer_id) return;

    if (!customerStats[order.customer_id]) {
      customerStats[order.customer_id] = {
        customer_id: order.customer_id,
        company_name: (order.customers as { company_name: string })?.company_name || "不明",
        total_orders: 0,
        total_sales: 0,
        total_cost: 0,
        gross_profit: 0,
        gross_profit_rate: 0,
        last_order_date: null,
      };
    }

    customerStats[order.customer_id].total_orders += 1;
    customerStats[order.customer_id].total_sales += order.total_amount || 0;
    customerStats[order.customer_id].total_cost += order.total_cost || 0;
    customerStats[order.customer_id].gross_profit += order.gross_profit || 0;

    if (
      !customerStats[order.customer_id].last_order_date ||
      (order.shipped_at && order.shipped_at > customerStats[order.customer_id].last_order_date!)
    ) {
      customerStats[order.customer_id].last_order_date = order.shipped_at;
    }
  });

  // 粗利率を計算
  Object.values(customerStats).forEach((stat) => {
    stat.gross_profit_rate = stat.total_sales > 0
      ? Math.round((stat.gross_profit / stat.total_sales) * 1000) / 10
      : 0;
  });

  // 売上順にソート
  const customerData = Object.values(customerStats).sort(
    (a, b) => b.total_sales - a.total_sales
  );

  return c.json({
    customers: customerData,
  });
});

// 経営ダッシュボード用サマリー
analytics.get("/dashboard", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 現在の月の開始日と終了日
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // 今月の注文
  const { data: currentMonthOrders } = await supabase
    .from("orders")
    .select("total_amount, total_cost, gross_profit")
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

  // ステータス別注文数
  const { data: allOrders } = await supabase
    .from("orders")
    .select("status")
    .eq("shop_id", shopId);

  const statusCounts = {
    new: 0,
    manufacturing: 0,
    completed: 0,
    shipped: 0,
  };

  (allOrders || []).forEach((order) => {
    if (order.status && order.status in statusCounts) {
      statusCounts[order.status as keyof typeof statusCounts]++;
    }
  });

  // 今月の集計
  const currentMonthSales = (currentMonthOrders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const currentMonthCost = (currentMonthOrders || []).reduce((sum, o) => sum + (o.total_cost || 0), 0);
  const currentMonthProfit = (currentMonthOrders || []).reduce((sum, o) => sum + (o.gross_profit || 0), 0);

  // 先月の集計
  const lastMonthSales = (lastMonthOrders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const lastMonthProfit = (lastMonthOrders || []).reduce((sum, o) => sum + (o.gross_profit || 0), 0);

  // 前月比
  const salesChangeRate = lastMonthSales > 0
    ? Math.round(((currentMonthSales - lastMonthSales) / lastMonthSales) * 1000) / 10
    : 0;
  const profitChangeRate = lastMonthProfit > 0
    ? Math.round(((currentMonthProfit - lastMonthProfit) / lastMonthProfit) * 1000) / 10
    : 0;

  // 材料在庫アラート（安全在庫を下回る材料）
  const { data: lowStockMaterials } = await supabase
    .from("materials")
    .select("id, name, current_stock, safety_stock, unit")
    .eq("shop_id", shopId);

  const materialsAtRisk = (lowStockMaterials || []).filter(
    (m) => m.current_stock < m.safety_stock
  );

  return c.json({
    current_month: {
      sales: currentMonthSales,
      cost: currentMonthCost,
      gross_profit: currentMonthProfit,
      gross_profit_rate: currentMonthSales > 0
        ? Math.round((currentMonthProfit / currentMonthSales) * 1000) / 10
        : 0,
      order_count: currentMonthOrders?.length || 0,
    },
    comparison: {
      sales_change_rate: salesChangeRate,
      profit_change_rate: profitChangeRate,
      last_month_sales: lastMonthSales,
      last_month_profit: lastMonthProfit,
    },
    order_status: statusCounts,
    alerts: {
      low_stock_materials: materialsAtRisk,
      low_stock_count: materialsAtRisk.length,
    },
  });
});

// 売上推移グラフ用データ（過去12ヶ月）
analytics.get("/sales-trend", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 12ヶ月前から今日まで
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("total_amount, gross_profit, shipped_at")
    .eq("shop_id", shopId)
    .eq("status", "shipped")
    .gte("shipped_at", twelveMonthsAgo.toISOString())
    .order("shipped_at");

  if (error) {
    console.error("Sales trend error:", error);
    return c.json({ error: "売上推移データの取得に失敗しました" }, 500);
  }

  // 月別に集計（12ヶ月分の空データを用意）
  const monthlyData: Array<{
    month: string;
    sales: number;
    profit: number;
  }> = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyData.push({
      month: monthKey,
      sales: 0,
      profit: 0,
    });
  }

  // 実データを集計
  (orders || []).forEach((order) => {
    if (!order.shipped_at) return;
    const date = new Date(order.shipped_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const monthData = monthlyData.find((m) => m.month === monthKey);
    if (monthData) {
      monthData.sales += order.total_amount || 0;
      monthData.profit += order.gross_profit || 0;
    }
  });

  return c.json({
    trend: monthlyData,
  });
});

export default analytics;
