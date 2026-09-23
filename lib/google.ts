// Đăng nhập bằng Google, chỉ nhận email @nhadat.company.
// Không dùng thư viện: luồng OAuth chỉ có hai bước, tự viết thì ít thứ phải theo dõi hơn.
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

export const DOMAIN = process.env.GOOGLE_HD || 'nhadat.company';

export function coGoogle(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error('Thiếu APP_SECRET - xem .env.example');
  return s;
}

/** state chống CSRF: chuỗi ngẫu nhiên có chữ ký, không cần lưu ở server. */
export function taoState(): string {
  const nonce = randomBytes(12).toString('hex');
  const han = Date.now() + 10 * 60_000;   // đi Google rồi quay lại, 10 phút là rộng
  const data = `${nonce}.${han}`;
  return `${data}.${createHmac('sha256', secret()).update(data).digest('hex')}`;
}

export function stateHopLe(state: string | null): boolean {
  if (!state) return false;
  const phan = state.split('.');
  if (phan.length !== 3) return false;
  const [nonce, hanRaw, sig] = phan;
  const han = Number(hanRaw);
  if (!Number.isFinite(han) || han < Date.now()) return false;
  const mong = createHmac('sha256', secret()).update(`${nonce}.${han}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(mong);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Địa chỉ Google trả người dùng về, suy ra từ chính request để chạy đúng ở cả local lẫn Vercel. */
export function duongDanQuayVe(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') || url.host;
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}/api/auth/google/callback`;
}

export function urlDangNhap(redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    hd: DOMAIN,              // gợi ý Google chỉ hiện tài khoản trong công ty
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export type KetQuaDangNhap =
  | { ok: true; email: string; ten: string }
  | { ok: false; loi: string };

/** Đổi code lấy token rồi hỏi lại Google xem token đó của ai - không tự giải mã JWT. */
export async function doiCodeLayEmail(code: string, redirectUri: string): Promise<KetQuaDangNhap> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return { ok: false, loi: 'Google không đổi được mã đăng nhập' };

  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) return { ok: false, loi: 'Google không trả về thông tin tài khoản' };

  // Hỏi Google xác nhận token: tránh tự đọc JWT rồi quên kiểm chữ ký.
  const kt = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!kt.ok) return { ok: false, loi: 'Không xác minh được tài khoản Google' };

  const tt = (await kt.json()) as {
    aud?: string; email?: string; email_verified?: string | boolean; hd?: string; name?: string; exp?: string;
  };

  if (tt.aud !== process.env.GOOGLE_CLIENT_ID) return { ok: false, loi: 'Token không thuộc ứng dụng này' };
  if (Number(tt.exp) * 1000 < Date.now()) return { ok: false, loi: 'Phiên đăng nhập Google đã hết hạn' };
  if (tt.email_verified !== 'true' && tt.email_verified !== true) {
    return { ok: false, loi: 'Email Google chưa được xác minh' };
  }

  const email = String(tt.email || '').toLowerCase();
  // Kiểm cả hd lẫn đuôi email: hd là trường Google khẳng định, đuôi email là lớp thứ hai.
  if (tt.hd !== DOMAIN || !email.endsWith(`@${DOMAIN}`)) {
    return { ok: false, loi: `Chỉ tài khoản @${DOMAIN} mới vào được trang này` };
  }

  return { ok: true, email, ten: String(tt.name || email.split('@')[0]) };
}
