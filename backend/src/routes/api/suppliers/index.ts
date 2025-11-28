import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const suppliers = new Hono();

// 仕入れ先一覧取得
suppliers.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("shop_id", shopId)
    .order("name");

  if (error) {
    console.error("Suppliers fetch error:", error);
    return c.json({ error: "仕入れ先の取得に失敗しました" }, 500);
  }

  return c.json({ suppliers: data || [] });
});

// 仕入れ先詳細取得
suppliers.get("/:id", adminAuth, async (c) => {
  const supplierId = c.req.param("id");

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();

  if (error || !data) {
    return c.json({ error: "仕入れ先が見つかりません" }, 404);
  }

  return c.json({ supplier: data });
});

// 仕入れ先作成
const createSupplierSchema = z.object({
  shop_id: z.string().uuid(),
  name: z.string().min(1),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

suppliers.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createSupplierSchema.parse(body);

    // 空文字列をnullに変換
    const insertData = {
      ...data,
      email: data.email || null,
    };

    const { data: supplier, error: createError } = await supabase
      .from("suppliers")
      .insert(insertData)
      .select()
      .single();

    if (createError || !supplier) {
      console.error("Supplier create error:", createError);
      return c.json({ error: "仕入れ先の作成に失敗しました" }, 500);
    }

    return c.json({
      message: "仕入れ先を作成しました",
      supplier,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create supplier error:", error);
    return c.json({ error: "仕入れ先作成中にエラーが発生しました" }, 500);
  }
});

// 仕入れ先更新
const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

suppliers.patch("/:id", adminAuth, async (c) => {
  try {
    const supplierId = c.req.param("id");
    const body = await c.req.json();
    const data = updateSupplierSchema.parse(body);

    // 空文字列をnullに変換
    const updateData = {
      ...data,
      email: data.email || null,
    };

    const { data: supplier, error: updateError } = await supabase
      .from("suppliers")
      .update(updateData)
      .eq("id", supplierId)
      .select()
      .single();

    if (updateError || !supplier) {
      console.error("Supplier update error:", updateError);
      return c.json({ error: "仕入れ先の更新に失敗しました" }, 500);
    }

    return c.json({
      message: "仕入れ先を更新しました",
      supplier,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update supplier error:", error);
    return c.json({ error: "仕入れ先更新中にエラーが発生しました" }, 500);
  }
});

// 仕入れ先削除
suppliers.delete("/:id", adminAuth, async (c) => {
  const supplierId = c.req.param("id");

  // 関連する材料がないか確認
  const { data: materials } = await supabase
    .from("materials")
    .select("id")
    .eq("supplier_id", supplierId)
    .limit(1);

  if (materials && materials.length > 0) {
    return c.json({
      error: "この仕入れ先に紐づく材料があるため削除できません"
    }, 400);
  }

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", supplierId);

  if (error) {
    console.error("Supplier delete error:", error);
    return c.json({ error: "仕入れ先の削除に失敗しました" }, 500);
  }

  return c.json({ message: "仕入れ先を削除しました" });
});

export default suppliers;
