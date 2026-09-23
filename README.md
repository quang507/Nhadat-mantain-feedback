# Bảo trì & Phản hồi — Ny'ah Phú Định

Ứng dụng nội bộ cho khu dân cư **Ny'ah Phú Định** (50 căn, Quận 8, TP.HCM) của Nhà Đạt:
Ban quản lý ghi nhận việc bảo trì, thợ làm xong thì **đưa khách quét một mã QR** để xác nhận
và chấm điểm; điểm đó là căn cứ xét thưởng cho đội thợ. Mọi việc đều lưu log.

Cả khu mỗi tháng chỉ 1–2 việc, nên hệ thống cố ý làm **nhỏ và ít thứ phải chăm**:
một app Next.js, không database, không hàng đợi, không app cài trên máy khách.

## Luồng chính

```
Khách báo hỏng                    BQL                         Thợ              Khách
(Zalo OA / hotline)                │                           │                 │
      └──────────────► tạo việc ───┴─► giao thợ ──────────────►│                 │
                         WO-YYMM-nnn                     làm xong, báo BQL       │
                                   │                           │                 │
                                   └─► bấm "Thợ báo xong" ─────┴─► QR ──────────►│
                                                                                 │
                                        ◄── chấm 4 tiêu chí + "đã xong chưa" ────┘
                                   │
                        Đã xong → đóng việc, xếp mức thưởng
                        Chưa xong → việc tự mở lại, báo BQL
```

Khách nhắn qua **Zalo OA** thì hệ thống biết sẵn là ai (lưu `user_id` từ webhook),
BQL bấm một cái là tạo việc với đúng tên. Khách **gọi hotline** thì BQL gõ tên vào.

## Màn hình

| Đường dẫn | Ai dùng | Làm gì |
|---|---|---|
| `/login` | BQL | Một mật khẩu dùng chung |
| `/admin` | BQL | Việc đang mở, việc chờ khách đánh giá, hộp thư Zalo |
| `/admin/new` | BQL | Tạo việc: chọn căn 1–50, tên khách, hạng mục, mô tả, thợ |
| `/admin/wo/[id]` | BQL | Chi tiết, đổi trạng thái, **QR + link đánh giá**, dòng thời gian |
| `/admin/thuong` | BQL / sếp | Điểm trung bình và số việc theo từng mức thưởng, theo thợ |
| `/f/[token]` | **Khách** | Form đánh giá — không cần cài app, không cần đăng nhập |

## Đánh giá và thưởng

Khách trả lời **"đã xong chưa"** rồi chấm 1–5 cho 4 tiêu chí: *đến đúng hẹn · thái độ, tác phong ·
chất lượng sửa chữa · dọn vệ sinh*. Điểm của việc là trung bình 4 tiêu chí.

| Mức | Điểm |
|---|---|
| A — xuất sắc | từ 4,75 |
| B — tốt | từ 4,25 |
| C — đạt | từ 3,5 |
| Không thưởng | dưới 3,5 |

Khách bấm **chưa xong** thì việc đó **không xét thưởng**, dù chấm mấy sao — việc chưa xong thì
chưa có gì để thưởng. Số tiền mỗi mức để trống trong `BONUS_VND` (`lib/wo.ts`) cho tới khi sếp chốt;
điền số vào đó là bảng thưởng tự hiện thành tiền.

## Chạy

```bash
npm install
cp .env.example .env.local        # điền ADMIN_PASSWORD và APP_SECRET

npm run dev                        # http://localhost:3000
npm test                           # test quy tắc nghiệp vụ + token (bun)
npm run build && npm start         # bản production
npm run test:smoke                 # chạy thật trên trình duyệt, trọn một việc
```

Biến môi trường: xem `.env.example`. Bắt buộc **ADMIN_PASSWORD** và **APP_SECRET**
(`openssl rand -hex 32`). Zalo OA và Telegram để trống vẫn chạy — khi đó BQL copy link
dán vào Zalo như vẫn làm.

## Dữ liệu cất ở đâu

Mỗi việc là **một file JSON** trên nhánh GitHub riêng (`feedback-logs`), ghi qua GitHub API —
giống cách repo `nhadat-chatbot` ghi log. Không có `GITHUB_TOKEN` (hoặc đặt `DATA_LOCAL=1`)
thì ghi vào thư mục `.data/` của máy.

Chọn cách này thay vì Supabase vì **Supabase free tạm dừng project sau 7 ngày ít hoạt động**
và phải vào dashboard bấm Resume ([tài liệu](https://supabase.com/docs/guides/platform/free-project-pausing)).
Với 1–2 việc/tháng thì project gần như luôn ở trạng thái sắp bị dừng — đúng lúc khách quét QR là hỏng.
Đổi sang Postgres sau này chỉ cần viết lại `lib/store.ts`, phần còn lại không đụng tới.

Log trong mỗi việc (`log[]`) **chỉ ghi thêm**, không sửa không xóa — đó là bằng chứng khi
có tranh chấp bảo hành.

## Link đánh giá an toàn tới đâu

- Token ký bằng HMAC-SHA256, hạn **30 ngày**, người ngoài không tự chế được.
- **Một link chỉ gửi được một lần**: gửi xong thì token bị gỡ khỏi việc, mở lại chỉ thấy "đã ghi nhận".
- Khách không phải đăng nhập, form không in số điện thoại ra màn hình.

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/01_LEAN_CANVAS.md](docs/01_LEAN_CANVAS.md) | Lean Canvas |
| [docs/02_PHUONG_AN.md](docs/02_PHUONG_AN.md) | So sánh phương án, kịch bản căn 10 – chị Trang |
| [docs/03_QUY_TRINH_DU_LIEU.md](docs/03_QUY_TRINH_DU_LIEU.md) | Quy trình, SLA, mô hình dữ liệu, spec QR |
| [docs/04_USER_STORIES_ROADMAP.md](docs/04_USER_STORIES_ROADMAP.md) | User story, KPI, roadmap, rủi ro |
| [docs/05_KIEN_TRUC.md](docs/05_KIEN_TRUC.md) | Kiến trúc kỹ thuật |
| [docs/06_HUONG_DAN_VAN_HANH.md](docs/06_HUONG_DAN_VAN_HANH.md) | **Hướng dẫn cho BQL**: khách nhận mẫu đánh giá bằng cách nào, một việc đi từ đầu tới cuối |
| `docs/prototype/dashboard.html` | Bản mẫu dashboard nhiều số liệu (để dành cho sau, khi đã đủ dữ liệu) |

## Chưa có trong đợt này

Ảnh hiện trường, cron nhắc SLA, tài khoản riêng cho thợ, dashboard biểu đồ.
Mỗi tháng 1–2 việc thì chưa cần; thêm vào lúc này chỉ làm BQL thêm ô phải điền.
