import { describe, expect, test, beforeAll } from 'bun:test';
import { nextWoId, diemTrungBinh, xepThuong, coTheChuyen } from '../lib/wo';
import type { Feedback, Ratings } from '../lib/types';

beforeAll(() => {
  process.env.APP_SECRET = 'test-secret-chi-dung-trong-test';
});

const r = (a: number, b: number, c: number, d: number): Ratings => ({
  dung_hen: a, thai_do: b, chat_luong: c, ve_sinh: d,
});

const fb = (daXong: boolean, ratings: Ratings): Feedback => ({
  daXong, ratings, yKien: '', nguoiDanhGia: 'Chị Trang', luc: new Date().toISOString(), jti: 'x',
});

describe('mã việc', () => {
  test('bắt đầu từ 001 trong tháng mới', () => {
    expect(nextWoId([], new Date('2026-09-23'))).toBe('WO-2609-001');
  });

  test('đếm tiếp trong cùng tháng, bỏ qua mã tháng khác', () => {
    const ids = ['WO-2609-001', 'WO-2609-007', 'WO-2608-009'];
    expect(nextWoId(ids, new Date('2026-09-23'))).toBe('WO-2609-008');
  });
});

describe('điểm và mức thưởng', () => {
  test('điểm là trung bình 4 tiêu chí', () => {
    expect(diemTrungBinh(r(5, 5, 4, 4))).toBe(4.5);
    expect(diemTrungBinh(r(5, 4, 4, 4))).toBe(4.25);
  });

  test('xếp mức theo ngưỡng', () => {
    expect(xepThuong(fb(true, r(5, 5, 5, 4))).muc).toBe('A');   // 4.75
    expect(xepThuong(fb(true, r(5, 4, 4, 4))).muc).toBe('B');   // 4.25
    expect(xepThuong(fb(true, r(4, 4, 3, 3))).muc).toBe('C');   // 3.5
    expect(xepThuong(fb(true, r(3, 3, 3, 3))).muc).toBe('khong');
  });

  test('khách báo chưa xong thì không xét thưởng dù chấm cao', () => {
    const kq = xepThuong(fb(false, r(5, 5, 5, 5)));
    expect(kq.muc).toBe('khong');
    expect(kq.diem).toBe(5);
  });

  test('chưa có đánh giá thì không có điểm', () => {
    expect(xepThuong(undefined).diem).toBeNull();
  });
});

describe('chuyển trạng thái', () => {
  test('đi đúng đường thì cho', () => {
    expect(coTheChuyen('moi', 'dang_lam')).toBe(true);
    expect(coTheChuyen('dang_lam', 'cho_danh_gia')).toBe(true);
    expect(coTheChuyen('cho_danh_gia', 'lam_lai')).toBe(true);
    expect(coTheChuyen('lam_lai', 'dang_lam')).toBe(true);
  });

  test('nhảy cóc hoặc mở lại việc đã đóng thì chặn', () => {
    expect(coTheChuyen('moi', 'xong')).toBe(false);
    expect(coTheChuyen('dang_lam', 'xong')).toBe(false);
    expect(coTheChuyen('xong', 'dang_lam')).toBe(false);
  });
});
