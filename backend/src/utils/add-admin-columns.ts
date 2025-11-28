import "$std/dotenv/load.ts";
import { supabase } from "../services/supabase-service.ts";

// shopsテーブルに管理者認証カラムを追加するスクリプト
async function addAdminColumns() {
  console.log("🔧 管理者認証カラムを追加しています...");

  try {
    // PostgreSQL の ALTER TABLE を実行
    // Supabaseでは直接SQLを実行するために rpc を使うか、
    // ダッシュボードから実行する必要があります

    // まずは既存のショップにadmin認証情報を追加してテスト
    const { data: shops, error: fetchError } = await supabase
      .from("shops")
      .select("*")
      .limit(1);

    if (fetchError) {
      console.error("ショップ取得エラー:", fetchError);
      return;
    }

    console.log("既存ショップ:", shops);

    // カラムが存在するかチェック
    if (shops && shops.length > 0) {
      const shop = shops[0];
      if ('admin_login_id' in shop) {
        console.log("✅ admin_login_id カラムは既に存在します");
      } else {
        console.log("⚠️ admin_login_id カラムが存在しません");
        console.log("\n以下のSQLをSupabaseダッシュボードで実行してください:");
        console.log("--------------------------------------------");
        console.log(`
ALTER TABLE shops ADD COLUMN IF NOT EXISTS admin_login_id TEXT UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS admin_password_hash TEXT;
        `);
        console.log("--------------------------------------------");
      }
    }
  } catch (error) {
    console.error("❌ エラー:", error);
  }
}

if (import.meta.main) {
  await addAdminColumns();
  Deno.exit(0);
}
