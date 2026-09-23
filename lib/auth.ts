// Đăng nhập trang quản trị: một mật khẩu dùng chung cho BQL.
// Vài người dùng, mỗi tháng vài việc - dựng hệ thống tài khoản ở đây là tự làm khổ mình.
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'ndm_admin';
const HAN_GIO = 12;

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error('Thiếu APP_SECRET - xem .env.example');
  return s;
}

export function taoPhien(): string {
  const exp = Date.now() + HAN_GIO * 3600_000;
  const sig = createHmac('sha256', secret()).update(`admin:${exp}`).digest('hex');
  return `${exp}.${sig}`;
}

export function phienHopLe(value: string | undefined): boolean {
  if (!value) return false;
  const [expRaw, sig] = value.split('.');
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  const expected = createHmac('sha256', secret()).update(`admin:${exp}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
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
