// Google trả người dùng về đây kèm mã; đổi mã lấy email rồi mới cho vào.
import { NextResponse } from 'next/server';
import { COOKIE, optionsCookie, taoPhien } from '@/lib/auth';
import { doiCodeLayEmail, duongDanQuayVe, stateHopLe } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);

  if (url.searchParams.get('error')) {
    return NextResponse.redirect(new URL('/login?loi=huy', req.url));
  }
  if (!stateHopLe(url.searchParams.get('state'))) {
    return NextResponse.redirect(new URL('/login?loi=state', req.url));
  }

  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?loi=thieu-ma', req.url));

  const kq = await doiCodeLayEmail(code, duongDanQuayVe(req));
  if (!kq.ok) {
    return NextResponse.redirect(new URL(`/login?loi=${encodeURIComponent(kq.loi)}`, req.url));
  }

  const res = NextResponse.redirect(new URL('/admin', req.url));
  res.cookies.set(COOKIE, taoPhien(kq.email), optionsCookie());
  return res;
}
