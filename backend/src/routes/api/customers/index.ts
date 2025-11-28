import { Hono } from "hono";
import { z } from "zod";
import { hash } from "bcrypt";
import { supabase } from "../../../services/supabase-service.ts";
import { adminAuth } from "../../../middleware/auth.ts";

const customers = new Hono();

// 得意先一覧取得
customers.get("/", adminAuth, async (c) => {
  const shopId = c.req.query("shop_id");

  let query = supabase
    .from("customers")
    .select("*")
    .order("company_name");

  if (shopId) {
    query = query.eq("shop_id", shopId);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: "得意先の取得に失敗しました" }, 500);
  }

  // パスワードハッシュを除外
  const customersWithoutPassword = (data || []).map(({ password_hash, ...rest }) => rest);

  return c.json({ customers: customersWithoutPassword });
});

// 得意先詳細取得
customers.get("/:id", adminAuth, async (c) => {
  const customerId = c.req.param("id");

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error || !data) {
    return c.json({ error: "得意先が見つかりません" }, 404);
  }

  // パスワードハッシュを除外
  const { password_hash, ...customer } = data;

  return c.json({ customer });
});

// 得意先作成
const createCustomerSchema = z.object({
  shop_id: z.string().uuid(),
  company_name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  billing_type: z.enum(["immediate", "credit"]).default("immediate"),
  login_id: z.string().min(1),
  password: z.string().min(8),
});

customers.post("/", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createCustomerSchema.parse(body);

    // ログインIDの重複チェック
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("shop_id", data.shop_id)
      .eq("login_id", data.login_id)
      .single();

    if (existing) {
      return c.json({ error: "このログインIDは既に使用されています" }, 400);
    }

    // パスワードハッシュ化
    const passwordHash = await hash(data.password);

    // 得意先を作成
    const { data: customer, error: createError } = await supabase
      .from("customers")
      .insert({
        shop_id: data.shop_id,
        company_name: data.company_name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        billing_type: data.billing_type,
        login_id: data.login_id,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (createError || !customer) {
      return c.json({ error: "得意先の作成に失敗しました" }, 500);
    }

    // パスワードハッシュを除外
    const { password_hash, ...customerWithoutPassword } = customer;

    return c.json({
      message: "得意先を作成しました",
      customer: customerWithoutPassword,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Create customer error:", error);
    return c.json({ error: "得意先作成中にエラーが発生しました" }, 500);
  }
});

// 得意先更新
const updateCustomerSchema = z.object({
  company_name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  billing_type: z.enum(["immediate", "credit"]).optional(),
  login_id: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
});

customers.patch("/:id", adminAuth, async (c) => {
  try {
    const customerId = c.req.param("id");
    const body = await c.req.json();
    const data = updateCustomerSchema.parse(body);

    // 既存の得意先を取得
    const { data: existing, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: "得意先が見つかりません" }, 404);
    }

    // 更新データを準備
    const updateData: any = {};
    if (data.company_name !== undefined) updateData.company_name = data.company_name;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.billing_type !== undefined) updateData.billing_type = data.billing_type;
    if (data.login_id !== undefined) {
      // ログインIDの重複チェック（自分以外）
      const { data: duplicate } = await supabase
        .from("customers")
        .select("id")
        .eq("shop_id", existing.shop_id)
        .eq("login_id", data.login_id)
        .neq("id", customerId)
        .single();

      if (duplicate) {
        return c.json({ error: "このログインIDは既に使用されています" }, 400);
      }
      updateData.login_id = data.login_id;
    }
    if (data.password !== undefined) {
      updateData.password_hash = await hash(data.password);
    }

    // 得意先を更新
    const { data: customer, error: updateError } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", customerId)
      .select()
      .single();

    if (updateError || !customer) {
      return c.json({ error: "得意先の更新に失敗しました" }, 500);
    }

    // パスワードハッシュを除外
    const { password_hash, ...customerWithoutPassword } = customer;

    return c.json({
      message: "得意先を更新しました",
      customer: customerWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "入力データが不正です", details: error.errors }, 400);
    }
    console.error("Update customer error:", error);
    return c.json({ error: "得意先更新中にエラーが発生しました" }, 500);
  }
});

// 得意先削除
customers.delete("/:id", adminAuth, async (c) => {
  const customerId = c.req.param("id");

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) {
    return c.json({ error: "得意先の削除に失敗しました" }, 500);
  }

  return c.json({ message: "得意先を削除しました" });
});

// CSVエクスポート
customers.get("/export/csv", adminAuth, async (c) => {
  const shopId = c.get("shopId");

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("shop_id", shopId)
    .order("company_name");

  if (error) {
    return c.json({ error: "得意先の取得に失敗しました" }, 500);
  }

  // CSVヘッダー（パスワードハッシュは除外）
  const headers = ["id", "company_name", "login_id", "email", "phone", "address", "billing_type"];
  const csvLines = [headers.join(",")];

  // データ行
  (data || []).forEach((customer) => {
    const row = headers.map((header) => {
      const value = customer[header];
      if (value === null || value === undefined) {
        return "";
      }
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
  c.header("Content-Disposition", `attachment; filename="customers_${new Date().toISOString().split("T")[0]}.csv"`);

  return c.body(csv);
});

// CSVインポート
customers.post("/import/csv", adminAuth, async (c) => {
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
    const requiredColumns = ["company_name", "login_id"];
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

        const companyName = row.company_name?.trim();
        const loginId = row.login_id?.trim();
        const email = row.email?.trim() || null;
        const phone = row.phone?.trim() || null;
        const address = row.address?.trim() || null;
        const billingType = row.billing_type?.trim() || "immediate";
        const password = row.password?.trim();

        if (!companyName) {
          results.errors.push(`行 ${i + 1}: 会社名が空です`);
          continue;
        }
        if (!loginId) {
          results.errors.push(`行 ${i + 1}: ログインIDが空です`);
          continue;
        }

        // IDが指定されている場合は更新、なければ新規作成
        const existingId = row.id?.trim();

        if (existingId) {
          // 更新
          const updateData: any = {
            company_name: companyName,
            login_id: loginId,
            email,
            phone,
            address,
            billing_type: billingType,
          };

          // パスワードが指定されていれば更新
          if (password && password.length >= 8) {
            updateData.password_hash = await hash(password);
          }

          const { error } = await supabase
            .from("customers")
            .update(updateData)
            .eq("id", existingId)
            .eq("shop_id", shopId);

          if (error) {
            results.errors.push(`行 ${i + 1}: 更新に失敗しました - ${error.message}`);
          } else {
            results.updated++;
            results.success++;
          }
        } else {
          // 新規作成 - パスワードが必要
          if (!password || password.length < 8) {
            results.errors.push(`行 ${i + 1}: 新規登録にはパスワード（8文字以上）が必要です`);
            continue;
          }

          // ログインID重複チェック
          const { data: duplicate } = await supabase
            .from("customers")
            .select("id")
            .eq("shop_id", shopId)
            .eq("login_id", loginId)
            .single();

          if (duplicate) {
            results.errors.push(`行 ${i + 1}: ログインIDが既に使用されています`);
            continue;
          }

          const passwordHash = await hash(password);

          const { error } = await supabase
            .from("customers")
            .insert({
              shop_id: shopId,
              company_name: companyName,
              login_id: loginId,
              email,
              phone,
              address,
              billing_type: billingType,
              password_hash: passwordHash,
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
        i++;
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

export default customers;

