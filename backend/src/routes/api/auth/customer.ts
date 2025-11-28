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

    if (error) {
      console.error("Customer lookup error:", error);
      return c.json({ error: "ログインIDまたはパスワードが正しくありません" }, 401);
    }

    if (!customer) {
      return c.json({ error: "ログインIDまたはパスワードが正しくありません" }, 401);
    }

    if (!customer.password_hash) {
      console.error("Customer password_hash is missing:", customer);
      return c.json({ error: "パスワード情報が見つかりません" }, 500);
    }

    // パスワード検証
    try {
      const isValid = await compare(password, customer.password_hash);
      if (!isValid) {
        return c.json({ error: "ログインIDまたはパスワードが正しくありません" }, 401);
      }
    } catch (compareError) {
      console.error("Password compare error:", compareError);
      return c.json({ error: "パスワード検証中にエラーが発生しました" }, 500);
    }

    // JWT生成
    const payload = {
      customerId: customer.id,
      shopId: customer.shop_id,
      loginId: customer.login_id,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({
      error: "ログイン処理中にエラーが発生しました",
      details: errorMessage
    }, 500);
  }
});

// 新規登録スキーマ
const registerSchema = z.object({
  company_name: z.string().min(1, "会社名は必須です"),
  login_id: z.string().min(4, "ログインIDは4文字以上必要です"),
  password: z.string().min(8, "パスワードは8文字以上必要です"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
});

// 得意先新規登録
customerAuth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { company_name, login_id, password, address, phone, email } = registerSchema.parse(body);

    // ログインIDの重複チェック
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("login_id", login_id)
      .single();

    if (existingCustomer) {
      return c.json({ error: "このログインIDは既に使用されています" }, 400);
    }

    // デフォルトショップを取得または作成
    let shopId: string;
    const { data: existingShop } = await supabase
      .from("shops")
      .select("id")
      .limit(1)
      .single();

    if (existingShop) {
      shopId = existingShop.id;
    } else {
      // ショップが存在しない場合は作成
      const { data: newShop, error: shopError } = await supabase
        .from("shops")
        .insert({
          shop_domain: "default-shop.local",
          access_token: "default_token",
          company_name: "デフォルトショップ",
        })
        .select()
        .single();

      if (shopError || !newShop) {
        console.error("Shop creation error:", shopError);
        return c.json({ error: "システムエラーが発生しました" }, 500);
      }
      shopId = newShop.id;
    }

    // パスワードハッシュ化
    const passwordHash = await hash(password);

    // 得意先登録
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        shop_id: shopId,
        company_name,
        login_id,
        password_hash: passwordHash,
        address: address || null,
        phone: phone || null,
        email: email || null,
        billing_type: "immediate",
      })
      .select()
      .single();

    if (error) {
      console.error("Customer registration error:", error);
      return c.json({ error: "登録に失敗しました" }, 500);
    }

    // JWT生成（登録後自動ログイン）
    const payload = {
      customerId: customer.id,
      shopId: customer.shop_id,
      loginId: customer.login_id,
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
    console.error("Registration error:", error);
    return c.json({ error: "登録処理中にエラーが発生しました" }, 500);
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

