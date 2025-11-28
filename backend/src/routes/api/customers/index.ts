import { Hono } from "hono";
import { z } from "zod";
import { hash } from "bcrypt";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const customers = new Hono();

// 得意先一覧取得
customers.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  let query = supabase
    .from("customers")
    .select("*")
    .order("company_name");

  if (shopId) {
    query = query.eq("shop_id", shopId);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: "得意先の取得に失敗しました" }, 500);
  }

  // パスワードハッシュを除外
  const customersWithoutPassword = (data || []).map(({ password_hash, ...rest }) => rest);

  return c.json({ customers: customersWithoutPassword });
});

// 得意先詳細取得
customers.get("/:id", adminAuth, async (c) => {
  const customerId = c.req.param("id");

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error || !data) {
    return c.json({ error: "得意先が見つかりません" }, 404);
  }

  // パスワードハッシュを除外
  const { password_hash, ...customer } = data;

  return c.json({ customer });
});

// 得意先作成
const createCustomerSchema = z.object({
  shop_id: z.string().uuid(),
  company_name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  billing_type: z.enum(["immediate", "credit"]).default("immediate"),
  login_id: z.string().min(1),
  password: z.string().min(8),
});

customers.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createCustomerSchema.parse(body);

    // ログインIDの重複チェック
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("shop_id", data.shop_id)
      .eq("login_id", data.login_id)
      .single();

    if (existing) {
      return c.json({ error: "このログインIDは既に使用されています" }, 400);
    }

    // パスワードハッシュ化
    const passwordHash = await hash(data.password);

    // 得意先を作成
    const { data: customer, error: createError } = await supabase
      .from("customers")
      .insert({
        shop_id: data.shop_id,
        company_name: data.company_name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        billing_type: data.billing_type,
        login_id: data.login_id,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (createError || !customer) {
      return c.json({ error: "得意先の作成に失敗しました" }, 500);
    }

    // パスワードハッシュを除外
    const { password_hash, ...customerWithoutPassword } = customer;

    return c.json({
      message: "得意先を作成しました",
      customer: customerWithoutPassword,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create customer error:", error);
    return c.json({ error: "得意先作成中にエラーが発生しました" }, 500);
  }
});

// 得意先更新
const updateCustomerSchema = z.object({
  company_name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  billing_type: z.enum(["immediate", "credit"]).optional(),
  login_id: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
});

customers.patch("/:id", adminAuth, async (c) => {
  try {
    const customerId = c.req.param("id");
    const body = await c.req.json();
    const data = updateCustomerSchema.parse(body);

    // 既存の得意先を取得
    const { data: existing, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: "得意先が見つかりません" }, 404);
    }

    // 更新データを準備
    const updateData: any = {};
    if (data.company_name !== undefined) updateData.company_name = data.company_name;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.billing_type !== undefined) updateData.billing_type = data.billing_type;
    if (data.login_id !== undefined) {
      // ログインIDの重複チェック（自分以外）
      const { data: duplicate } = await supabase
        .from("customers")
        .select("id")
        .eq("shop_id", existing.shop_id)
        .eq("login_id", data.login_id)
        .neq("id", customerId)
        .single();

      if (duplicate) {
        return c.json({ error: "このログインIDは既に使用されています" }, 400);
      }
      updateData.login_id = data.login_id;
    }
    if (data.password !== undefined) {
      updateData.password_hash = await hash(data.password);
    }

    // 得意先を更新
    const { data: customer, error: updateError } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", customerId)
      .select()
      .single();

    if (updateError || !customer) {
      return c.json({ error: "得意先の更新に失敗しました" }, 500);
    }

    // パスワードハッシュを除外
    const { password_hash, ...customerWithoutPassword } = customer;

    return c.json({
      message: "得意先を更新しました",
      customer: customerWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update customer error:", error);
    return c.json({ error: "得意先更新中にエラーが発生しました" }, 500);
  }
});

// 得意先削除
customers.delete("/:id", adminAuth, async (c) => {
  const customerId = c.req.param("id");

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) {
    return c.json({ error: "得意先の削除に失敗しました" }, 500);
  }

  return c.json({ message: "得意先を削除しました" });
});

export default customers;

