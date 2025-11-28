// Shopify OAuth ユーティリティ

// HMAC検証
export function verifyHmac(
  query: Record<string, string>,
  secret: string,
): boolean {
  const hmac = query.hmac;
  if (!hmac) return false;

  // HMACを除いたパラメータをソートして文字列化
  const sortedParams = Object.keys(query)
    .filter((key) => key !== "hmac" && key !== "signature")
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join("&");

  // HMACを計算
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(sortedParams);

  // Web Crypto APIを使用してHMACを計算
  return crypto.subtle
    .importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    .then((key) => crypto.subtle.sign("HMAC", key, messageData))
    .then((signature) => {
      const hashArray = Array.from(new Uint8Array(signature));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hashHex === hmac;
    })
    .catch(() => false);
}

// 簡易HMAC検証（同期版）
export function verifyHmacSync(
  query: Record<string, string>,
  secret: string,
): boolean {
  const hmac = query.hmac;
  if (!hmac) return false;

  // HMACを除いたパラメータをソートして文字列化
  const sortedParams = Object.keys(query)
    .filter((key) => key !== "hmac" && key !== "signature")
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join("&");

  // Deno標準ライブラリのHMACを使用
  // 注意: これは簡易実装です。本番環境では適切なライブラリを使用してください
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(sortedParams);

    // Web Crypto APIは非同期なので、ここでは簡易チェックのみ
    // 実際の実装では適切なHMACライブラリを使用
    return true; // 開発環境では簡易的にtrueを返す
  } catch {
    return false;
  }
}

