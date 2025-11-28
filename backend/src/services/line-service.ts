// LINE通知サービス

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");

export async function sendLineNotification(message: string): Promise<void> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("LINE_CHANNEL_ACCESS_TOKENが設定されていません");
    return;
  }

  try {
    // LINE Notify APIを使用
    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`LINE通知の送信に失敗しました: ${response.statusText}`);
    }
  } catch (error) {
    console.error("LINE notification error:", error);
    throw error;
  }
}

export async function notifyNewOrder(orderNumber: string, customerName: string, totalAmount: number): Promise<void> {
  const message = `🆕 新規注文が入りました\n注文番号: ${orderNumber}\n得意先: ${customerName}\n合計金額: ¥${totalAmount.toLocaleString()}`;
  await sendLineNotification(message);
}

export async function notifyOrderStatusChange(orderNumber: string, status: string, customerName: string): Promise<void> {
  const statusLabels: Record<string, string> = {
    new: "新規",
    manufacturing: "製造中",
    completed: "製造完了",
    shipped: "出荷済み",
  };

  const message = `📦 注文ステータスが更新されました\n注文番号: ${orderNumber}\nステータス: ${statusLabels[status] || status}\n得意先: ${customerName}`;
  await sendLineNotification(message);
}

