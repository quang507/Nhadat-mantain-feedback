// Quy tắc nghiệp vụ: sinh mã việc, tính điểm, xếp mức thưởng cho thợ.
import { CRITERIA, type Feedback, type Ratings, type WorkOrder, type Status } from './types';

/** WO-YYMM-nnn, nnn đánh số lại theo từng tháng (mỗi tháng chỉ vài việc). */
export function nextWoId(existingIds: string[], now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `WO-${yy}${mm}-`;
  const max = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/**
 * Điểm chung = trung bình các tiêu chí khách đã chấm, làm tròn 2 số.
 * Khách bấm "chưa xong" thì không chấm sao -> không có điểm, trả về null.
 */
export function diemTrungBinh(r: Ratings): number | null {
  const vals = CRITERIA.map((c) => r[c.key]).filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / vals.length) * 100) / 100;
}

export type MucThuong = 'A' | 'B' | 'C' | 'khong';

export interface KetQuaThuong {
  muc: MucThuong;
  nhan: string;   // chữ hiển thị cho BQL/sếp
  diem: number | null;
}

/**
 * Xếp mức thưởng từ một lần đánh giá.
 * Khách bấm "chưa xong" thì không xét thưởng, bất kể chấm mấy sao —
 * việc chưa xong thì chưa có gì để thưởng.
 * Số tiền từng mức do sếp quyết, khai trong BONUS_VND bên dưới.
 */
export function xepThuong(fb?: Feedback): KetQuaThuong {
  if (!fb) return { muc: 'khong', nhan: 'Chưa có đánh giá', diem: null };

  const d = diemTrungBinh(fb.ratings);
  if (!fb.daXong) return { muc: 'khong', nhan: 'Khách báo chưa xong — không xét thưởng', diem: d };
  if (d === null) return { muc: 'khong', nhan: 'Khách chưa chấm điểm', diem: null };

  if (d >= 4.75) return { muc: 'A', nhan: 'Mức A — xuất sắc', diem: d };
  if (d >= 4.25) return { muc: 'B', nhan: 'Mức B — tốt', diem: d };
  if (d >= 3.5) return { muc: 'C', nhan: 'Mức C — đạt', diem: d };
  return { muc: 'khong', nhan: 'Dưới chuẩn — BQL xem lại', diem: d };
}

/**
 * Số tiền thưởng mỗi mức (VNĐ), sếp chốt 23/09/2026: dải 100k–500k mỗi việc.
 * Sửa số ở đây là bảng thưởng đổi theo, không phải sửa chỗ nào khác.
 */
export const BONUS_VND: Record<MucThuong, number> = {
  A: 500_000,
  B: 300_000,
  C: 100_000,
  khong: 0,
};

export function tienThuong(muc: MucThuong): number {
  return BONUS_VND[muc] ?? 0;
}

/** Các trạng thái kế tiếp hợp lệ — chặn bấm nhầm thứ tự. */
export const CHUYEN_TRANG_THAI: Record<Status, Status[]> = {
  moi: ['dang_lam'],
  dang_lam: ['cho_danh_gia'],
  cho_danh_gia: ['xong', 'lam_lai'],
  lam_lai: ['dang_lam'],
  xong: [],
};

export function coTheChuyen(tu: Status, den: Status): boolean {
  return CHUYEN_TRANG_THAI[tu]?.includes(den) ?? false;
}

export function dangMo(wo: WorkOrder): boolean {
  return wo.trangThai !== 'xong';
}

/** Số ngày một việc đã mở, để BQL thấy việc nào bị quên. */
export function soNgayMo(wo: WorkOrder, now = new Date()): number {
  const moc = wo.dongLuc ? new Date(wo.dongLuc) : now;
  return Math.floor((moc.getTime() - new Date(wo.taoLuc).getTime()) / 86400000);
}
