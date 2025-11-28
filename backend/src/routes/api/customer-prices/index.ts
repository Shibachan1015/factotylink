import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const customerPrices = new Hono();

// 得意先別価格一覧取得
customerPrices.get("/", adminAuth, async (c) => {
  const customerId = c.req.query("customer_id");

  if (!customerId) {
    return c.json({ error: "customer_idパラメータが必要です" }, 400);
  }

  const { data, error } = await supabase
    .from("customer_prices")
    .select(`
      *,
      products:product_id (id, title, sku, price)
    `)
    .eq("customer_id", customerId);

  if (error) {
    console.error("Customer prices fetch error:", error);
    return c.json({ error: "価格の取得に失敗しました" }, 500);
  }

  return c.json({ customer_prices: data || [] });
});

// 得意先別価格設定（作成/更新）
const setPriceSchema = z.object({
  customer_id: z.string().uuid(),
  product_id: z.number(),
  price: z.number().min(0),
});

customerPrices.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = setPriceSchema.parse(body);

    // upsert（存在すれば更新、なければ作成）
    const { data: price, error } = await supabase
      .from("customer_prices")
      .upsert({
        customer_id: data.customer_id,
        product_id: data.product_id,
        price: data.price,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "customer_id,product_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Customer price set error:", error);
      return c.json({ error: "価格の設定に失敗しました" }, 500);
    }

    return c.json({
      message: "価格を設定しました",
      customer_price: price,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Set customer price error:", error);
    return c.json({ error: "価格設定中にエラーが発生しました" }, 500);
  }
});

// 一括価格設定
const bulkSetPricesSchema = z.object({
  customer_id: z.string().uuid(),
  prices: z.array(z.object({
    product_id: z.number(),
    price: z.number().min(0),
  })),
});

customerPrices.post("/bulk", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = bulkSetPricesSchema.parse(body);

    const pricesToUpsert = data.prices.map((p) => ({
      customer_id: data.customer_id,
      product_id: p.product_id,
      price: p.price,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("customer_prices")
      .upsert(pricesToUpsert, {
        onConflict: "customer_id,product_id",
      });

    if (error) {
      console.error("Bulk price set error:", error);
      return c.json({ error: "価格の一括設定に失敗しました" }, 500);
    }

    return c.json({
      message: `${data.prices.length}件の価格を設定しました`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Bulk set customer prices error:", error);
    return c.json({ error: "一括価格設定中にエラーが発生しました" }, 500);
  }
});

// 得意先別価格削除
customerPrices.delete("/:id", adminAuth, async (c) => {
  const priceId = c.req.param("id");

  const { error } = await supabase
    .from("customer_prices")
    .delete()
    .eq("id", priceId);

  if (error) {
    console.error("Customer price delete error:", error);
    return c.json({ error: "価格の削除に失敗しました" }, 500);
  }

  return c.json({ message: "価格設定を削除しました" });
});

// 得意先の商品一覧（価格反映済み）
customerPrices.get("/products/:customerId", adminAuth, async (c) => {
  const customerId = c.req.param("customerId");

  // 得意先情報を取得してshop_idを確認
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("shop_id")
    .eq("id", customerId)
    .single();

  if (customerError || !customer) {
    return c.json({ error: "得意先が見つかりません" }, 404);
  }

  // 商品一覧を取得
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", customer.shop_id);

  if (productsError) {
    return c.json({ error: "商品の取得に失敗しました" }, 500);
  }

  // 得意先別価格を取得
  const { data: customerPricesData } = await supabase
    .from("customer_prices")
    .select("product_id, price")
    .eq("customer_id", customerId);

  const priceMap = new Map(
    (customerPricesData || []).map((p) => [p.product_id, p.price])
  );

  // 価格を反映
  const productsWithCustomerPrices = (products || []).map((product) => ({
    ...product,
    standard_price: product.price,
    customer_price: priceMap.get(product.id) || null,
    effective_price: priceMap.get(product.id) ?? product.price,
    has_custom_price: priceMap.has(product.id),
  }));

  return c.json({ products: productsWithCustomerPrices });
});

export default customerPrices;
