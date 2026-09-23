# Quy trình Work Order, SLA, Data model & Spec QR/Form

## 1. Vòng đời Work Order

```
                ┌──────────────┐
  Zalo/QR ─────►│  MỚI (new)   │
  /hotline      └──────┬───────┘
                       │ BQL phân công thợ + chốt hạn SLA
                       ▼
                ┌──────────────┐    thợ nhận việc   ┌──────────────┐
                │ ĐÃ GIAO      │──────────────────► │ ĐANG XỬ LÝ   │
                └──────┬───────┘                    └──────┬───────┘
                       │ hoãn (chờ vật tư/hẹn lịch)        │ thợ bấm Hoàn thành + ảnh
                       ▼                                   ▼
                ┌──────────────┐                    ┌─────────────────┐
                │ TẠM HOÃN     │                    │ CHỜ NGHIỆM THU  │◄── QR nghiệm thu
                └──────────────┘                    └───┬─────────┬───┘
                                        "Đã xong" ──────┘         └────── "Chưa xong"
                                              ▼                            ▼
                                      ┌──────────────┐            ┌──────────────┐
                                      │  ĐÓNG        │            │ MỞ LẠI       │ (rework)
                                      └──────────────┘            └──────┬───────┘
                                   (tự đóng sau 72h nếu                  │ quay lại ĐÃ GIAO
                                    cư dân không phản hồi,               ▼
                                    ghi rõ "đóng tự động")
```

**Swimlane rút gọn**

| Bước | Cư dân | BQL | Thợ | Hệ thống |
|---|---|---|---|---|
| 1 | Báo sự cố (Zalo/QR) | | | Sinh `WO-YYMM-###`, gắn căn + hạng mục |
| 2 | | Phân loại, chọn ưu tiên, gán thợ | | Chốt `due_at` theo SLA, báo nhóm nội bộ |
| 3 | | | Đến xử lý, chụp ảnh trước/sau | Ghi `wo_events` |
| 4 | | | Bấm Hoàn thành, đưa QR nghiệm thu | Sinh token nghiệm thu, gửi link |
| 5 | Quét QR, điền form | | | Lưu `feedbacks`, cập nhật trạng thái WO |
| 6 | | Xem dashboard, xử lý WO mở lại | | Cảnh báo quá hạn / CSAT ≤ 2 sao |

## 2. Danh mục & SLA đề xuất (BQL chốt lại)

**Hạng mục:** Điện · Cấp thoát nước · Điều hòa/thông gió · Cửa & khóa · Thấm dột · Hoàn thiện (sơn, gạch, gỗ) ·
Thang máy · An ninh/camera · Hạ tầng chung · Khác.

| Mức ưu tiên | Ví dụ | Tiếp nhận | Có mặt | Hoàn thành |
|---|---|---|---|---|
| P1 — Khẩn cấp | chập điện, vỡ ống nước, kẹt thang máy | ≤ 15 phút | ≤ 60 phút | ≤ 24 giờ |
| P2 — Cao | mất nước 1 căn, rò rỉ, điều hòa hỏng | ≤ 2 giờ | ≤ 8 giờ | ≤ 48 giờ |
| P3 — Thường | lỗi hoàn thiện, cửa kẹt | ≤ 8 giờ | ≤ 24 giờ | ≤ 5 ngày |
| P4 — Thấp | đề nghị cải thiện, việc gộp lịch | ≤ 24 giờ | theo lịch | ≤ 14 ngày |

> Các mốc trên là **đề xuất khởi điểm**, không phải cam kết hợp đồng — BQL và đội thợ duyệt trước khi áp dụng.

## 3. Data model (Phương án C — Postgres)

```sql
-- 50 lô, seed từ lib/units.ts của repo nhadat-chatbot
units(
  id            int primary key,          -- 1..50
  model         text,                     -- 'Fusion Gen 5 v2'
  dt_dat        numeric, dt_san numeric,
  owner_name    text,                     -- 'Chị Trang'
  owner_phone   text,
  qr_secret     text                      -- cho QR tĩnh dán tại căn
);

technicians(id, full_name, phone, skills text[], active bool);

work_orders(
  id            text primary key,         -- 'WO-2609-014'
  unit_id       int references units(id),
  category      text,                     -- 'Cấp thoát nước'
  priority      text,                     -- 'P1'..'P4'
  title         text, description text,
  status        text,                     -- new|assigned|in_progress|on_hold|awaiting_ack|closed|reopened
  reporter_name text, reporter_phone text, reporter_channel text, -- 'zalo' | 'qr' | 'hotline'
  assignee_id   int references technicians(id),
  created_at timestamptz, assigned_at timestamptz, started_at timestamptz,
  done_at timestamptz, closed_at timestamptz, due_at timestamptz,
  reopen_of     text references work_orders(id),   -- đánh dấu rework
  photos        jsonb                      -- {before:[], after:[]}
);

wo_events(id bigserial, wo_id text, at timestamptz, actor text, action text, note text, payload jsonb);
-- log bất biến: chỉ INSERT, không UPDATE/DELETE

feedbacks(
  id             bigserial primary key,
  wo_id          text references work_orders(id),
  is_done        bool not null,            -- "đã xong chưa"
  rating_overall int check (rating_overall between 1 and 5),
  rating_skill   int, rating_attitude int, rating_cleanliness int,  -- tùy chọn
  comment        text,
  photos         jsonb,
  respondent_name text, respondent_phone text,  -- 'Chị Trang'
  submitted_at   timestamptz default now(),
  ip_hash        text, user_agent text,    -- chống điền bừa, không lưu IP thô
  token_jti      text unique               -- 1 token = 1 lần gửi
);
```

