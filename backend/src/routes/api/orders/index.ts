import { Hono } from "hono";
import { supabase } from "../../../services/supabase-service.ts";
import { customerAuth } from "../../../middleware/auth.ts";

const orders = new Hono();

// 注文一覧取得（得意先用）
orders.get("/", customerAuth, async (c) => {
  const customerId = c.get("customerId");
  const status = c.req.query("status");

  let query = supabase
    .from("orders")
    .select(`
      *,
      order_items (*)
    `)
    .eq("customer_id", customerId)
    .order("ordered_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: "注文の取得に失敗しました" }, 500);
  }

  return c.json({ orders: data || [] });
});

// 注文詳細取得
orders.get("/:id", customerAuth, async (c) => {
  const customerId = c.get("customerId");
  const orderId = c.req.param("id");

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (*)
    `)
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .single();

  if (error || !data) {
    return c.json({ error: "注文が見つかりません" }, 404);
  }

  return c.json({ order: data });
});

export default orders;

