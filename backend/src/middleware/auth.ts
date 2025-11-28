import { Context, Next } from "hono";
import { verify } from "djwt";
import { supabase } from "../services/supabase-service.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET環境変数が設定されていません");
}

// JWT検証用のキーを事前に準備
const jwtKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(JWT_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["verify"]
);

// 管理者認証ミドルウェア（JWT検証）
export async function adminAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "認証トークンが必要です" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verify(token, jwtKey);

    // 管理者ロールの確認
    if (payload.role !== "admin") {
      return c.json({ error: "管理者権限が必要です" }, 403);
    }

    c.set("shopId", payload.shopId as string);
    c.set("loginId", payload.loginId as string);
    await next();
  } catch (error) {
    console.error("Admin JWT verification error:", error);
    return c.json({ error: "無効なトークンです" }, 401);
  }
}

// 得意先認証ミドルウェア（JWT検証）
export async function customerAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "認証トークンが必要です" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verify(token, jwtKey);
    c.set("customerId", payload.customerId as string);
    c.set("shopId", payload.shopId as string);
    await next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return c.json({ error: "無効なトークンです" }, 401);
  }
}

// ショップID取得ヘルパー
export async function getShopIdFromSession(
  sessionId: string,
): Promise<string | null> {
  // セッション管理の実装が必要
  // 簡易実装として、ショップIDを直接返す
  return null;
}