**Nguyên tắc log:** `wo_events` chỉ ghi thêm, không sửa/xóa — đây là bằng chứng khi có tranh chấp bảo hành.
Mỗi bản ghi tối thiểu: *ai, lúc nào, làm gì, WO nào*.

## 4. Spec QR

Hai loại QR, đừng nhầm lẫn:

| | **QR-A: Báo sự cố** | **QR-B: Nghiệm thu & đánh giá** |
|---|---|---|
| Dán ở đâu | Tem dán cố định tại từng căn (tủ điện/hộp kỹ thuật) | In trên phiếu công việc, hoặc hiện trên máy thợ / gửi qua Zalo |
| Vòng đời | **Tĩnh**, dùng mãi | **Động**, sinh theo từng WO, **hết hạn 7 ngày**, **dùng 1 lần** |
| URL | `https://<domain>/r/{unit}-{qr_secret}` | `https://<domain>/f/{token}` |
| Mở ra | Form tạo yêu cầu mới, đã biết sẵn số căn | Form nghiệm thu, đã biết WO/căn/thợ/nội dung việc |

**Token QR-B:** JWT/HMAC ký phía server, payload `{wo_id, unit_id, jti, exp}`.
Không cần đăng nhập, nhưng: token hết hạn → hiện "link đã hết hiệu lực, liên hệ BQL";
đã gửi rồi → hiện lại nội dung đã gửi thay vì cho gửi lần hai.

**In ấn:** QR-A in tem chống nước ~5×5 cm, kèm dòng chữ *"Quét để báo bảo trì — Căn 10"*.
QR-B in trên phiếu A5 để thợ vẫn có bản giấy cho cư dân ký khi cần.

## 5. Spec form nghiệm thu (`/f/{token}`)

Màn hình 1 — **xác nhận bối cảnh** (chỉ đọc):
> WO-2609-014 · Căn 10 · Cấp thoát nước · "Rò nước nhà tắm tầng 2"
> Thợ: [tên] · Hoàn thành lúc: 23/09 15:40 · Ảnh trước/sau: [xem]

Màn hình 2 — **các câu hỏi** (tối đa 5 thao tác, làm xong dưới 30 giây):

| Trường | Kiểu | Bắt buộc |
|---|---|---|
| Công việc đã xong chưa? | 2 nút lớn: **Đã xong** / **Chưa xong** | ✔ |
| Mức hài lòng chung | 5 sao | ✔ |
| Tay nghề / Thái độ / Dọn vệ sinh | 3 dòng sao (mặc định = sao chung, cho sửa) | — |
| Ý kiến | ô chữ ngắn | — (bắt buộc nếu chọn "Chưa xong" hoặc ≤ 2 sao) |
| Ảnh minh họa | tải lên, tối đa 3 ảnh | — |
| Người nhận xét | prefill từ `units.owner_name` (vd. *Chị Trang*), cho sửa | ✔ |

Màn hình 3 — **xác nhận**: "Đã ghi nhận lúc 23/09 16:02. Cảm ơn chị Trang." + nút *Báo sự cố khác*.

Yêu cầu phi chức năng: tiếng Việt, mobile-first, chữ lớn, tải < 2 giây trên 4G, chạy được trên trình duyệt
trong Zalo (Zalo in-app browser), không bắt cài app, không bắt đăng nhập.

## 6. Cảnh báo tự động

| Sự kiện | Gửi cho ai |
|---|---|
| WO mới P1/P2 | Nhóm BQL + thợ trực, ngay lập tức |
| Sắp quá hạn (còn 20% thời gian SLA) | BQL + thợ được giao |
| Quá hạn | BQL + cấp trên |
| Feedback ≤ 2 sao hoặc "Chưa xong" | BQL + sếp |
| Tổng kết tuần | Sếp: số WO, % đúng SLA, CSAT, top căn nhiều sự cố |

Kênh giai đoạn 1: **Telegram** (đã chạy sẵn ở repo chatbot). Zalo OA để giai đoạn 2, sau khi kiểm chứng (xem 02 §5).
