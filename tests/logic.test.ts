import { describe, expect, test, beforeAll } from 'bun:test';
import { nextWoId, diemTrungBinh, xepThuong, coTheChuyen, tienThuong } from '../lib/wo';
import type { Feedback, Ratings } from '../lib/types';
import { doanHangMuc } from '../lib/doan';

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

describe('khách báo chưa xong', () => {
  test('không chấm sao thì không có điểm, không xét thưởng', () => {
    const fbChuaXong: Feedback = {
      daXong: false, ratings: {}, yKien: 'Còn rỉ nước',
      nguoiDanhGia: 'Chị Trang', luc: new Date().toISOString(), jti: 'y',
    };
    expect(diemTrungBinh(fbChuaXong.ratings)).toBeNull();
    const kq = xepThuong(fbChuaXong);
    expect(kq.muc).toBe('khong');
    expect(kq.diem).toBeNull();
  });

  test('chấm thiếu mục thì tính trung bình trên các mục đã chấm', () => {
    expect(diemTrungBinh({ dung_hen: 5, thai_do: 4 })).toBe(4.5);
  });
});

describe('tiền thưởng', () => {
  test('mỗi mức ra đúng số tiền sếp chốt', () => {
    expect(tienThuong('A')).toBe(500_000);
    expect(tienThuong('B')).toBe(300_000);
    expect(tienThuong('C')).toBe(100_000);
    expect(tienThuong('khong')).toBe(0);
  });
});

describe('đoán hạng mục từ câu khách báo', () => {
  test('bắt đúng vài câu hay gặp', () => {
    expect(doanHangMuc('Rò nước nhà tắm tầng 2')).toBe('Cấp thoát nước');
    expect(doanHangMuc('Ổ cắm bếp không có điện')).toBe('Điện');
    expect(doanHangMuc('Máy lạnh phòng ngủ không mát')).toBe('Điều hòa / thông gió');
    expect(doanHangMuc('Cửa phòng tắm bị kẹt')).toBe('Cửa & khóa');
    expect(doanHangMuc('Trần bị thấm sau mưa')).toBe('Thấm dột');
  });

  test('không đoán được thì trả về Khác, không đoán bừa', () => {
    expect(doanHangMuc('Nhờ BQL qua xem giúp một chút')).toBe('Khác');
  });
});
