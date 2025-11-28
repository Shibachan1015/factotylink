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

export default adminProducts;
