import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const bom = new Hono();

// BOM一覧取得（商品ごとの材料構成）
bom.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");
  const productId = c.req.query("product_id");

  if (!shopId) {
    return c.json({ error: "shop_idパラメータが必要です" }, 400);
  }

  let query = supabase
    .from("bom")
    .select(`
      *,
      products:product_id (id, title, sku, price),
      materials:material_id (id, name, code, unit, unit_price)
    `);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("BOM fetch error:", error);
    return c.json({ error: "BOMの取得に失敗しました" }, 500);
  }

  return c.json({ bom: data || [] });
});

// 商品ごとのBOM取得（特定商品の材料構成）
bom.get("/product/:productId", adminAuth, async (c) => {
  const productId = c.req.param("productId");

  const { data, error } = await supabase
    .from("bom")
    .select(`
      *,
      materials:material_id (id, name, code, unit, unit_price, current_stock)
    `)
    .eq("product_id", productId);

  if (error) {
    console.error("BOM fetch error:", error);
    return c.json({ error: "BOMの取得に失敗しました" }, 500);
  }

  // 原価計算
  const bomWithCost = (data || []).map((item) => {
    const materialCost = (item.materials?.unit_price || 0) * item.quantity_per_unit;
    return {
      ...item,
      material_cost: materialCost,
    };
  });

  const totalCost = bomWithCost.reduce((sum, item) => sum + item.material_cost, 0);

  return c.json({
    bom: bomWithCost,
    total_cost: totalCost,
  });
});

// BOM追加（商品に材料を関連付け）
const createBomSchema = z.object({
  product_id: z.number(),
  material_id: z.string().uuid(),
  quantity_per_unit: z.number().positive(),
});

bom.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createBomSchema.parse(body);

    // 既存のBOMがあるかチェック
    const { data: existing } = await supabase
      .from("bom")
      .select("id")
      .eq("product_id", data.product_id)
      .eq("material_id", data.material_id)
      .single();

    if (existing) {
      return c.json({ error: "この商品と材料の組み合わせは既に登録されています" }, 400);
    }

    const { data: bomItem, error: createError } = await supabase
      .from("bom")
      .insert(data)
      .select(`
        *,
        materials:material_id (id, name, code, unit, unit_price)
      `)
      .single();

    if (createError || !bomItem) {
      console.error("BOM create error:", createError);
      return c.json({ error: "BOMの作成に失敗しました" }, 500);
    }

    return c.json({
      message: "BOMを作成しました",
      bom: bomItem,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create BOM error:", error);
    return c.json({ error: "BOM作成中にエラーが発生しました" }, 500);
  }
});

// BOM更新（数量変更）
const updateBomSchema = z.object({
  quantity_per_unit: z.number().positive(),
});

