import { Hono } from "hono";
import { z } from "zod";
import { create, getNumericDate } from "djwt";
import { compare, hash } from "bcrypt";
import { supabase } from "../../../services/supabase-service.ts";

const adminAuth = new Hono();

const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET環境変数が設定されていません");
}

// ログインスキーマ
const loginSchema = z.object({
  login_id: z.string().min(1),
  password: z.string().min(1),
});

// 管理者ログイン
adminAuth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { login_id, password } = loginSchema.parse(body);

    // ショップ（管理者）を検索
    const { data: shop, error } = await supabase
      .from("shops")
      .select("*")
      .eq("admin_login_id", login_id)
      .single();

    if (error || !shop) {
      return c.json({ error: "ログインIDまたはパスワードが正しくありません" }, 401);
    }

    if (!shop.admin_password_hash) {
      return c.json({ error: "パスワードが設定されていません" }, 401);
    }

    // パスワード検証
    const isValid = await compare(password, shop.admin_password_hash);
    if (!isValid) {
      return c.json({ error: "ログインIDまたはパスワードが正しくありません" }, 401);
    }

    // JWT生成
    const payload = {
      shopId: shop.id,
      loginId: shop.admin_login_id,
      role: "admin",
      exp: getNumericDate(60 * 60 * 24 * 7), // 7日間有効
    };

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    return c.json({
      token,
      shop: {
        id: shop.id,
        company_name: shop.company_name,
        login_id: shop.admin_login_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Admin login error:", error);
    return c.json({ error: "ログイン処理中にエラーが発生しました" }, 500);
  }
});

// 管理者登録（初期セットアップ用）
const registerSchema = z.object({
  company_name: z.string().min(1),
  login_id: z.string().min(4),
  password: z.string().min(8),
});

adminAuth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { company_name, login_id, password } = registerSchema.parse(body);

    // ログインIDの重複チェック
    const { data: existingShop } = await supabase
      .from("shops")
      .select("id")
      .eq("admin_login_id", login_id)
      .single();

    if (existingShop) {
      return c.json({ error: "このログインIDは既に使用されています" }, 400);
    }

    // パスワードハッシュ化
    const passwordHash = await hash(password);

    // ショップ登録
    const { data: shop, error } = await supabase
      .from("shops")
      .insert({
        shop_domain: `${login_id}.local`,
        access_token: "local_token",
        company_name,
        admin_login_id: login_id,
        admin_password_hash: passwordHash,
      })
      .select()
      .single();

    if (error) {
      console.error("Shop registration error:", error);
      return c.json({ error: "登録に失敗しました" }, 500);
    }

    // JWT生成（登録後自動ログイン）
    const payload = {
      shopId: shop.id,
      loginId: shop.admin_login_id,
      role: "admin",
      exp: getNumericDate(60 * 60 * 24 * 7),
    };

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    return c.json({
      message: "登録が完了しました",
      token,
      shop: {
        id: shop.id,
        company_name: shop.company_name,
        login_id: shop.admin_login_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Admin registration error:", error);
    return c.json({ error: "登録処理中にエラーが発生しました" }, 500);
  }
});

export default adminAuth;
