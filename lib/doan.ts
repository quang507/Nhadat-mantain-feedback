// Đoán hạng mục từ câu khách báo, để BQL khỏi phải chọn thêm một ô nữa.
// Đoán sai cũng không sao: BQL sửa được trong phần chi tiết.
import { CATEGORIES } from './types';

const TU_KHOA: Array<[string, string[]]> = [
  ['Cấp thoát nước', ['nước', 'ống', 'bồn', 'vòi', 'rỉ', 'rò', 'tắc', 'cống', 'bơm', 'lavabo', 'bồn cầu']],
  ['Điện', ['điện', 'ổ cắm', 'đèn', 'chập', 'cầu dao', 'aptomat', 'công tắc', 'mất điện', 'cháy bóng']],
  ['Điều hòa / thông gió', ['điều hòa', 'máy lạnh', 'quạt', 'thông gió', 'gió', 'lọc khí']],
  ['Cửa & khóa', ['cửa', 'khóa', 'bản lề', 'tay nắm', 'kẹt cửa', 'chốt']],
  ['Thấm dột', ['thấm', 'dột', 'ẩm', 'mốc', 'ngấm', 'loang']],
  ['Hoàn thiện (sơn, gạch, gỗ)', ['sơn', 'gạch', 'gỗ', 'trần', 'tường', 'sàn', 'bong', 'nứt', 'ron']],
];

export function doanHangMuc(moTa: string): string {
  const s = moTa.toLowerCase();
  for (const [hangMuc, tu] of TU_KHOA) {
    if (tu.some((t) => s.includes(t))) return hangMuc;
  }
  return CATEGORIES[CATEGORIES.length - 1]; // 'Khác'
}
