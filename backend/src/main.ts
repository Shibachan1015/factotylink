import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "$std/dotenv/load.ts";

const app = new Hono();

// ミドルウェア
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: Deno.env.get("FRONTEND_URL") || "http://localhost:5173",
    credentials: true,
  }),
);

// ルートパス
app.get("/", (c) => {
  return c.json({
    message: "BtoB受発注プラットフォーム API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api"
    }
  });
});

// ヘルスチェック
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// APIルート
app.get("/api", (c) => {
  return c.json({ message: "BtoB受発注プラットフォーム API" });
});

// 認証ルート
import shopifyAuthRoutes from "./routes/api/auth/shopify.ts";
import customerAuthRoutes from "./routes/api/auth/customer.ts";
import adminAuthRoutes from "./routes/api/auth/admin.ts";
app.route("/api/auth", shopifyAuthRoutes);
app.route("/api/auth/customer", customerAuthRoutes);
app.route("/api/auth/admin", adminAuthRoutes);

// 商品ルート
import productsRoutes from "./routes/api/products/index.ts";
import productsSyncRoutes from "./routes/api/products/sync.ts";
import productsInventoryRoutes from "./routes/api/products/inventory.ts";
import adminProductsRoutes from "./routes/api/products/admin.ts";
app.route("/api/products", productsRoutes);
app.route("/api/products/sync", productsSyncRoutes);
app.route("/api/products/inventory", productsInventoryRoutes);
app.route("/api/admin/products", adminProductsRoutes);

// 注文ルート
import ordersRoutes from "./routes/api/orders/index.ts";
import createOrderRoutes from "./routes/api/orders/create.ts";
import adminOrdersRoutes from "./routes/api/orders/admin.ts";
app.route("/api/orders", ordersRoutes);
app.route("/api/orders", createOrderRoutes);
app.route("/api/admin/orders", adminOrdersRoutes);

// 帳票ルート
import deliveryNoteRoutes from "./routes/api/documents/delivery-note.ts";
import invoiceRoutes from "./routes/api/documents/invoice.ts";
import labelRoutes from "./routes/api/documents/label.ts";
import documentsRoutes from "./routes/api/documents/index.ts";
app.route("/api/documents/delivery-note", deliveryNoteRoutes);
app.route("/api/documents/invoice", invoiceRoutes);
app.route("/api/documents/label", labelRoutes);
app.route("/api/documents", documentsRoutes);

// 得意先管理ルート
import customersRoutes from "./routes/api/customers/index.ts";
app.route("/api/admin/customers", customersRoutes);

// 在庫管理ルート
import inventoryRoutes from "./routes/api/inventory/index.ts";
app.route("/api/admin/inventory", inventoryRoutes);

// 材料在庫管理ルート
import materialsRoutes from "./routes/api/materials/index.ts";
import materialTransactionsRoutes from "./routes/api/materials/transactions.ts";
app.route("/api/admin/materials", materialsRoutes);
app.route("/api/admin/materials/transactions", materialTransactionsRoutes);

// BOM（部品表）管理ルート
import bomRoutes from "./routes/api/bom/index.ts";
app.route("/api/admin/bom", bomRoutes);

// 経営分析ルート
import analyticsRoutes from "./routes/api/analytics/index.ts";
app.route("/api/admin/analytics", analyticsRoutes);

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🚀 Server running on http://localhost:${port}`);

Deno.serve({ port }, app.fetch);

