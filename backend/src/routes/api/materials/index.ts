import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const materials = new Hono();

// 材料一覧取得
materials.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("shop_id", shopId)
    .order("name");

  if (error) {
    return c.json({ error: "材料の取得に失敗しました" }, 500);
  }

  return c.json({ materials: data || [] });
});

// 材料詳細取得
materials.get("/:id", adminAuth, async (c) => {
  const materialId = c.req.param("id");

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("id", materialId)
    .single();

  if (error || !data) {
    return c.json({ error: "材料が見つかりません" }, 404);
  }

  return c.json({ material: data });
});

// 材料作成
const createMaterialSchema = z.object({
  shop_id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().optional(),
  unit: z.string().min(1),
  current_stock: z.number().default(0),
  safety_stock: z.number().default(0),
  unit_price: z.number().optional(),
});

materials.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createMaterialSchema.parse(body);

    const { data: material, error: createError } = await supabase
      .from("materials")
      .insert(data)
      .select()
      .single();

    if (createError || !material) {
      return c.json({ error: "材料の作成に失敗しました" }, 500);
    }

    return c.json({
      message: "材料を作成しました",
      material,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create material error:", error);
    return c.json({ error: "材料作成中にエラーが発生しました" }, 500);
  }
});

// 材料更新
const updateMaterialSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  unit: z.string().min(1).optional(),
  current_stock: z.number().optional(),
  safety_stock: z.number().optional(),
  unit_price: z.number().optional(),
});

materials.patch("/:id", adminAuth, async (c) => {
  try {
    const materialId = c.req.param("id");
    const body = await c.req.json();
    const data = updateMaterialSchema.parse(body);

    const { data: material, error: updateError } = await supabase
      .from("materials")
      .update(data)
      .eq("id", materialId)
      .select()
      .single();

    if (updateError || !material) {
      return c.json({ error: "材料の更新に失敗しました" }, 500);
    }

    return c.json({
      message: "材料を更新しました",
      material,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update material error:", error);
    return c.json({ error: "材料更新中にエラーが発生しました" }, 500);
  }
});

// 材料削除
materials.delete("/:id", adminAuth, async (c) => {
  const materialId = c.req.param("id");

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId);

  if (error) {
    return c.json({ error: "材料の削除に失敗しました" }, 500);
  }

  return c.json({ message: "材料を削除しました" });
});

// 在庫アラート取得（安全在庫を下回っている材料）
materials.get("/alerts/low-stock", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 現在在庫が安全在庫以下の材料を取得
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("shop_id", shopId)
    .gt("safety_stock", 0); // 安全在庫が設定されている材料のみ

  if (error) {
    console.error("Low stock alert error:", error);
    return c.json({ error: "アラートの取得に失敗しました" }, 500);
  }

  // 在庫が安全在庫以下のものをフィルタリング
  const lowStockMaterials = (data || []).filter(
    (m) => m.current_stock <= m.safety_stock
  );

  // 緊急度で分類
  const alerts = lowStockMaterials.map((m) => {
    const ratio = m.safety_stock > 0 ? m.current_stock / m.safety_stock : 1;
    let severity: "critical" | "warning" | "info";

    if (m.current_stock <= 0) {
      severity = "critical";
    } else if (ratio <= 0.5) {
      severity = "warning";
    } else {
      severity = "info";
    }

    return {
      ...m,
      severity,
      shortage: Math.max(0, m.safety_stock - m.current_stock),
    };
  });

  // 緊急度順にソート
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return c.json({
    alerts,
    summary: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    },
  });
});

export default materials;

