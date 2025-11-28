import "$std/dotenv/load.ts";
import { supabase } from "../services/supabase-service.ts";
import { hash } from "bcrypt";

// テストデータ作成スクリプト
async function seedData() {
  console.log("🌱 テストデータを作成しています...");

  try {
    // 1. ショップを作成
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .insert({
        shop_domain: "test-shop.myshopify.com",
        access_token: "test_access_token",
        company_name: "テスト製造会社",
        address: "東京都渋谷区テスト1-1-1",
        phone: "03-1234-5678",
        invoice_number: "T1234567890123",
      })
      .select()
      .single();

    if (shopError && !shopError.message.includes("duplicate")) {
      throw shopError;
    }

    const shopId = shop?.id || (await supabase
      .from("shops")
      .select("id")
      .eq("shop_domain", "test-shop.myshopify.com")
      .single()).data?.id;

    if (!shopId) {
      throw new Error("ショップの作成に失敗しました");
    }

    console.log("✅ ショップを作成しました:", shopId);

    // 2. 得意先を作成
    const passwordHash = await hash("password123");
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        shop_id: shopId,
        company_name: "テスト得意先株式会社",
        address: "大阪府大阪市テスト2-2-2",
        phone: "06-9876-5432",
        email: "test@example.com",
        billing_type: "immediate",
        login_id: "test_customer",
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (customerError && !customerError.message.includes("duplicate")) {
      throw customerError;
    }

    const customerId = customer?.id || (await supabase
      .from("customers")
      .select("id")
      .eq("login_id", "test_customer")
      .single()).data?.id;

    if (!customerId) {
      throw new Error("得意先の作成に失敗しました");
    }

    console.log("✅ 得意先を作成しました:", customerId);

    // 3. 商品を作成
    const products = [
      {
        id: 1001,
        shop_id: shopId,
        title: "テスト商品A",
        sku: "TEST-A-001",
        price: 1000,
        inventory_quantity: 100,
        image_url: null,
      },
      {
        id: 1002,
        shop_id: shopId,
        title: "テスト商品B",
        sku: "TEST-B-002",
        price: 2000,
        inventory_quantity: 50,
        image_url: null,
      },
      {
        id: 1003,
        shop_id: shopId,
        title: "テスト商品C",
        sku: "TEST-C-003",
        price: 3000,
        inventory_quantity: 30,
        image_url: null,
      },
    ];

    for (const product of products) {
      const { error: productError } = await supabase
        .from("products")
        .upsert(product, { onConflict: "id,shop_id" });

      if (productError && !productError.message.includes("duplicate")) {
        console.error("商品作成エラー:", productError);
      }
    }

    console.log("✅ 商品を作成しました");

    console.log("\n📋 テストデータ作成完了！");
    console.log("\nログイン情報:");
    console.log("  ログインID: test_customer");
    console.log("  パスワード: password123");
    console.log("\n商品ID:");
    products.forEach((p) => {
      console.log(`  ${p.id}: ${p.title} (¥${p.price.toLocaleString()})`);
    });
  } catch (error) {
    console.error("❌ エラー:", error);
    Deno.exit(1);
  }
}

// スクリプト実行
if (import.meta.main) {
  await seedData();
  Deno.exit(0);
}

