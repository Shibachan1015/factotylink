// Supabaseデータベーススキーマ適用スクリプト
import { createClient } from "@supabase/supabase-js";
import { readTextFile } from "$std/fs/read_text_file.ts";
import "$std/dotenv/load.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("環境変数が設定されていません:");
  console.error("SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceRoleKey ? "✓" : "✗");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applySchema() {
  console.log("データベーススキーマを適用しています...");

  try {
    // スキーマSQLファイルを読み込む
    const schemaSQL = await readTextFile(
      new URL("./database-schema.sql", import.meta.url),
    );
    const rlsSQL = await readTextFile(
      new URL("./rls-policies.sql", import.meta.url),
    );

    // SQLを実行（SupabaseのRPCを使用するか、直接SQLを実行）
    // 注意: Supabaseのクライアントライブラリでは直接SQLを実行できないため、
    // Supabase DashboardのSQL Editorで実行するか、PostgreSQL接続を使用する必要があります

    console.log("スキーマSQL:");
    console.log("=".repeat(50));
    console.log(schemaSQL);
    console.log("=".repeat(50));
    console.log("\nRLSポリシーSQL:");
    console.log("=".repeat(50));
    console.log(rlsSQL);
    console.log("=".repeat(50));

    console.log("\n⚠️  注意: Supabaseクライアントライブラリでは直接SQLを実行できません。");
    console.log("以下のいずれかの方法でスキーマを適用してください:");
    console.log("1. Supabase DashboardのSQL Editorで上記のSQLを実行");
    console.log("2. Supabase CLIを使用: supabase db push");
    console.log("3. PostgreSQL接続を使用して直接SQLを実行");

    // テーブルが存在するか確認
    console.log("\n既存のテーブルを確認中...");
    const { data: tables, error: tablesError } = await supabase
      .from("shops")
      .select("id")
      .limit(1);

    if (tablesError && tablesError.code === "42P01") {
      console.log("❌ テーブルが存在しません。スキーマを適用してください。");
    } else if (tablesError) {
      console.log("⚠️  エラー:", tablesError.message);
    } else {
      console.log("✓ テーブルが存在します。");
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await applySchema();
}

