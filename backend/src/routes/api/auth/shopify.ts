import { Hono } from "hono";
import { supabase } from "../../../services/supabase-service.ts";

const auth = new Hono();

// Shopify OAuth開始
auth.get("/shopify/authorize", async (c) => {
  const shop = c.req.query("shop");
  if (!shop) {
    return c.json({ error: "shopパラメータが必要です" }, 400);
  }

  // ショップドメインの検証
  if (!shop.endsWith(".myshopify.com") && !shop.includes(".")) {
    return c.json({ error: "無効なショップドメインです" }, 400);
  }

  const apiKey = Deno.env.get("SHOPIFY_API_KEY");
  if (!apiKey) {
    return c.json({ error: "SHOPIFY_API_KEYが設定されていません" }, 500);
  }

  // リダイレクトURIの構築
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:8000";
  const baseUrl = `${protocol}://${host}`;
  const redirectUri = Deno.env.get("SHOPIFY_REDIRECT_URI") ||
    `${baseUrl}/api/auth/shopify/callback`;

  const scopes = "read_products,write_products,read_inventory,write_inventory";

  // stateパラメータ（CSRF対策）
  const state = crypto.randomUUID();

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return c.redirect(authUrl);
});

// Shopify OAuthコールバック
auth.get("/shopify/callback", async (c) => {
  const code = c.req.query("code");
  const shop = c.req.query("shop");
  const hmac = c.req.query("hmac");
  const _state = c.req.query("state"); // CSRF対策用（将来実装）
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  // エラーレスポンスの処理
  if (error) {
    console.error("Shopify OAuth error:", error, errorDescription);
    return c.redirect(
      `${Deno.env.get("FRONTEND_URL") || "http://localhost:5173"}/admin?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
    );
  }

  if (!code || !shop) {
    return c.json({
      error: "必要なパラメータが不足しています",
      code: code ? "✓" : "✗",
      shop: shop ? "✓" : "✗",
    }, 400);
  }

  const apiKey = Deno.env.get("SHOPIFY_API_KEY");
  const apiSecret = Deno.env.get("SHOPIFY_API_SECRET");

  if (!apiKey || !apiSecret) {
    return c.json({ error: "Shopify API設定が不足しています" }, 500);
  }

  // HMAC検証（本番環境では必須）
  if (hmac) {
    // 注意: 本番環境では適切なHMAC検証を実装してください
    // 開発環境では簡易的にスキップ
    // console.log("HMAC検証が必要です（開発環境ではスキップ）");
  }

  try {
    // アクセストークンを取得
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: apiKey,
          client_secret: apiSecret,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token response error:", errorText);
      return c.json({
        error: "トークン取得に失敗しました",
        details: errorText,
      }, 500);
    }

    const tokenData = await tokenResponse.json();
    const access_token = tokenData.access_token;

    if (!access_token) {
      return c.json({
        error: "アクセストークンが取得できませんでした",
        response: tokenData,
      }, 500);
    }

    // ショップ情報を取得
    const shopResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": access_token,
      },
    });

    if (!shopResponse.ok) {
      return c.json({ error: "ショップ情報の取得に失敗しました" }, 500);
    }

    const { shop: shopData } = await shopResponse.json();

    // データベースに保存または更新
    const { data: existingShop } = await supabase
      .from("shops")
      .select("*")
      .eq("shop_domain", shop)
      .single();

    if (existingShop) {
      await supabase
        .from("shops")
        .update({
          access_token,
          company_name: shopData.name,
        })
        .eq("id", existingShop.id);
    } else {
      await supabase
        .from("shops")
        .insert({
          shop_domain: shop,
          access_token,
          company_name: shopData.name,
        });
    }

    // セッション管理（簡易実装）
    // 本番環境では適切なセッション管理を実装してください
    return c.redirect(`${Deno.env.get("FRONTEND_URL")}/admin`);
  } catch (error) {
    console.error("Shopify OAuth error:", error);
    return c.json({ error: "認証処理中にエラーが発生しました" }, 500);
  }
});

export default auth;

