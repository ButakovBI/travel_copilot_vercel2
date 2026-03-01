const SMS_RU_URL = "https://sms.ru/sms/send";

export interface SmsSender {
  send(phone: string, text: string): Promise<{ success: boolean; error?: string }>;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  return digits;
}

export async function sendSms(phone: string, text: string): Promise<{ success: boolean; error?: string }> {
  const apiId = process.env.SMS_RU_API_ID ?? process.env.SMS_RU_API_KEY;
  if (!apiId) {
    return { success: false, error: "SMS_RU_API_ID не настроен" };
  }

  const to = normalizePhone(phone);
  const params = new URLSearchParams({
    api_id: apiId,
    to: to,
    msg: text,
    json: "1",
  });

  try {
    const res = await fetch(`${SMS_RU_URL}?${params.toString()}`);
    const data = (await res.json()) as { status: string; status_code?: number; status_text?: string };
    const ok = data.status === "OK" || data.status_code === 100;
    return {
      success: ok,
      error: ok ? undefined : (data.status_text ?? data.status ?? "Ошибка отправки СМС"),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сети";
    return { success: false, error: message };
  }
}
