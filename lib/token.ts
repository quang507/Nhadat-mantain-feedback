// Token cho link đánh giá gửi khách: không cần đăng nhập, nhưng phải chặn
// (1) người ngoài tự chế link, (2) gửi đánh giá hai lần, (3) link cũ dùng lại sau nhiều tháng.
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const HAN_NGAY = 30; // khách hay đi vắng vài ngày; 30 ngày là đủ rộng mà vẫn có hạn

export interface TokenPayload {
  wo: string;   // mã việc
  jti: string;  // id riêng của link này -> lưu lại khi đã dùng
  exp: number;  // epoch giây
}

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error('Thiếu APP_SECRET - xem .env.example');
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(data: string): string {
  return b64url(createHmac('sha256', secret()).update(data).digest());
}

export function createToken(woId: string, hanNgay = HAN_NGAY): string {
  const payload: TokenPayload = {
    wo: woId,
    jti: randomBytes(8).toString('hex'),
    exp: Math.floor(Date.now() / 1000) + hanNgay * 86400,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

export type TokenResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; ly_do: 'sai' | 'het_han' };

export function readToken(token: string): TokenResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, ly_do: 'sai' };
  const [body, sig] = parts;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, ly_do: 'sai' };

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  } catch {
    return { ok: false, ly_do: 'sai' };
  }
  if (!payload?.wo || !payload?.jti || typeof payload.exp !== 'number') return { ok: false, ly_do: 'sai' };
  if (payload.exp * 1000 < Date.now()) return { ok: false, ly_do: 'het_han' };

  return { ok: true, payload };
}
