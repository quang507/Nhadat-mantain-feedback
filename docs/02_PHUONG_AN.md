# Phương án triển khai — Bảo trì & Phản hồi Ny'ah Phú Định

Người lập: BA. Ngày: 2026-09-23. Trạng thái: **chờ sếp chốt hướng**.

---

## 1. Yêu cầu gốc từ sếp (diễn giải lại)

> "Khi có khách trong khu dân cư Ny'ah Phú Định (50 căn), làm việc chủ yếu qua Zalo, mỗi lần lưu log,
> lấy ý kiến công việc căn số 10 — nhận xét đã xong chưa, người nhận xét là chị Trang.
> Tạo QR, quét là web nhảy lên form để lấy nhận xét, có thể lưu lại."

Bóc thành 5 yêu cầu nghiệp vụ:

| # | Yêu cầu | Diễn giải |
|---|---------|-----------|
| BR-1 | Mã hóa công việc | Mỗi việc bảo trì có một **Work Order (WO)** định danh, gắn số căn (1–50) |
| BR-2 | Giữ Zalo làm kênh | Không bắt cư dân cài app; Zalo vẫn là nơi trao đổi, hệ thống chỉ nhận link/QR |
| BR-3 | QR → form web | Quét QR mở form **không cần đăng nhập**, biết sẵn WO/căn/người nhận xét |
| BR-4 | Nội dung nhận xét | Tối thiểu: **đã xong chưa** (Có/Chưa) + **sao 1–5** + ý kiến + ảnh (tùy chọn) |
| BR-5 | Lưu log | Mọi sự kiện lưu lại, tra được theo căn/thợ/thời gian, xuất được báo cáo |

**Ngoài phạm vi (giai đoạn 1):** thu phí/thanh toán, chấm công thợ, quản lý kho vật tư, app native.

---

## 2. Ba phương án

### Phương án A — Google Sheet + Google Form + QR tĩnh
Form Google sẵn có, QR trỏ tới form có prefill số căn; dữ liệu về Sheet.

- **Ưu:** dựng trong 1 ngày, gần như 0 đồng, sếp xem Sheet trực tiếp.
- **Nhược:** không có khái niệm WO (không nối được yêu cầu ↔ nghiệm thu), không kiểm soát trạng thái,
  không tính được SLA tự động, giao diện không mang thương hiệu, khó chống điền trùng/điền bừa.
- **Hợp khi:** cần chạy thử ngay trong tuần để lấy cảm nhận, chấp nhận làm lại sau.

### Phương án B — Web app riêng, log ghi vào nhánh GitHub (tái dùng đúng pattern chatbot)
Next.js trên Vercel; mỗi WO là một bản ghi JSON commit vào nhánh log, y như `lib/logs.ts` của repo chatbot.

- **Ưu:** đúng hạ tầng đội đang chạy, không thêm dịch vụ mới, log bất biến có lịch sử commit, 0 đồng.
- **Nhược:** GitHub **không phải database** — truy vấn/lọc/thống kê phải tự xử lý, ghi đồng thời dễ xung đột,
  **ảnh chụp hiện trường không hợp để nhét vào repo**, cần GITHUB_TOKEN có quyền ghi.
- **Hợp khi:** khối lượng rất thấp và chấp nhận báo cáo thủ công.

### Phương án C — Web app riêng + Supabase (Postgres + Storage) ✅ **khuyến nghị**
Next.js trên Vercel (cùng chuẩn với chatbot), dữ liệu WO/feedback trong Postgres, ảnh trong Supabase Storage.

- **Ưu:** có trạng thái WO đúng nghĩa, truy vấn/dashboard/SLA/CSAT làm được ngay, lưu ảnh đúng chỗ,
  phân quyền theo vai trò, xuất Excel/PDF dễ; free tier đủ cho 50 căn.
- **Nhược:** thêm một dịch vụ phải quản lý (tài khoản, backup, khóa API).
- **Hợp khi:** muốn dùng lâu dài và nhân rộng sang dự án khác — đúng tình huống hiện tại.

### So sánh nhanh

| Tiêu chí | A. Google Form | B. GitHub log | C. Supabase ✅ |
|---|---|---|---|
| Thời gian dựng MVP | ~1 ngày | ~1 tuần | ~1.5–2 tuần |
| Chi phí vận hành | 0 | 0 | 0 ở free tier |
| Có Work Order & trạng thái | Không | Có (tự xây) | Có |
| Thống kê SLA/CSAT | Thủ công | Khó | Sẵn |
| Lưu ảnh hiện trường | Tạm được (Drive) | Không nên | Tốt |
| Mở rộng sang dự án khác | Kém | Trung bình | Tốt |

> **Khuyến nghị: Phương án C.** Nếu sếp cần thấy kết quả ngay trong tuần này, chạy **A song song** như bản
> thử nghiệm 1–2 tuần, nhưng vẫn build C — không lấy A làm đích.

---

## 3. Kiến trúc đề xuất (Phương án C)