bom.patch("/:id", adminAuth, async (c) => {
  try {
    const bomId = c.req.param("id");
    const body = await c.req.json();
    const data = updateBomSchema.parse(body);

    const { data: bomItem, error: updateError } = await supabase
      .from("bom")
      .update(data)
      .eq("id", bomId)
      .select(`
        *,
        materials:material_id (id, name, code, unit, unit_price)
      `)
      .single();

    if (updateError || !bomItem) {
      console.error("BOM update error:", updateError);
      return c.json({ error: "BOMの更新に失敗しました" }, 500);
    }

    return c.json({
      message: "BOMを更新しました",
      bom: bomItem,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update BOM error:", error);
    return c.json({ error: "BOM更新中にエラーが発生しました" }, 500);
  }
});

// BOM削除
bom.delete("/:id", adminAuth, async (c) => {
  const bomId = c.req.param("id");

  const { error } = await supabase
    .from("bom")
    .delete()
    .eq("id", bomId);

  if (error) {
    console.error("BOM delete error:", error);
    return c.json({ error: "BOMの削除に失敗しました" }, 500);
  }

  return c.json({ message: "BOMを削除しました" });
});

// 商品の製造原価を計算
bom.get("/cost/:productId", adminAuth, async (c) => {
  const productId = c.req.param("productId");

  const { data: bomItems, error } = await supabase
    .from("bom")
    .select(`
      quantity_per_unit,
      materials:material_id (unit_price)
    `)
    .eq("product_id", productId);

  if (error) {
    console.error("Cost calculation error:", error);
    return c.json({ error: "原価計算に失敗しました" }, 500);
  }

  const totalCost = (bomItems || []).reduce((sum, item) => {
    const materialCost = (item.materials?.unit_price || 0) * item.quantity_per_unit;
    return sum + materialCost;
  }, 0);

  // 商品情報も取得
  const { data: product } = await supabase
    .from("products")
    .select("price")
    .eq("id", productId)
    .single();

  const sellingPrice = product?.price || 0;
  const grossProfit = sellingPrice - totalCost;
  const grossProfitRate = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

  return c.json({
    product_id: productId,
    manufacturing_cost: totalCost,
    selling_price: sellingPrice,
    gross_profit: grossProfit,
    gross_profit_rate: Math.round(grossProfitRate * 10) / 10,
  });
});

// 製造時の材料引き当て（材料在庫を減らす）
const allocateMaterialsSchema = z.object({
  product_id: z.number(),
  quantity: z.number().positive(), // 製造数量
  order_id: z.string().uuid().optional(),
});

bom.post("/allocate", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { product_id, quantity, order_id } = allocateMaterialsSchema.parse(body);

    // BOM取得
    const { data: bomItems, error: bomError } = await supabase
      .from("bom")
      .select(`
        quantity_per_unit,
        material_id,
        materials:material_id (id, name, current_stock, unit)
      `)
      .eq("product_id", product_id);

    if (bomError) {
      return c.json({ error: "BOMの取得に失敗しました" }, 500);
    }

    if (!bomItems || bomItems.length === 0) {
      return c.json({ error: "この商品にはBOMが登録されていません" }, 400);
    }

    // 在庫チェック
    const insufficientMaterials: string[] = [];
    for (const item of bomItems) {
      const requiredQuantity = item.quantity_per_unit * quantity;
      const currentStock = item.materials?.current_stock || 0;
      if (currentStock < requiredQuantity) {
        insufficientMaterials.push(
          `${item.materials?.name}: 必要量 ${requiredQuantity}${item.materials?.unit}、在庫 ${currentStock}${item.materials?.unit}`
        );
      }
    }

    if (insufficientMaterials.length > 0) {
      return c.json({
        error: "材料在庫が不足しています",
        details: insufficientMaterials,
      }, 400);
    }

    // 材料を引き当て（在庫を減らす + 出庫履歴を作成）
    const transactions = [];
    for (const item of bomItems) {
      const requiredQuantity = item.quantity_per_unit * quantity;
      const newStock = (item.materials?.current_stock || 0) - requiredQuantity;

      // 在庫更新
      await supabase
        .from("materials")
        .update({ current_stock: newStock })
        .eq("id", item.material_id);

      // 出庫履歴作成
      const { data: transaction } = await supabase
        .from("material_transactions")
        .insert({
          material_id: item.material_id,
          type: "out",
          quantity: requiredQuantity,
          order_id: order_id || null,
          notes: `商品製造 (${quantity}個)`,
        })
        .select()
        .single();

      transactions.push(transaction);
    }

    return c.json({
      message: "材料を引き当てました",
      transactions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Allocate materials error:", error);
    return c.json({ error: "材料引き当て中にエラーが発生しました" }, 500);
  }
});

// 在庫チェック（製造可能数量を計算）
bom.get("/available/:productId", adminAuth, async (c) => {
  const productId = c.req.param("productId");

  const { data: bomItems, error } = await supabase
    .from("bom")
    .select(`
      quantity_per_unit,
      materials:material_id (id, name, current_stock, unit)
    `)
    .eq("product_id", productId);

  if (error) {
    return c.json({ error: "BOMの取得に失敗しました" }, 500);
  }

  if (!bomItems || bomItems.length === 0) {
    return c.json({
      product_id: productId,
      max_producible: null,
      message: "BOMが登録されていません",
    });
  }

  // 各材料で製造可能な数量を計算し、最小値を取る
  let maxProducible = Infinity;
  const materialStatus = bomItems.map((item) => {
    const currentStock = item.materials?.current_stock || 0;
    const requiredPerUnit = item.quantity_per_unit;
    const producibleFromThis = Math.floor(currentStock / requiredPerUnit);

    if (producibleFromThis < maxProducible) {
      maxProducible = producibleFromThis;
    }

    return {
      material_name: item.materials?.name,
      current_stock: currentStock,
      required_per_unit: requiredPerUnit,
      unit: item.materials?.unit,
      producible_quantity: producibleFromThis,
    };
  });

  return c.json({
    product_id: productId,
    max_producible: maxProducible === Infinity ? 0 : maxProducible,
    materials: materialStatus,
  });
});

export default bom;
