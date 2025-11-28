import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const categories = new Hono();

// カテゴリ一覧取得
categories.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Categories fetch error:", error);
    return c.json({ error: "カテゴリの取得に失敗しました" }, 500);
  }

  return c.json({ categories: data || [] });
});

// カテゴリ作成
const createCategorySchema = z.object({
  shop_id: z.string().uuid(),
  name: z.string().min(1),
  sort_order: z.number().default(0),
});

categories.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createCategorySchema.parse(body);

    const { data: category, error } = await supabase
      .from("product_categories")
      .insert(data)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return c.json({ error: "同じ名前のカテゴリが既に存在します" }, 400);
      }
      console.error("Category create error:", error);
      return c.json({ error: "カテゴリの作成に失敗しました" }, 500);
    }

    return c.json({
      message: "カテゴリを作成しました",
      category,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create category error:", error);
    return c.json({ error: "カテゴリ作成中にエラーが発生しました" }, 500);
  }
});

// カテゴリ更新
const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  sort_order: z.number().optional(),
});

categories.patch("/:id", adminAuth, async (c) => {
  try {
    const categoryId = c.req.param("id");
    const body = await c.req.json();
    const data = updateCategorySchema.parse(body);

    const { data: category, error } = await supabase
      .from("product_categories")
      .update(data)
      .eq("id", categoryId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return c.json({ error: "同じ名前のカテゴリが既に存在します" }, 400);
      }
      console.error("Category update error:", error);
      return c.json({ error: "カテゴリの更新に失敗しました" }, 500);
    }

    return c.json({
      message: "カテゴリを更新しました",
      category,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update category error:", error);
    return c.json({ error: "カテゴリ更新中にエラーが発生しました" }, 500);
  }
});

// カテゴリ削除
categories.delete("/:id", adminAuth, async (c) => {
  const categoryId = c.req.param("id");

  // このカテゴリに属する商品があるか確認
  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", categoryId)
    .limit(1);

  if (products && products.length > 0) {
    return c.json({
      error: "このカテゴリには商品が登録されています。先に商品のカテゴリを変更してください。",
    }, 400);
  }

  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    console.error("Category delete error:", error);
    return c.json({ error: "カテゴリの削除に失敗しました" }, 500);
  }

  return c.json({ message: "カテゴリを削除しました" });
});

// 並び順一括更新
const updateSortOrderSchema = z.object({
  orders: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number(),
  })),
});

categories.post("/reorder", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { orders } = updateSortOrderSchema.parse(body);

    for (const order of orders) {
      await supabase
        .from("product_categories")
        .update({ sort_order: order.sort_order })
        .eq("id", order.id);
    }

    return c.json({ message: "並び順を更新しました" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Reorder categories error:", error);
    return c.json({ error: "並び順更新中にエラーが発生しました" }, 500);
  }
});

export default categories;
