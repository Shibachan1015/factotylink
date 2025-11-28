import { Hono } from "hono";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";
import { generateSalesReportHTML, type SalesReportData } from "../../../services/pdf-service.ts";

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

// 在庫回転率分析
analytics.get("/inventory-turnover", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 過去12ヶ月の出荷データ
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // 商品別の出荷数量を取得
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select(`
      product_id,
      product_name,
      quantity,
      orders:order_id (shop_id, status, shipped_at)
    `)
    .eq("orders.shop_id", shopId)
    .eq("orders.status", "shipped")
    .gte("orders.shipped_at", twelveMonthsAgo.toISOString());

  if (itemsError) {
    console.error("Inventory turnover error:", itemsError);
    return c.json({ error: "在庫回転率データの取得に失敗しました" }, 500);
  }

  // 現在の在庫
  const { data: products } = await supabase
    .from("products")
    .select("id, title, sku, inventory_quantity, price")
    .eq("shop_id", shopId);

  // 商品別の出荷数を集計
  const soldQuantities: Record<number, number> = {};
  (orderItems || []).forEach((item) => {
    if (!soldQuantities[item.product_id]) {
      soldQuantities[item.product_id] = 0;
    }
    soldQuantities[item.product_id] += item.quantity || 0;
  });

  // 在庫回転率を計算
  // 在庫回転率 = 年間出荷数 / 平均在庫 (簡易的に現在在庫を使用)
  const inventoryAnalysis = (products || []).map((product) => {
    const annualSold = soldQuantities[product.id] || 0;
    const currentStock = product.inventory_quantity || 0;

    // 在庫回転率（現在在庫がない場合は計算不可）
    const turnoverRate = currentStock > 0 ? annualSold / currentStock : 0;

    // 在庫日数（365日 / 回転率）
    const daysOfInventory = turnoverRate > 0 ? Math.round(365 / turnoverRate) : null;

    // 在庫金額
    const stockValue = currentStock * (product.price || 0);

    return {
      product_id: product.id,
      product_name: product.title,
      sku: product.sku,
      current_stock: currentStock,
      annual_sold: annualSold,
      turnover_rate: Math.round(turnoverRate * 10) / 10,
      days_of_inventory: daysOfInventory,
      stock_value: stockValue,
      status: turnoverRate >= 4 ? "good" : turnoverRate >= 1 ? "normal" : "slow",
    };
  });

  // 在庫金額合計
  const totalStockValue = inventoryAnalysis.reduce((sum, p) => sum + p.stock_value, 0);

  // 回転率順にソート
  const sortedAnalysis = inventoryAnalysis.sort((a, b) => b.turnover_rate - a.turnover_rate);

  // 滞留在庫（回転率1未満）
  const slowMoving = inventoryAnalysis.filter((p) => p.turnover_rate < 1 && p.current_stock > 0);

  return c.json({
    products: sortedAnalysis,
    summary: {
      total_stock_value: totalStockValue,
      total_products: products?.length || 0,
      slow_moving_count: slowMoving.length,
      slow_moving_value: slowMoving.reduce((sum, p) => sum + p.stock_value, 0),
    },
    slow_moving: slowMoving,
  });
});

// 売掛金管理
analytics.get("/receivables", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 売掛金データを取得
  const { data: receivables, error } = await supabase
    .from("accounts_receivable")
    .select(`
      id,
      amount,
      due_date,
      paid_at,
      status,
      created_at,
      customer_id,
      order_id,
      customers:customer_id (company_name),
      orders:order_id (order_number, total_amount)
    `)
    .eq("shop_id", shopId)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Receivables fetch error:", error);
    return c.json({ error: "売掛金データの取得に失敗しました" }, 500);
  }

  const now = new Date();

  // ステータス別に分類
  const unpaid = (receivables || []).filter((r) => r.status === "unpaid");
  const overdue = (receivables || []).filter((r) => {
    if (r.status !== "unpaid") return false;
    return new Date(r.due_date) < now;
  });
  const paid = (receivables || []).filter((r) => r.status === "paid");

  // 得意先別の売掛金残高
  const customerBalances: Record<string, {
    customer_id: string;
    company_name: string;
    total_unpaid: number;
    overdue_amount: number;
    oldest_due_date: string | null;
    invoice_count: number;
  }> = {};

  unpaid.forEach((r) => {
    const customerId = r.customer_id;
    if (!customerBalances[customerId]) {
      customerBalances[customerId] = {
        customer_id: customerId,
        company_name: (r.customers as { company_name: string })?.company_name || "不明",
        total_unpaid: 0,
        overdue_amount: 0,
        oldest_due_date: null,
        invoice_count: 0,
      };
    }

    customerBalances[customerId].total_unpaid += r.amount || 0;
    customerBalances[customerId].invoice_count += 1;

    if (new Date(r.due_date) < now) {
      customerBalances[customerId].overdue_amount += r.amount || 0;
    }

    if (!customerBalances[customerId].oldest_due_date ||
        r.due_date < customerBalances[customerId].oldest_due_date!) {
      customerBalances[customerId].oldest_due_date = r.due_date;
    }
  });

  // 残高順にソート
  const sortedBalances = Object.values(customerBalances).sort(
    (a, b) => b.total_unpaid - a.total_unpaid
  );

  // 滞留日数別の集計
  const agingBuckets = {
    current: 0,      // 期日前
    days_1_30: 0,    // 1-30日滞留
    days_31_60: 0,   // 31-60日滞留
    days_61_90: 0,   // 61-90日滞留
    over_90: 0,      // 90日超滞留
  };

  unpaid.forEach((r) => {
    const dueDate = new Date(r.due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      agingBuckets.current += r.amount || 0;
    } else if (daysOverdue <= 30) {
      agingBuckets.days_1_30 += r.amount || 0;
    } else if (daysOverdue <= 60) {
      agingBuckets.days_31_60 += r.amount || 0;
    } else if (daysOverdue <= 90) {
      agingBuckets.days_61_90 += r.amount || 0;
    } else {
      agingBuckets.over_90 += r.amount || 0;
    }
  });

  // 合計
  const totalUnpaid = unpaid.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalOverdue = overdue.reduce((sum, r) => sum + (r.amount || 0), 0);

  return c.json({
    summary: {
      total_unpaid: totalUnpaid,
      total_overdue: totalOverdue,
      unpaid_count: unpaid.length,
      overdue_count: overdue.length,
    },
    aging: agingBuckets,
    by_customer: sortedBalances,
    overdue_list: overdue.map((r) => ({
      id: r.id,
      customer_name: (r.customers as { company_name: string })?.company_name || "不明",
      order_number: (r.orders as { order_number: string })?.order_number || "-",
      amount: r.amount,
      due_date: r.due_date,
      days_overdue: Math.floor((now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24)),
    })),
  });
});

