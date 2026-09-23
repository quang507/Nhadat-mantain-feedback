// Toàn bộ kiểu dữ liệu của hệ thống. Cố ý gọn: mỗi tháng chỉ 1-2 việc,
// thêm trường nào cũng là thêm ô mà BQL phải điền, nên chỉ giữ thứ thực sự dùng.

export type Status =
  | 'moi'          // vừa tiếp nhận, chưa giao thợ
  | 'dang_lam'     // đã giao thợ, đang xử lý
  | 'cho_danh_gia' // thợ báo xong, chờ khách đánh giá
  | 'xong'         // khách xác nhận xong
  | 'lam_lai';     // khách báo chưa xong -> quay lại đội thợ

export const STATUS_LABEL: Record<Status, string> = {
  moi: 'Mới tiếp nhận',
  dang_lam: 'Đang xử lý',
  cho_danh_gia: 'Chờ khách đánh giá',
  xong: 'Đã xong',
  lam_lai: 'Khách báo chưa xong',
};

export type Channel = 'zalo' | 'hotline' | 'truc_tiep';

export const CHANNEL_LABEL: Record<Channel, string> = {
  zalo: 'Zalo OA',
  hotline: 'Gọi hotline',
  truc_tiep: 'Báo trực tiếp',
};

export const CATEGORIES = [
  'Điện',
  'Cấp thoát nước',
  'Điều hòa / thông gió',
  'Cửa & khóa',
  'Thấm dột',
  'Hoàn thiện (sơn, gạch, gỗ)',
  'Khác',
] as const;

/** 4 tiêu chí chấm thợ. Thứ tự này cũng là thứ tự hiển thị trên form của khách. */
export const CRITERIA = [
  { key: 'dung_hen', label: 'Đến đúng hẹn' },
  { key: 'thai_do', label: 'Thái độ, tác phong' },
  { key: 'chat_luong', label: 'Chất lượng sửa chữa' },
  { key: 've_sinh', label: 'Dọn vệ sinh sau khi làm' },
] as const;

export type CriteriaKey = (typeof CRITERIA)[number]['key'];

export type Ratings = Partial<Record<CriteriaKey, number>>; // mỗi tiêu chí 1..5

/** Lời nhắn bằng giọng nói của khách - file nằm riêng, đây chỉ là mô tả. */
export interface VoiceNote {
  duoi: string;   // 'webm' | 'mp4' | 'ogg' - iPhone và Android ghi ra định dạng khác nhau
  mime: string;
  giay: number;   // độ dài, để BQL biết trước khi bấm nghe
}

export interface Feedback {
  daXong: boolean;          // "việc đã xong chưa" - câu quan trọng nhất
  ratings: Ratings;         // khách bấm "chưa xong" thì bỏ trống, không bắt chấm sao
  yKien: string;
  voice?: VoiceNote;
  nguoiDanhGia: string;     // tên người nhận xét, vd "Chị Trang"
  luc: string;              // ISO time
  jti: string;              // id của token đã dùng -> mỗi link chỉ gửi được một lần
}

export interface LogEntry {
  luc: string;    // ISO time
  ai: string;     // 'BQL' | 'Khách' | 'Hệ thống'
  viec: string;   // mô tả việc đã xảy ra
}

export interface WorkOrder {
  id: string;             // WO-YYMM-nnn
  unitId: number;         // 1..50
  khach: string;          // tên khách, vd "Chị Trang"
  sdt: string;
  kenh: Channel;
  zaloUserId?: string;    // có khi khách nhắn qua OA -> gửi form đánh giá thẳng cho đúng người
  hangMuc: string;
  moTa: string;
  tho: string;            // tên thợ, nhập tay - đội vài người, không cần bảng riêng
  trangThai: Status;
  taoLuc: string;
  xongLuc?: string;       // lúc thợ báo xong
  dongLuc?: string;       // lúc khách xác nhận xong
  token?: string;         // link đánh giá đang phát cho khách (giữ lại để mở QR lần sau)
  feedback?: Feedback;
  log: LogEntry[];        // chỉ ghi thêm, không sửa/xóa
}

export interface ZaloInboxItem {
  zaloUserId: string;
  ten: string;
  tinNhan: string;
  luc: string;
  daXuLy: boolean;   // đã tạo việc từ tin này chưa
}
