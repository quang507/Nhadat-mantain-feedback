// Đăng nhập trang quản trị: một mật khẩu dùng chung cho BQL.
// Vài người dùng, mỗi tháng vài việc - dựng hệ thống tài khoản ở đây là tự làm khổ mình.
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'ndm_admin';
/** Giữ đăng nhập 30 ngày. Máy mất thì đổi APP_SECRET là mọi phiên hết hiệu lực ngay. */
export const HAN_NGAY = 30;

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error('Thiếu APP_SECRET - xem .env.example');
  return s;
}

/** Phiên ghi luôn ai đang đăng nhập, để trang quản trị biết mà hiện tên. */
export function taoPhien(ai = 'BQL'): string {
  const exp = Date.now() + HAN_NGAY * 86_400_000;
  const nguoi = Buffer.from(ai).toString('base64url');
  const sig = createHmac('sha256', secret()).update(`${nguoi}:${exp}`).digest('hex');
  return `${nguoi}.${exp}.${sig}`;
}

export function docPhien(value: string | undefined): { ai: string } | null {
  if (!value) return null;
  const phan = value.split('.');
  if (phan.length !== 3) return null;
  const [nguoi, expRaw, sig] = phan;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return null;
  const mong = createHmac('sha256', secret()).update(`${nguoi}:${exp}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(mong);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return { ai: Buffer.from(nguoi, 'base64url').toString('utf8') };
  } catch {
    return null;
  }
}

export function phienHopLe(value: string | undefined): boolean {
  return docPhien(value) !== null;
}

/** Kiểm tra mật khẩu nhập vào, so sánh kiểu không lộ thời gian. */
export function dungMatKhau(nhap: string): boolean {
  const thuc = process.env.ADMIN_PASSWORD || '';
  if (!thuc) return false;
  const a = Buffer.from(nhap);
  const b = Buffer.from(thuc);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function daDangNhap(): boolean {
  return phienHopLe(cookies().get(COOKIE)?.value);
}

/** Tên/email người đang đăng nhập, để hiện ở góc trang quản trị. */
export function aiDangDangNhap(): string | null {
  return docPhien(cookies().get(COOKIE)?.value)?.ai ?? null;
}

export function optionsCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: HAN_NGAY * 86_400,
  };
}