// 売掛金ステータス更新
analytics.patch("/receivables/:id", adminAuth, async (c) => {
  const receivableId = c.req.param("id");
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("accounts_receivable")
    .update({
      status: body.status,
      paid_at: body.status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", receivableId)
    .select()
    .single();

  if (error) {
    console.error("Receivable update error:", error);
    return c.json({ error: "売掛金の更新に失敗しました" }, 500);
  }

  return c.json({ message: "売掛金を更新しました", receivable: data });
});

// 売上レポートPDF生成
analytics.get("/report/pdf", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");
  const period = c.req.query("period") || "monthly";

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 店舗情報取得
  const { data: shopData } = await supabase
    .from("shop_settings")
    .select("*")
    .eq("shop_id", shopId)
    .single();

  const shop = {
    company_name: shopData?.company_name || "店舗名未設定",
    address: shopData?.address || "",
    phone: shopData?.phone || "",
    invoice_number: shopData?.invoice_number || "",
  };

  // 期間の設定
  let start: Date;
  let end: Date;
  let periodLabel: string;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    periodLabel = `${start.toLocaleDateString("ja-JP")} - ${end.toLocaleDateString("ja-JP")}`;
  } else {
    // デフォルトは今月
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    periodLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  }

  // 出荷済み注文を取得
  const { data: orders, error: ordersError } = await supabase
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
    .gte("shipped_at", start.toISOString())
    .lte("shipped_at", end.toISOString())
    .order("shipped_at", { ascending: false });

  if (ordersError) {
    console.error("Orders fetch error:", ordersError);
    return c.json({ error: "注文データの取得に失敗しました" }, 500);
  }

  // 注文明細を取得
  const orderIds = (orders || []).map((o) => o.id);
  const { data: orderItems } = orderIds.length > 0
    ? await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
    : { data: [] };

  // サマリー計算
  const totalSales = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalCost = (orders || []).reduce((sum, o) => sum + (o.total_cost || 0), 0);
  const totalGrossProfit = (orders || []).reduce((sum, o) => sum + (o.gross_profit || 0), 0);
  const grossProfitRate = totalSales > 0 ? (totalGrossProfit / totalSales) * 100 : 0;

  // 期間別集計
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
      periodKey = date.toISOString().split("T")[0];
    } else if (period === "weekly") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      periodKey = weekStart.toISOString().split("T")[0];
    } else {
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

  // 商品別集計
  const productStats: Record<number, {
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

  Object.values(productStats).forEach((stat) => {
    stat.gross_profit_rate = stat.total_sales > 0
      ? (stat.gross_profit / stat.total_sales) * 100
      : 0;
  });

  // 得意先別集計
  const customerStats: Record<string, {
    company_name: string;
    total_orders: number;
    total_sales: number;
    gross_profit: number;
    gross_profit_rate: number;
  }> = {};

  (orders || []).forEach((order) => {
    if (!order.customer_id) return;

    if (!customerStats[order.customer_id]) {
      customerStats[order.customer_id] = {
        company_name: (order.customers as { company_name: string })?.company_name || "不明",
        total_orders: 0,
        total_sales: 0,
        gross_profit: 0,
        gross_profit_rate: 0,
      };
    }

    customerStats[order.customer_id].total_orders += 1;
    customerStats[order.customer_id].total_sales += order.total_amount || 0;
    customerStats[order.customer_id].gross_profit += order.gross_profit || 0;
  });

  Object.values(customerStats).forEach((stat) => {
    stat.gross_profit_rate = stat.total_sales > 0
      ? (stat.gross_profit / stat.total_sales) * 100
      : 0;
  });

  // レポートデータ構築
  const reportData: SalesReportData = {
    shop: shop as SalesReportData["shop"],
    period: {
      start: start.toLocaleDateString("ja-JP"),
      end: end.toLocaleDateString("ja-JP"),
      label: periodLabel,
    },
    summary: {
      total_sales: totalSales,
      total_cost: totalCost,
      gross_profit: totalGrossProfit,
      gross_profit_rate: grossProfitRate,
      order_count: orders?.length || 0,
    },
    salesByPeriod: Object.values(salesByPeriod).sort((a, b) => b.period.localeCompare(a.period)),
    productStats: Object.values(productStats).sort((a, b) => b.total_sales - a.total_sales),
    customerStats: Object.values(customerStats).sort((a, b) => b.total_sales - a.total_sales),
  };

  const html = generateSalesReportHTML(reportData);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});

export default analytics;
