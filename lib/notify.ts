// Gửi thông báo. Hai đường riêng biệt, cố ý:
//  - Khách: Zalo OA (nếu đã cấu hình). Không gửi được thì KHÔNG coi là lỗi hệ thống -
//    BQL copy link dán vào Zalo như vẫn làm. Cả hệ thống không được chết vì OA.
//  - BQL: Telegram, vì miễn phí và không phải xin duyệt template.
export interface KetQuaGui {
  ok: boolean;
  ghiChu: string;
}

export async function guiZaloOA(zaloUserId: string, text: string): Promise<KetQuaGui> {
  const token = process.env.ZALO_OA_ACCESS_TOKEN;
  if (!token) return { ok: false, ghiChu: 'Chưa cấu hình Zalo OA - BQL gửi link tay' };

  try {
    const res = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: token },
      body: JSON.stringify({ recipient: { user_id: zaloUserId }, message: { text } }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: number; message?: string };
    if (!res.ok || (json.error && json.error !== 0)) {
      return { ok: false, ghiChu: `Zalo OA trả lỗi: ${json.message || res.status}` };
    }
    return { ok: true, ghiChu: 'Đã gửi qua Zalo OA' };
  } catch (err) {
    return { ok: false, ghiChu: `Gọi Zalo OA hỏng: ${String(err)}` };
  }
}

export async function baoBQL(text: string): Promise<KetQuaGui> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, ghiChu: 'Chưa cấu hình Telegram' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return res.ok ? { ok: true, ghiChu: 'Đã báo Telegram' } : { ok: false, ghiChu: `Telegram lỗi ${res.status}` };
  } catch (err) {
    return { ok: false, ghiChu: `Gọi Telegram hỏng: ${String(err)}` };
  }
}
