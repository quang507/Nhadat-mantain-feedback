// Danh sách 50 lô của Ny'ah Phú Định.
// Nguồn: lib/units.ts của repo quang507/nhadat-chatbot (Data_productlist.xlsx).
// Tên + SĐT chủ hộ KHÔNG nằm ở đây: BQL nhập trong trang quản trị, lưu cùng dữ liệu vận hành,
// vì đó là thông tin cá nhân và còn thay đổi khi sang nhượng.

export interface Unit {
  id: number;      // 1..50
  model: string;   // mẫu nhà, để BQL nhận ra đúng căn
  dtDat: number;   // m2 đất
}

export const UNITS: Unit[] = [
  { id: 1, model: 'Office 1', dtDat: 67.3 },
  { id: 2, model: 'Office 1', dtDat: 62.9 },
  { id: 3, model: 'Cosmo v2', dtDat: 49 },
  { id: 4, model: 'Fusion Gen 5 v2', dtDat: 42.9 },
  { id: 5, model: 'Fusion Gen 5 v2', dtDat: 43.1 },
  { id: 6, model: 'Fusion Gen 5 v2', dtDat: 43.3 },
  { id: 7, model: 'Fusion Gen 5 v2', dtDat: 43.5 },
  { id: 8, model: 'Fusion Gen 5 v2', dtDat: 43.8 },
  { id: 9, model: 'Fusion Gen 5 v2', dtDat: 43.9 },
  { id: 10, model: 'Fusion Gen 5 v2', dtDat: 44.2 },
  { id: 11, model: 'Fusion Gen 5 v2', dtDat: 44.4 },
  { id: 12, model: 'Fusion Gen 5 v2', dtDat: 44.6 },
  { id: 13, model: 'Fusion Gen 4 v4', dtDat: 44.8 },
  { id: 14, model: 'Cosmo Gen 2', dtDat: 54.7 },
  { id: 15, model: 'Opus v3', dtDat: 77.5 },
  { id: 16, model: 'Opus v3', dtDat: 74.7 },
  { id: 17, model: 'Opus v3', dtDat: 71.9 },
  { id: 18, model: 'Opus v3', dtDat: 55.4 },
  { id: 19, model: 'Cashmere', dtDat: 65.9 },
  { id: 20, model: 'Opus v3', dtDat: 61.8 },
  { id: 21, model: 'Opus v3', dtDat: 57.5 },
  { id: 22, model: 'Cashmere', dtDat: 73.8 },
  { id: 23, model: 'Cashmere', dtDat: 69.6 },
  { id: 24, model: 'Opus v3', dtDat: 73.5 },
  { id: 25, model: 'Office 2', dtDat: 64.5 },
  { id: 26, model: 'Office 2', dtDat: 91.8 },
  { id: 27, model: 'Fusion 2MT Gen 5', dtDat: 49.2 },
  { id: 28, model: 'Fusion 2MT Gen 5', dtDat: 47.3 },
  { id: 29, model: 'Fusion 2MT Gen 4 v4', dtDat: 45.4 },
  { id: 30, model: 'Fusion 2MT Gen 4 v4', dtDat: 44.5 },
  { id: 31, model: 'Fusion 2MT Gen 5', dtDat: 44.3 },
  { id: 32, model: 'Fusion 2MT Gen 4 v3', dtDat: 44 },
  { id: 33, model: 'Fusion 2MT Gen 4 v3', dtDat: 43.8 },
  { id: 34, model: 'Fusion 2MT Gen 4 v3', dtDat: 43.5 },
  { id: 35, model: 'Fusion 2MT Gen 5', dtDat: 43.3 },
  { id: 36, model: 'Fusion Gen 5 v2', dtDat: 43.1 },
  { id: 37, model: 'Cosmo Gen 2', dtDat: 54 },
  { id: 38, model: 'Cosmo', dtDat: 43.8 },
  { id: 39, model: 'Cosmo Gen 2', dtDat: 43.8 },
  { id: 40, model: 'Cosmo Gen 2', dtDat: 43.8 },
  { id: 41, model: 'Cosmo Gen 2', dtDat: 43.8 },
  { id: 42, model: 'Cosmo Gen 2', dtDat: 43.8 },
  { id: 43, model: 'Signature v2', dtDat: 55.8 },
  { id: 44, model: 'Signature v2', dtDat: 55.8 },
  { id: 45, model: 'Cosmo v2', dtDat: 43.8 },
  { id: 46, model: 'Cosmo Gen 2', dtDat: 43.8 },
  { id: 47, model: 'Cosmo v2', dtDat: 43.8 },
  { id: 48, model: 'Cosmo Gen 2', dtDat: 43.8 },
  { id: 49, model: 'Cosmo v2', dtDat: 43.8 },
  { id: 50, model: 'Cosmo Gen 2', dtDat: 57 },
];

export function getUnit(id: number): Unit | undefined {
  return UNITS.find((u) => u.id === id);
}

export function isValidUnit(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= 50;
}
