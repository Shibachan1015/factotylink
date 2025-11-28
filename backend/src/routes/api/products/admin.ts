import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const adminProducts = new Hono();

// 商品一覧取得（管理者用）
adminProducts.get("/", adminAuth, async (c) => {
  const shopId = c.get("shopId");
  const search = c.req.query("search");

  let query = supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .order("title");

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Products fetch error:", error);
    return c.json({ error: "商品の取得に失敗しました" }, 500);
  }

  return c.json({ products: data || [] });
});

// 商品詳細取得（管理者用）
adminProducts.get("/:id", adminAuth, async (c) => {
  const shopId = c.get("shopId");
  const productId = parseInt(c.req.param("id"));

  if (isNaN(productId)) {
    return c.json({ error: "無効な商品IDです" }, 400);
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("shop_id", shopId)
    .single();

  if (error || !data) {
    return c.json({ error: "商品が見つかりません" }, 404);
  }

  return c.json({ product: data });
});

// 商品登録スキーマ
const createProductSchema = z.object({
  title: z.string().min(1, "商品名は必須です"),
  sku: z.string().optional(),
  price: z.number().min(0, "価格は0以上である必要があります"),
  inventory_quantity: z.number().int().min(0).default(0),
  image_url: z.string().url().optional().nullable(),
});

// 商品登録
adminProducts.post("/", adminAuth, async (c) => {
  try {
    const shopId = c.get("shopId");
    const body = await c.req.json();
    const data = createProductSchema.parse(body);

    // 商品IDを生成（タイムスタンプベース）
    const productId = Date.now();

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        id: productId,
        shop_id: shopId,
        title: data.title,
        sku: data.sku || null,
        price: data.price,
        inventory_quantity: data.inventory_quantity,
        image_url: data.image_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Product creation error:", error);
      return c.json({ error: "商品の登録に失敗しました" }, 500);
    }

    return c.json({ message: "商品を登録しました", product }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Product creation error:", error);
    return c.json({ error: "商品の登録に失敗しました" }, 500);
  }
});

// 商品更新スキーマ
const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  sku: z.string().optional().nullable(),
  price: z.number().min(0).optional(),
  inventory_quantity: z.number().int().min(0).optional(),
  image_url: z.string().url().optional().nullable(),
});

// 商品更新
adminProducts.put("/:id", adminAuth, async (c) => {
  try {
    const shopId = c.get("shopId");
    const productId = parseInt(c.req.param("id"));

    if (isNaN(productId)) {
      return c.json({ error: "無効な商品IDです" }, 400);
    }

    const body = await c.req.json();
    const data = updateProductSchema.parse(body);

    // 商品が存在するか確認
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("shop_id", shopId)
      .single();

    if (!existing) {
      return c.json({ error: "商品が見つかりません" }, 404);
    }

    const { data: product, error } = await supabase
      .from("products")
      .update({
        ...data,
        synced_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("shop_id", shopId)
      .select()
      .single();

    if (error) {
      console.error("Product update error:", error);
      return c.json({ error: "商品の更新に失敗しました" }, 500);
    }

    return c.json({ message: "商品を更新しました", product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Product update error:", error);
    return c.json({ error: "商品の更新に失敗しました" }, 500);
  }
});

// 商品削除
adminProducts.delete("/:id", adminAuth, async (c) => {
  const shopId = c.get("shopId");
  const productId = parseInt(c.req.param("id"));

  if (isNaN(productId)) {
    return c.json({ error: "無効な商品IDです" }, 400);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("shop_id", shopId);

  if (error) {
    console.error("Product deletion error:", error);
    return c.json({ error: "商品の削除に失敗しました" }, 500);
  }

  return c.json({ message: "商品を削除しました" });
});

// CSVエクスポート
adminProducts.get("/export/csv", adminAuth, async (c) => {
  const shopId = c.get("shopId");

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .order("title");

  if (error) {
    return c.json({ error: "商品の取得に失敗しました" }, 500);
  }

  // CSVヘッダー
  const headers = ["id", "title", "sku", "price", "inventory_quantity", "description", "image_url"];
  const csvLines = [headers.join(",")];

  // データ行
  (data || []).forEach((product) => {
    const row = headers.map((header) => {
      const value = product[header];
      if (value === null || value === undefined) {
        return "";
      }
      // カンマや改行を含む場合はダブルクォートで囲む
      const strValue = String(value);
      if (strValue.includes(",") || strValue.includes("\n") || strValue.includes("\"")) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    });
    csvLines.push(row.join(","));
  });

  const csv = csvLines.join("\n");

  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="products_${new Date().toISOString().split("T")[0]}.csv"`);

  return c.body(csv);
});

// CSVインポート
adminProducts.post("/import/csv", adminAuth, async (c) => {
  try {
    const shopId = c.get("shopId");
    const body = await c.req.json();
    const { csvData } = body;

    if (!csvData || typeof csvData !== "string") {
      return c.json({ error: "CSVデータが必要です" }, 400);
    }

    // CSVをパース
    const lines = csvData.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      return c.json({ error: "CSVにデータがありません" }, 400);
    }

    // ヘッダー解析
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    // 必須カラムチェック
    const requiredColumns = ["title", "price"];
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      return c.json({ error: `必須カラムがありません: ${missingColumns.join(", ")}` }, 400);
    }

    // データ行を処理
    const results = {
      success: 0,
      errors: [] as string[],
      created: 0,
      updated: 0,
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        const title = row.title?.trim();
        const sku = row.sku?.trim() || null;
        const price = parseFloat(row.price) || 0;
        const inventoryQuantity = parseInt(row.inventory_quantity) || 0;
        const description = row.description?.trim() || null;
        const imageUrl = row.image_url?.trim() || null;

        if (!title) {
          results.errors.push(`行 ${i + 1}: 商品名が空です`);
          continue;
        }

        // IDが指定されている場合は更新、なければ新規作成
        const existingId = row.id ? parseInt(row.id) : null;

        if (existingId) {
          // 更新
          const { error } = await supabase
            .from("products")
            .update({
              title,
              sku,
              price,
              inventory_quantity: inventoryQuantity,
              description,
              image_url: imageUrl,
              synced_at: new Date().toISOString(),
            })
            .eq("id", existingId)
            .eq("shop_id", shopId);

          if (error) {
            results.errors.push(`行 ${i + 1}: 更新に失敗しました - ${error.message}`);
          } else {
            results.updated++;
            results.success++;
          }
        } else {
          // 新規作成
          const productId = Date.now() + i; // ユニークなIDを生成

          const { error } = await supabase
            .from("products")
            .insert({
              id: productId,
              shop_id: shopId,
              title,
              sku,
              price,
              inventory_quantity: inventoryQuantity,
              description,
              image_url: imageUrl,
            });

          if (error) {
            results.errors.push(`行 ${i + 1}: 登録に失敗しました - ${error.message}`);
          } else {
            results.created++;
            results.success++;
          }
        }
      } catch (err) {
        results.errors.push(`行 ${i + 1}: パースエラー`);
      }
    }

    return c.json({
      message: `インポート完了: 成功 ${results.success}件 (新規 ${results.created}件, 更新 ${results.updated}件)`,
      results,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return c.json({ error: "CSVインポートに失敗しました" }, 500);
  }
});

// CSVの行をパースする関数
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // 次の " をスキップ
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());

  return result;
}

export default adminProducts;
