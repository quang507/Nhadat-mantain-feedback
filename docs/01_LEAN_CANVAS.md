# Lean Canvas — Hệ thống Bảo trì & Phản hồi Ny'ah Phú Định

Phạm vi: 50 căn nhà phố, giai đoạn bàn giao & bảo hành. Người dùng: cư dân/chủ nhà, BQL, đội thợ, chủ đầu tư.

## 1. PROBLEM (3 vấn đề lớn nhất)
1. **Yêu cầu bảo trì trôi trong nhóm Zalo** — không có mã việc, tin nhắn bị lấp, dễ sót hoặc trùng.
2. **Không đo được đội thợ** — không biết ai làm, bao lâu, sửa xong hay phải quay lại lần 2.
3. **Phản hồi cư dân không lưu lại** — nhận xét chỉ nằm trong chat, không tổng hợp được để báo cáo/chốt bảo hành.

### EXISTING ALTERNATIVES (hiện đang giải quyết thế nào)
- Nhóm Zalo + gọi điện trực tiếp cho BQL/thợ.
- Sổ tay/Excel ghi tay của BQL (nếu có).
- Phần mềm quản lý tòa nhà thương mại (CyFeer, BuildingCare…) — nặng và đắt so với quy mô 50 căn.

## 2. SOLUTION
1. **Mã việc (Work Order)** tự sinh cho mỗi yêu cầu: `WO-YYMM-###`, gắn số căn + hạng mục + mức ưu tiên.
2. **QR → web form** (không cần cài app, không cần đăng nhập): cư dân quét là nghiệm thu + chấm sao + ghi nhận xét.
3. **Log bất biến + dashboard**: mọi sự kiện của WO được ghi lại; BQL/sếp xem được SLA, CSAT, tỷ lệ sửa lại.

## 3. UNIQUE VALUE PROPOSITION
> **Quét 1 mã QR là xong biên bản nghiệm thu.** Không app, không tài khoản — mà vẫn có đủ log, đủ số
> để biết thợ làm tốt hay không, và căn nào còn tồn đọng.

### HIGH-LEVEL CONCEPT
*"Grab-rating cho đội bảo trì"* — giữ nguyên thói quen Zalo, chỉ thêm một mã QR ở cuối mỗi việc.

## 4. UNFAIR ADVANTAGE
- Đã có sẵn hạ tầng của Nhà Đạt: Next.js trên Vercel, cơ chế ghi log qua GitHub API, bot thông báo,
  và **dữ liệu chuẩn 50 lô** (`lib/units.ts` của repo chatbot) — không phải nhập lại danh mục căn.
- Quy mô đóng (50 căn, cư dân định danh) → dữ liệu sạch, không cần chống spam phức tạp.
- Chủ đầu tư kiểm soát cả sản phẩm lẫn khâu vận hành hậu mãi → triển khai không phải xin phép bên thứ ba.

## 5. CUSTOMER SEGMENTS
- **Người mua chính:** Chủ đầu tư Nhã Đạt / sếp phụ trách vận hành (người cần số liệu & uy tín thương hiệu).
- **Người dùng:** cư dân 50 căn; BQL/điều phối; đội thợ (điện, nước, ME, hoàn thiện).

### EARLY ADOPTERS
- Các căn đã bàn giao và đang trong thời hạn bảo hành, chủ nhà khó tính, hay báo lỗi (vd. căn 10 — chị Trang).
- BQL đang phải tự tổng hợp báo cáo cho sếp mỗi tuần.

## 6. CHANNELS
- **Zalo** (kênh chính hiện tại): BQL dán link/ảnh QR của WO vào chat.
- **QR dán tại tủ điện/hộp kỹ thuật từng căn** cho việc báo hỏng mới.
- **QR in trên phiếu nghiệm thu giấy** thợ mang theo.
- Nội bộ: thông báo WO mới/quá hạn về nhóm BQL (Telegram đã có sẵn, hoặc Zalo OA nếu duyệt được).

## 7. KEY METRICS
- % WO hoàn thành **đúng SLA** (theo mức ưu tiên).
- **CSAT** trung bình/thợ và /hạng mục (thang 1–5).
- **Tỷ lệ sửa lại (rework)**: WO phải mở lại trong 14 ngày.
- % WO **có phản hồi cư dân** (mục tiêu ≥ 80% — thước đo hệ thống có được dùng thật không).
- Thời gian trung bình từ lúc báo → thợ có mặt → đóng WO.

## 8. COST STRUCTURE
- **Cố định:** hosting (Vercel free/Pro), database (Supabase free tier ở quy mô 50 căn), tên miền phụ.
- **Biến đổi:** tin nhắn Zalo OA/ZNS nếu dùng (tính theo tin — **cần kiểm chứng bảng giá hiện hành**), lưu trữ ảnh.
- **Một lần:** công phát triển MVP, in QR + tem dán 50 căn, đào tạo BQL/thợ.

## 9. REVENUE STREAMS
Đây là **sản phẩm nội bộ → giá trị là chi phí tránh được**, không phải doanh thu trực tiếp:
- Giảm tranh chấp bảo hành nhờ có log + nghiệm thu có xác nhận của cư dân.
- Giảm giờ công BQL tổng hợp báo cáo thủ công.
- Tăng uy tín bàn giao → hỗ trợ bán rổ hàng còn lại & giới thiệu (referral).
- (Tùy chọn về sau) đóng gói lại cho các dự án khác của Nhà Đạt.
