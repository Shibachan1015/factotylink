import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const transactions = new Hono();

// 入出庫履歴取得
transactions.get("/", adminAuth, async (c) => {
  const materialId = c.req.query("material_id");

  let query = supabase
    .from("material_transactions")
    .select(`
      *,
      materials (name, code, unit)
    `)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (materialId) {
    query = query.eq("material_id", materialId);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: "入出庫履歴の取得に失敗しました" }, 500);
  }

  return c.json({ transactions: data || [] });
});

// 入庫登録
const createInTransactionSchema = z.object({
  material_id: z.string().uuid(),
  quantity: z.number().positive(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

transactions.post("/in", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createInTransactionSchema.parse(body);

    // 材料情報を取得
    const { data: material, error: materialError } = await supabase
      .from("materials")
      .select("*")
      .eq("id", data.material_id)
      .single();

    if (materialError || !material) {
      return c.json({ error: "材料が見つかりません" }, 404);
    }

    // 入庫履歴を作成
    const { data: transaction, error: transactionError } = await supabase
      .from("material_transactions")
      .insert({
        material_id: data.material_id,
        type: "in",
        quantity: data.quantity,
        date: data.date || new Date().toISOString().split("T")[0],
        notes: data.notes || null,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      return c.json({ error: "入庫履歴の作成に失敗しました" }, 500);
    }

    // 材料の在庫数を更新
    const newStock = material.current_stock + data.quantity;
    await supabase
      .from("materials")
      .update({ current_stock: newStock })
      .eq("id", data.material_id);

    return c.json({
      message: "入庫を登録しました",
      transaction,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create in transaction error:", error);
    return c.json({ error: "入庫登録中にエラーが発生しました" }, 500);
  }
});

// 出庫登録
const createOutTransactionSchema = z.object({
  material_id: z.string().uuid(),
  quantity: z.number().positive(),
  order_id: z.string().uuid().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

transactions.post("/out", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createOutTransactionSchema.parse(body);

    // 材料情報を取得
    const { data: material, error: materialError } = await supabase
      .from("materials")
      .select("*")
      .eq("id", data.material_id)
      .single();

    if (materialError || !material) {
      return c.json({ error: "材料が見つかりません" }, 404);
    }

    // 在庫数チェック
    if (material.current_stock < data.quantity) {
      return c.json({ error: "在庫が不足しています" }, 400);
    }

    // 出庫履歴を作成
    const { data: transaction, error: transactionError } = await supabase
      .from("material_transactions")
      .insert({
        material_id: data.material_id,
        type: "out",
        quantity: data.quantity,
        order_id: data.order_id || null,
        date: data.date || new Date().toISOString().split("T")[0],
        notes: data.notes || null,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      return c.json({ error: "出庫履歴の作成に失敗しました" }, 500);
    }

    // 材料の在庫数を更新
    const newStock = material.current_stock - data.quantity;
    await supabase
      .from("materials")
      .update({ current_stock: newStock })
      .eq("id", data.material_id);

    return c.json({
      message: "出庫を登録しました",
      transaction,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create out transaction error:", error);
    return c.json({ error: "出庫登録中にエラーが発生しました" }, 500);
  }
});

export default transactions;

