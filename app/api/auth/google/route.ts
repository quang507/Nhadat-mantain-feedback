// Bấm "Đăng nhập bằng Google" -> chuyển sang Google.
import { NextResponse } from 'next/server';
import { coGoogle, duongDanQuayVe, taoState, urlDangNhap } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!coGoogle()) {
    return NextResponse.redirect(new URL('/login?loi=chua-cau-hinh', req.url));
  }
  return NextResponse.redirect(urlDangNhap(duongDanQuayVe(req), taoState()));
}
