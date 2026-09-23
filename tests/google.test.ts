import { describe, expect, test, beforeAll } from 'bun:test';
import { stateHopLe, taoState } from '../lib/google';

beforeAll(() => {
  process.env.APP_SECRET = 'test-secret-chi-dung-trong-test';
});

describe('chống CSRF khi đăng nhập Google', () => {
  test('state vừa tạo thì hợp lệ', () => {
    expect(stateHopLe(taoState())).toBe(true);
  });

  test('mỗi lần tạo ra một state khác nhau', () => {
    expect(taoState()).not.toBe(taoState());
  });

  test('state bịa hoặc sửa chữ ký đều bị từ chối', () => {
    expect(stateHopLe('abc')).toBe(false);
    expect(stateHopLe('a.b.c')).toBe(false);
    expect(stateHopLe(null)).toBe(false);
    const that = taoState();
    const [nonce, han] = that.split('.');
    expect(stateHopLe(`${nonce}.${han}.0000`)).toBe(false);
  });

  test('state quá hạn bị từ chối', () => {
    const that = taoState();
    const [nonce, , sig] = that.split('.');
    const quaHan = Date.now() - 1000;
    expect(stateHopLe(`${nonce}.${quaHan}.${sig}`)).toBe(false);
  });
});
