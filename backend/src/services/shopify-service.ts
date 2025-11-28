import { supabase } from "./supabase-service.ts";
import type { Product } from "../models/types.ts";

interface ShopifyProduct {
  id: number;
  title: string;
  variants: Array<{
    sku: string | null;
    price: string;
    inventory_quantity: number;
    image_id: number | null;
  }>;
  images: Array<{
    id: number;
    src: string;
  }>;
}

interface ShopifyInventoryItem {
  id: number;
  sku: string;
  available: number;
}

export class ShopifyService {
  private shopDomain: string;
  private accessToken: string;

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
  }

  private async fetchShopifyAPI(endpoint: string, options?: RequestInit) {
    const url = `https://${this.shopDomain}/admin/api/2024-01/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": this.accessToken,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    return response.json();
  }

  // 商品一覧を取得
  async getProducts(limit = 250): Promise<ShopifyProduct[]> {
    const products: ShopifyProduct[] = [];
    let pageInfo: string | null = null;

    do {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(pageInfo && { page_info: pageInfo }),
      });

      const data = await this.fetchShopifyAPI(`products.json?${params}`);
      products.push(...data.products);

      // ページネーション
      const linkHeader = data.headers?.link;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
        pageInfo = nextMatch ? nextMatch[1].split("page_info=")[1] : null;
      } else {
        pageInfo = null;
      }
    } while (pageInfo);

    return products;
  }

  // 商品データをSupabaseに同期
  async syncProducts(shopId: string): Promise<number> {
    const shopifyProducts = await this.getProducts();
    let syncedCount = 0;

    for (const shopifyProduct of shopifyProducts) {
      const variant = shopifyProducts[0]?.variants?.[0];
      if (!variant) continue;

      const image = shopifyProduct.images.find((img) =>
        img.id === variant.image_id
      ) || shopifyProduct.images[0];

      const product: Omit<Product, "synced_at"> = {
        id: shopifyProduct.id,
        shop_id: shopId,
        title: shopifyProduct.title,
        sku: variant.sku || null,
        price: parseFloat(variant.price),
        inventory_quantity: variant.inventory_quantity || 0,
        image_url: image?.src || null,
      };

      // 既存商品を更新、なければ挿入
      const { error } = await supabase
        .from("products")
        .upsert(product, { onConflict: "id,shop_id" });

      if (!error) {
        syncedCount++;
      }
    }

    return syncedCount;
  }

  // 在庫数を更新
  async updateInventory(productId: number, quantity: number): Promise<void> {
    // まず、在庫アイテムのロケーションIDを取得する必要があります
    // 簡易実装として、商品のバリアントIDを取得
    const productData = await this.fetchShopifyAPI(
      `products/${productId}.json`,
    );
    const variantId = productData.product?.variants?.[0]?.id;

    if (!variantId) {
      throw new Error("商品のバリアントが見つかりません");
    }

    // 在庫ロケーションを取得（最初のロケーションを使用）
    const locationsData = await this.fetchShopifyAPI("locations.json");
    const locationId = locationsData.locations?.[0]?.id;

    if (!locationId) {
      throw new Error("在庫ロケーションが見つかりません");
    }

    // 在庫を調整
    await this.fetchShopifyAPI("inventory_levels/adjust.json", {
      method: "POST",
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: variantId,
        quantity_adjustment: quantity,
      }),
    });
  }

  // 在庫数を取得
  async getInventory(productId: number): Promise<number> {
    const productData = await this.fetchShopifyAPI(
      `products/${productId}.json`,
    );
    const variant = productData.product?.variants?.[0];
    return variant?.inventory_quantity || 0;
  }
}

// ショップIDからShopifyServiceインスタンスを取得
export async function getShopifyService(shopId: string): Promise<ShopifyService> {
  const { data: shop, error } = await supabase
    .from("shops")
    .select("shop_domain, access_token")
    .eq("id", shopId)
    .single();

  if (error || !shop) {
    throw new Error("ショップ情報が見つかりません");
  }

  return new ShopifyService(shop.shop_domain, shop.access_token);
}

