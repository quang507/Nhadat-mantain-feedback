// Xem nhanh máy chủ đang được cấu hình thế nào. Chỉ trả về có/không,
// không bao giờ trả ra giá trị của khóa nào.
import { NextResponse } from 'next/server';
import { chayTam, dungGithub, thuGhi } from '@/lib/store';
import { coGoogle } from '@/lib/google';
import { daDangNhap } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Ai cũng xem được phần cấu hình (chỉ có/không). Riêng phép thử ghi thì phải
  // đăng nhập, vì nó tạo một commit thật và lời báo lỗi có thể lộ chuyện bên trong.
  const url = new URL(req.url);
  const thu = url.searchParams.get('thu') === 'ghi';
  const ketQuaGhi = thu && daDangNhap() ? await thuGhi() : null;

  return NextResponse.json({
    luuDuLieu: dungGithub() ? 'github' : chayTam() ? 'o-tam-se-mat' : 'thu-muc-local',
    dangNhapGoogle: coGoogle(),
    matKhauDuPhong: Boolean(process.env.ADMIN_PASSWORD),
    baoTelegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    zaloOA: Boolean(process.env.ZALO_OA_ACCESS_TOKEN),
    ...(thu && !daDangNhap() ? { thuGhi: 'cần đăng nhập' } : {}),
    ...(ketQuaGhi ? { thuGhi: ketQuaGhi } : {}),
  });
}
