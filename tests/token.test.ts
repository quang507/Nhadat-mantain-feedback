import { describe, expect, test, beforeAll } from 'bun:test';
import { createToken, readToken } from '../lib/token';

beforeAll(() => {
  process.env.APP_SECRET = 'test-secret-chi-dung-trong-test';
});

describe('token link đánh giá', () => {
  test('token vừa tạo đọc lại được đúng mã việc', () => {
    const t = createToken('WO-2609-014');
    const kq = readToken(t);
    expect(kq.ok).toBe(true);
    if (kq.ok) expect(kq.payload.wo).toBe('WO-2609-014');
  });

  test('mỗi token có jti riêng', () => {
    const a = readToken(createToken('WO-2609-014'));
    const b = readToken(createToken('WO-2609-014'));
    expect(a.ok && b.ok && a.payload.jti !== b.payload.jti).toBe(true);
  });

  test('sửa nội dung token thì hỏng chữ ký', () => {
    const t = createToken('WO-2609-014');
    const [body, sig] = t.split('.');
    const doi = Buffer.from(JSON.stringify({ wo: 'WO-2609-999', jti: 'x', exp: 99999999999 }))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const kq = readToken(`${doi}.${sig}`);
    expect(kq.ok).toBe(false);
    expect(body.length > 0).toBe(true);
  });

  test('token hết hạn bị từ chối, có nêu lý do', () => {
    const t = createToken('WO-2609-014', -1); // hết hạn từ hôm qua
    const kq = readToken(t);
    expect(kq.ok).toBe(false);
    if (!kq.ok) expect(kq.ly_do).toBe('het_han');
  });

  test('chuỗi bậy bạ không lọt', () => {
    expect(readToken('abc').ok).toBe(false);
    expect(readToken('abc.def').ok).toBe(false);
    expect(readToken('').ok).toBe(false);
  });
});
