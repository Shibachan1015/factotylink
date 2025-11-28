import "$std/dotenv/load.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  db: { schema: 'public' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrate() {
  console.log("🔧 マイグレーション実行中...");

  // 直接的なカラム追加はSupabase REST APIではサポートされていないため、
  // 回避策として既存のショップレコードを更新する形で対応

  // まず現在のショップを取得
  const { data: shops, error: fetchError } = await supabase
    .from("shops")
    .select("*");

  if (fetchError) {
    console.error("エラー:", fetchError);
    return;
  }

  console.log("現在のショップ数:", shops?.length || 0);

  // カラムが存在するかテスト（既存レコードの更新を試みる）
  if (shops && shops.length > 0) {
    const testShop = shops[0];
    const { error: updateError } = await supabase
      .from("shops")
      .update({
        admin_login_id: null,
        admin_password_hash: null
      })
      .eq("id", testShop.id);

    if (updateError) {
      if (updateError.message.includes("admin_login_id")) {
        console.log("\n❌ カラムが存在しません。");
        console.log("\n以下のURLをブラウザで開いてSQLを実行してください:");
        console.log(`https://supabase.com/dashboard/project/bqidlvbrnwxczyxoniyj/sql/new`);
        console.log("\n実行するSQL:");
        console.log("----------------------------------------");
        console.log("ALTER TABLE shops ADD COLUMN admin_login_id TEXT UNIQUE;");
        console.log("ALTER TABLE shops ADD COLUMN admin_password_hash TEXT;");
        console.log("----------------------------------------");
      } else {
        console.error("更新エラー:", updateError);
      }
    } else {
      console.log("✅ カラムは既に存在します！マイグレーション不要です。");
    }
  }
}

if (import.meta.main) {
  await migrate();
  Deno.exit(0);
}
