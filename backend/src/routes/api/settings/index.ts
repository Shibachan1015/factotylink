import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const settings = new Hono();

// 店舗設定取得
settings.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  const { data, error } = await supabase
    .from("shop_settings")
    .select("*")
    .eq("shop_id", shopId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Settings fetch error:", error);
    return c.json({ error: "設定の取得に失敗しました" }, 500);
  }

  // 設定がなければデフォルト値を返す
  const settings = data || {
    shop_id: shopId,
    anthropic_api_key: null,
    ai_enabled: false,
    ai_weekly_report: false,
    ai_monthly_report: false,
    ai_alert_enabled: false,
  };

  // APIキーは一部マスク
  if (settings.anthropic_api_key) {
    const key = settings.anthropic_api_key;
    settings.anthropic_api_key_masked = key.length > 8
      ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
      : "****";
    settings.anthropic_api_key = undefined; // フルキーは返さない
  }

  return c.json({ settings });
});

// 店舗設定更新
const updateSettingsSchema = z.object({
  anthropic_api_key: z.string().optional(),
  ai_enabled: z.boolean().optional(),
  ai_weekly_report: z.boolean().optional(),
  ai_monthly_report: z.boolean().optional(),
  ai_alert_enabled: z.boolean().optional(),
});

settings.patch("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  try {
    const body = await c.req.json();
    const data = updateSettingsSchema.parse(body);

    // 既存の設定を確認
    const { data: existing } = await supabase
      .from("shop_settings")
      .select("id")
      .eq("shop_id", shopId)
      .single();

    let result;
    if (existing) {
      // 更新
      const { data: updated, error } = await supabase
        .from("shop_settings")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("shop_id", shopId)
        .select()
        .single();

      if (error) {
        console.error("Settings update error:", error);
        return c.json({ error: "設定の更新に失敗しました" }, 500);
      }
      result = updated;
    } else {
      // 新規作成
      const { data: created, error } = await supabase
        .from("shop_settings")
        .insert({
          shop_id: shopId,
          ...data,
        })
        .select()
        .single();

      if (error) {
        console.error("Settings create error:", error);
        return c.json({ error: "設定の作成に失敗しました" }, 500);
      }
      result = created;
    }

    // APIキーをマスク
    if (result.anthropic_api_key) {
      const key = result.anthropic_api_key;
      result.anthropic_api_key_masked = key.length > 8
        ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
        : "****";
      result.anthropic_api_key = undefined;
    }

    return c.json({
      message: "設定を更新しました",
      settings: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update settings error:", error);
    return c.json({ error: "設定更新中にエラーが発生しました" }, 500);
  }
});

// APIキー検証
settings.post("/validate-api-key", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  // 設定からAPIキーを取得
  const { data: settingsData } = await supabase
    .from("shop_settings")
    .select("anthropic_api_key")
    .eq("shop_id", shopId)
    .single();

  if (!settingsData?.anthropic_api_key) {
    return c.json({
      valid: false,
      error: "APIキーが設定されていません"
    });
  }

  try {
    // Claude APIにテストリクエストを送信
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settingsData.anthropic_api_key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }],
      }),
    });

    if (response.ok) {
      return c.json({ valid: true, message: "APIキーは有効です" });
    } else {
      const errorData = await response.json();
      return c.json({
        valid: false,
        error: errorData.error?.message || "APIキーが無効です"
      });
    }
  } catch (error) {
    console.error("API key validation error:", error);
    return c.json({
      valid: false,
      error: "APIキーの検証に失敗しました"
    });
  }
});

export default settings;
