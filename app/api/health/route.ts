// Xem nhanh máy chủ đang được cấu hình thế nào. Chỉ trả về có/không,
// không bao giờ trả ra giá trị của khóa nào.
import { NextResponse } from 'next/server';
import { chayTam, dungGithub } from '@/lib/store';
import { coGoogle } from '@/lib/google';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    luuDuLieu: dungGithub() ? 'github' : chayTam() ? 'o-tam-se-mat' : 'thu-muc-local',
    dangNhapGoogle: coGoogle(),
    matKhauDuPhong: Boolean(process.env.ADMIN_PASSWORD),
    baoTelegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    zaloOA: Boolean(process.env.ZALO_OA_ACCESS_TOKEN),
  });
}
