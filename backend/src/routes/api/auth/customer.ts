import { Hono } from "hono";
import { z } from "zod";
import { create, getNumericDate } from "djwt";
import { compare, hash } from "bcrypt";
import { supabase } from "../../../services/supabase-service.ts";

const customerAuth = new Hono();

const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET環境変数が設定されていません");
}

// ログインスキーマ
const loginSchema = z.object({
  login_id: z.string().min(1),
  password: z.string().min(1),
});

// 得意先ログイン
customerAuth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { login_id, password } = loginSchema.parse(body);

    // 得意先を検索
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("login_id", login_id)
      .single();

    if (error || !customer) {
      return c.json({ error: "ログインIDまたはパスワードが正しくありません" }, 401);
    }

    // パスワード検証
    const isValid = await compare(password, customer.password_hash);
    if (!isValid) {
      return c.json({ error: "ログインIDまたはパスワードが正しくありません" }, 401);
    }

    // JWT生成
    const payload = {
      customerId: customer.id,
      shopId: customer.shop_id,
      loginId: customer.login_id,
      exp: getNumericDate(60 * 60 * 24 * 7), // 7日間有効
    };

    const token = await create({ alg: "HS256", typ: "JWT" }, payload, JWT_SECRET);

    return c.json({
      token,
      customer: {
        id: customer.id,
        company_name: customer.company_name,
        login_id: customer.login_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Login error:", error);
    return c.json({ error: "ログイン処理中にエラーが発生しました" }, 500);
  }
});

// パスワード変更（管理者用）
const changePasswordSchema = z.object({
  customer_id: z.string().uuid(),
  new_password: z.string().min(8),
});

customerAuth.post("/change-password", async (c) => {
  try {
    const body = await c.req.json();
    const { customer_id, new_password } = changePasswordSchema.parse(body);

    // パスワードハッシュ化
    const passwordHash = await hash(new_password);

    // パスワード更新
    const { error } = await supabase
      .from("customers")
      .update({ password_hash: passwordHash })
      .eq("id", customer_id);

    if (error) {
      return c.json({ error: "パスワード更新に失敗しました" }, 500);
    }

    return c.json({ message: "パスワードを更新しました" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Change password error:", error);
    return c.json({ error: "パスワード変更処理中にエラーが発生しました" }, 500);
  }
});

export default customerAuth;