```
Cư dân (Zalo/điện thoại)          Thợ / BQL                     Sếp
        │ quét QR                     │ quét QR trên phiếu          │
        ▼                             ▼                             ▼
  /f/{token}  ──────────────►  Next.js App (Vercel, region sin1)  ──► /dashboard
  form nghiệm thu                     │                              (SLA, CSAT, tồn đọng)
                                      ├─► Supabase Postgres: units, work_orders, wo_events, feedbacks
                                      ├─► Supabase Storage: ảnh trước/sau
                                      └─► Notifier: WO mới / quá hạn / CSAT ≤ 2 sao
                                              └─ Telegram (đã có sẵn) ─ hoặc Zalo OA (xem §5)
```

Tái dùng từ repo `nhadat-chatbot`:
- Danh mục **lô 1–50** trong `lib/units.ts` (mẫu nhà, diện tích, hướng) → seed bảng `units`, không nhập tay.
- Cách tổ chức API route Next.js, rate-limit theo IP (`lib/ratelimit.ts`), pattern gửi Telegram (`lib/logs.ts`).
- Có thể deploy chung hoặc tách repo riêng; **đề xuất tách repo này** để quyền truy cập dữ liệu cư dân
  không lẫn với chatbot công khai.

---

## 4. Kịch bản đúng yêu cầu của sếp (căn 10 — chị Trang)

Dữ liệu căn 10 lấy từ `lib/units.ts` repo chatbot: mẫu **Fusion Gen 5 v2**, DT đất 44.2 m², mặt tiền 4.0 m.

1. **Tiếp nhận** — Chị Trang nhắn nhóm Zalo: "nhà 10 rò nước nhà tắm tầng 2".
   BQL bấm *Tạo WO* (hoặc chị Trang tự quét QR dán tại căn) → sinh **WO-2609-014**,
   hạng mục *Cấp thoát nước*, ưu tiên *Cao*, người yêu cầu *Chị Trang — căn 10*.
2. **Phân công** — BQL gán thợ, hệ thống chốt hạn theo SLA; link WO được dán lại vào Zalo.
3. **Thi công** — Thợ đến, chụp ảnh trước/sau, bấm *Hoàn thành* → WO chuyển trạng thái **Chờ nghiệm thu**.
4. **Lấy nhận xét** — Hệ thống sinh **QR nghiệm thu riêng cho WO-2609-014**; thợ đưa điện thoại/phiếu giấy
   cho chị Trang quét (hoặc BQL gửi link qua Zalo). Form mở ra **đã điền sẵn**: căn 10, nội dung việc, tên thợ.
   Chị Trang chọn: *Đã xong / Chưa xong* → chấm **1–5 sao** (tay nghề, thái độ, vệ sinh) → ghi ý kiến → gửi.
5. **Lưu log & đóng việc** — Nếu **Đã xong** → WO **Đóng**, ghi `feedback` kèm dấu thời gian.
   Nếu **Chưa xong** → WO tự **mở lại**, đánh dấu *rework*, báo ngay về nhóm BQL.
6. **Báo cáo** — Sếp mở dashboard: căn 10 có bao nhiêu lần sửa, thợ nào, CSAT bao nhiêu, có quá hạn không.

---

## 5. Điểm cần kiểm chứng trước khi chốt (không tự quyết được)

| Vấn đề | Hiện trạng hiểu biết | Việc cần làm |
|---|---|---|
| Gửi tin tự động vào **nhóm Zalo thường** | Theo tôi biết, Zalo **không có API công khai** để bot gửi tin vào nhóm chat cá nhân — **độ tin cậy trung bình, cần kiểm chứng** | Kiểm tra tài liệu Zalo OA hiện hành; nếu không được thì giai đoạn 1 **BQL dán link thủ công**, thông báo nội bộ đi Telegram |
| **Zalo OA / ZNS** | Cần có OA đã duyệt, template tin được phê duyệt, tính phí theo tin | Xác nhận Nhà Đạt đã có OA chưa; lấy bảng giá chính thức |
| Nhận dạng cư dân | Chưa có danh sách chủ hộ/SĐT theo căn | BQL cung cấp danh sách 50 căn (tên, SĐT) để prefill & chống mạo danh |
| Dữ liệu cá nhân | Form thu tên + SĐT + ảnh trong nhà | Thống nhất: chỉ BQL/sếp xem được; nêu rõ mục đích khi thu thập |

---

## 6. Chi phí & nguồn lực (ước lượng, chưa báo giá)

- **Hạ tầng:** 0 đồng ở free tier (Vercel + Supabase) với quy mô 50 căn; phát sinh chỉ khi bật Zalo ZNS.
- **In ấn:** 50 tem QR dán căn + phiếu nghiệm thu — chi phí nhỏ, cần báo giá nhà in.
- **Công phát triển MVP:** ~1.5–2 tuần cho 1 dev (ước lượng của tôi, chưa phải cam kết).
- **Đào tạo:** 1 buổi ~60 phút cho BQL + đội thợ; 1 tờ hướng dẫn A5 cho cư dân.
