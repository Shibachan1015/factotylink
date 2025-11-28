// Slack通知サービス

const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

export async function sendSlackNotification(message: string): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("SLACK_WEBHOOK_URLが設定されていません");
    return;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack通知の送信に失敗しました: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Slack notification error:", error);
    throw error;
  }
}

export async function notifyNewOrder(orderNumber: string, customerName: string, totalAmount: number): Promise<void> {
  const message = `🆕 新規注文が入りました\n注文番号: ${orderNumber}\n得意先: ${customerName}\n合計金額: ¥${totalAmount.toLocaleString()}`;
  await sendSlackNotification(message);
}

