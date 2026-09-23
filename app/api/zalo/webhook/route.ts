// Nhận sự kiện từ Zalo OA. Việc duy nhất ở đây: ghi lại "ai vừa nhắn gì" vào hộp thư,
// kèm user_id, để BQL bấm một cái là tạo việc với đúng tên khách — và sau đó gửi form
// đánh giá thẳng cho chính người đó, không phải hỏi lại "chị là chị nào".
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { layInbox, luuInbox } from '@/lib/store';
import type { ZaloInboxItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Zalo ký payload bằng SHA-256 của appId + data + timestamp + OASecretKey. */
function chuKyHopLe(raw: string, mac: string | null): boolean {
  const secret = process.env.ZALO_OA_SECRET;
  if (!secret || !mac) return false;
  const tinh = createHmac('sha256', secret).update(raw).digest('hex');
  return mac === tinh;
}

export async function POST(req: Request) {
  // Chưa cấu hình OA thì đóng hẳn cửa này: để mở mà không kiểm chữ ký thì ai
  // biết địa chỉ cũng ghi rác vào hộp thư của BQL.
  if (!process.env.ZALO_OA_SECRET) {
    return NextResponse.json({ loi: 'Chưa cấu hình Zalo OA' }, { status: 503 });
  }

  const raw = await req.text();
  if (!chuKyHopLe(raw, req.headers.get('x-zevent-signature'))) {
    return NextResponse.json({ loi: 'Chữ ký không hợp lệ' }, { status: 401 });
  }

  let ev: Record<string, any>;
  try {
    ev = JSON.parse(raw);
  } catch {
    return NextResponse.json({ loi: 'Payload không đọc được' }, { status: 400 });
  }

  const userId = String(ev?.sender?.id || '');
  const text = String(ev?.message?.text || '').slice(0, 500);
  if (!userId || !text) return NextResponse.json({ ok: true }); // sự kiện khác (follow, ảnh…) — bỏ qua

  const item: ZaloInboxItem = {
    zaloUserId: userId,
    ten: String(ev?.sender?.name || '').slice(0, 80) || `Khách ${userId.slice(-4)}`,
    tinNhan: text,
    luc: new Date().toISOString(),
    daXuLy: false,
  };

  const inbox = await layInbox();
  await luuInbox([item, ...inbox]);

  return NextResponse.json({ ok: true });
}
