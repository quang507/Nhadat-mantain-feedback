# Thiết kế kiến trúc kỹ thuật (Phương án C)

Ngày: 2026-09-23. Quy mô mục tiêu: **50 căn**, ước tính **30–80 WO/tháng**, ~10 người dùng nội bộ.
Nguyên tắc xuyên suốt: **quy mô nhỏ thì kiến trúc phải nhỏ** — không microservice, không hàng đợi,
không realtime nếu chưa cần. Ưu tiên ít thành phần để BQL vận hành được mà không cần dev trực.

---

## 1. Sơ đồ tổng thể

```
        CƯ DÂN                    THỢ / BQL                    SẾP
    (điện thoại, Zalo)          (điện thoại/laptop)          (laptop)
          │                            │                        │
    quét QR / link OA            đăng nhập                 đăng nhập
          │                            │                        │
          ▼                            ▼                        ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │                 Next.js 14 App Router (Vercel, sin1)             │
  │                                                                  │
  │  PUBLIC (không đăng nhập)     │  NỘI BỘ (có đăng nhập)           │
  │  /r/{unit}-{sig}  báo hỏng    │  /wo            danh sách WO     │
  │  /f/{token}       nghiệm thu  │  /wo/{id}       chi tiết + log   │
  │                               │  /dashboard     số liệu cho sếp  │
  │                               │  /admin         căn, thợ, SLA    │
  │                                                                  │
  │  API routes: /api/wo, /api/feedback, /api/upload,                │
  │              /api/zalo/webhook, /api/cron/sla                    │
  └───────────┬───────────────────────────┬──────────────────────────┘
              │                           │
              ▼                           ▼
   ┌────────────────────┐      ┌────────────────────────┐
   │ Supabase           │      │ Tích hợp ngoài         │
   │  Postgres (dữ liệu)│      │  Zalo OA  (tin cư dân) │
   │  Storage  (ảnh)    │      │  Telegram (nội bộ)     │
   │  Auth     (nội bộ) │      └────────────────────────┘
   └────────────────────┘
              ▲
              │ Vercel Cron (mỗi 15 phút): quét quá hạn, nhắc nghiệm thu, tự đóng 72h
```

**Vì sao đủ dùng:** toàn bộ ghi/đọc đi qua Next.js server (Route Handler) — trình duyệt **không** nói
chuyện trực tiếp với Supabase, nên khóa `service_role` không bao giờ rời server và không phải tin vào RLS
cho luồng công khai.

---

## 2. Cấu trúc thư mục đề xuất

```
app/
  r/[code]/page.tsx            # QR tĩnh: form báo hỏng theo căn
  f/[token]/page.tsx           # QR động: form nghiệm thu + đánh giá
  (internal)/
    wo/page.tsx                # hàng đợi WO (lọc theo trạng thái/thợ/căn)
    wo/[id]/page.tsx           # chi tiết + dòng thời gian + ảnh
    dashboard/page.tsx         # số liệu cho sếp
    admin/page.tsx             # căn/chủ hộ, thợ, hạng mục, SLA
  api/
    wo/route.ts                # POST tạo WO, PATCH đổi trạng thái
    feedback/route.ts          # POST nhận nghiệm thu (token 1 lần)
    upload/route.ts            # POST ảnh -> Storage (signed upload)
    zalo/webhook/route.ts      # nhận sự kiện OA (follow, tin nhắn)
    cron/sla/route.ts          # Vercel Cron gọi định kỳ
lib/
  db.ts            # Supabase client (server-only)
  wo.ts            # sinh mã WO, tính due_at theo SLA, chuyển trạng thái
  token.ts         # ký/giải token QR (HMAC + jti + exp)
  notify.ts        # gửi Zalo OA / Telegram (1 interface, 2 driver)
  units.ts         # seed 50 lô (chép từ repo nhadat-chatbot)
  ratelimit.ts     # chép pattern từ repo nhadat-chatbot
  metrics.ts       # truy vấn cho dashboard
```

---

## 3. Phân quyền — 3 lớp, cố ý khác nhau

| Nhóm | Cách vào | Thấy được gì |
|---|---|---|
| **Cư dân** | **Không đăng nhập.** Chỉ có token trong QR/link | Đúng một WO của chính căn mình, qua đúng token đó |
| **Thợ** | Link cá nhân lưu trên máy + **mã PIN 4 số** (không bắt email/OTP SMS) | WO được giao cho mình; **không xem được nội dung nhận xét** |
| **BQL / Sếp** | Supabase Auth (email + magic link) | BQL: toàn bộ WO + admin. Sếp: dashboard + đọc nhận xét |

Lý do thợ không xem nhận xét: tránh cư dân ngại chấm thật khi thợ đứng cạnh (rủi ro đã nêu ở tài liệu 04).
BQL là người phản hồi lại thợ, không phải hệ thống bêu tên.

**RLS (Row Level Security):** bật trên mọi bảng, mặc định **từ chối tất cả**. Luồng công khai không dựa vào
RLS mà dựa vào token đã xác thực phía server. RLS là lớp chặn thứ hai cho tài khoản nội bộ:

```sql
alter table work_orders enable row level security;

create policy wo_staff_read on work_orders for select
  using (auth.jwt() ->> 'role' in ('bql','sep'));

create policy wo_tech_read on work_orders for select
  using (assignee_id = (auth.jwt() ->> 'tech_id')::int);

create policy fb_no_tech on feedbacks for select
  using (auth.jwt() ->> 'role' in ('bql','sep'));   -- thợ không đọc nhận xét
```

---

## 4. Token QR — chi tiết cần làm đúng

```ts
// lib/token.ts
type QrPayload = { wo: string; unit: number; jti: string; exp: number };
// token = base64url(payload) + '.' + HMAC-SHA256(payload, QR_SIGNING_SECRET)
```

Quy tắc bắt buộc:
- `exp` = 7 ngày; hết hạn → trang hiện "link đã hết hiệu lực, liên hệ BQL", **không** báo lỗi kỹ thuật.
- `jti` lưu unique trong `feedbacks.token_jti` → **gửi lại lần hai bị chặn ở tầng database**, không chỉ ở giao diện.
- Rate-limit theo IP: 5 lần gửi / 10 phút (chép `lib/ratelimit.ts` của repo chatbot).
- **Không** nhúng số điện thoại hay tên trong token — chỉ id; thông tin hiển thị lấy từ DB khi render.
- QR tĩnh (`/r/{unit}-{sig}`) dùng chữ ký riêng theo căn, **không hết hạn**, nhưng đổi được `qr_secret`
  nếu tem bị chụp phát tán (đổi xong thì in lại tem căn đó).

---

## 5. Tích hợp Zalo OA

```
Cư dân quan tâm OA ──► Zalo gửi webhook ──► /api/zalo/webhook
                                                │ lưu zalo_user_id vào units
                                                ▼
   WO chuyển "Chờ nghiệm thu" ──► lib/notify.ts ──► OA gửi tin 1-1 kèm link /f/{token}
```

- Bảng `units` thêm cột `zalo_user_id` (điền dần khi cư dân quan tâm OA).
- `lib/notify.ts` là **một interface, nhiều driver**: `zalo` (cư dân), `telegram` (nội bộ), `noop` (dev).
  Nếu OA chưa gửi được thì đổi driver, phần còn lại của hệ thống không phải sửa.
- **Chưa xác minh được** điều kiện gửi tin tư vấn OA / chi phí ZNS (xem tài liệu 02 §5) → code phải chịu
  được trường hợp gửi thất bại: ghi `wo_events` là "gửi OA lỗi", để BQL biết mà dán link tay vào Zalo.

---

## 6. Ảnh hiện trường

- Nén **phía trình duyệt** trước khi tải lên (cạnh dài ≤ 1600px, JPEG ~0.7) — thợ dùng 4G.
- Tải lên bằng **signed upload URL** của Supabase Storage, không đẩy file qua server Next.js.
- Bucket **private**; hiển thị bằng signed URL hạn 10 phút.
- Vòng đời: ảnh nghiệm thu giữ **24 tháng** (hết hạn bảo hành) rồi dọn bằng job định kỳ.

---

## 7. Job định kỳ (Vercel Cron, 15 phút/lần)

| Việc | Hành động |
|---|---|
| Quét sắp quá hạn | Còn ≤ 20% thời gian SLA → nhắc thợ + BQL |
| Quét quá hạn | Quá `due_at` → báo BQL và cấp trên, đánh dấu WO |
| Nhắc nghiệm thu | WO "Chờ nghiệm thu" > 24h chưa có feedback → nhắc 1 lần |
| Tự đóng | > 72h không phản hồi → đóng, ghi rõ **"đóng tự động, không có nhận xét"** |
| Dọn ảnh | Ảnh quá 24 tháng |

Route `/api/cron/sla` bảo vệ bằng `CRON_SECRET`, chạy **idempotent** (chạy lại không gửi trùng).

---

## 8. Biến môi trường

| Biến | Dùng cho |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Truy cập DB/Storage phía server |
| `QR_SIGNING_SECRET` | Ký token QR |
| `ZALO_OA_ID`, `ZALO_APP_SECRET`, `ZALO_ACCESS_TOKEN` | Gửi tin OA |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Cảnh báo nội bộ |
| `CRON_SECRET` | Bảo vệ route cron |

Khóa lưu trong Vercel Environment Variables, **không commit vào repo**; `.env.example` chỉ ghi tên biến.

---

## 9. Dashboard — kiến trúc truy vấn

Không tính toán trong React. Mỗi thẻ số là **một view SQL** đã định nghĩa sẵn, trang chỉ đọc:

```sql
create view v_wo_sla as
  select id, unit_id, priority, assignee_id, created_at, closed_at, due_at,
         (closed_at is not null and closed_at <= due_at) as on_time,
         extract(epoch from (closed_at - created_at))/3600 as hours_to_close
  from work_orders;

create view v_csat_by_tech as
  select t.id, t.full_name,
         count(f.*) as n, round(avg(f.rating_overall)::numeric, 2) as csat,
         sum(case when f.is_done = false then 1 else 0 end) as not_done
  from technicians t
  join work_orders w on w.assignee_id = t.id
  join feedbacks f on f.wo_id = w.id
  group by t.id, t.full_name;

create view v_rework as        -- WO phải mở lại trong 14 ngày
  select w.id, w.unit_id, w.reopen_of
  from work_orders w
  where w.reopen_of is not null
    and w.created_at - (select created_at from work_orders p where p.id = w.reopen_of) < interval '14 days';
```

**Bố cục màn hình dashboard** (chi tiết xem bản mẫu `docs/prototype/dashboard.html`):

1. Hàng thẻ số: WO đang mở · Quá hạn · % đúng SLA · CSAT trung bình · Tỷ lệ mở lại.
2. Biểu đồ cột: WO theo tuần, tách *đúng hạn / trễ*.
3. Bảng xếp hạng thợ: số việc, CSAT, số lần bị đánh "chưa xong".
4. Bản đồ 50 căn: đánh dấu căn đang có WO mở / quá hạn.
5. Danh sách nhận xét mới nhất — **ưu tiên hiển thị đánh giá ≤ 2 sao lên đầu**, vì đó mới là thứ cần xử lý.

Nguyên tắc: **dashboard tồn tại để tạo ra hành động, không phải để đẹp.** Mỗi số phải trả lời được
"giờ tôi phải làm gì" — nên mỗi thẻ đều bấm được để nhảy sang danh sách WO tương ứng.

---

## 10. Các quyết định kiến trúc & lý do (ADR rút gọn)

| # | Quyết định | Vì sao | Đánh đổi |
|---|---|---|---|
| 1 | Một app Next.js duy nhất, không tách service | 50 căn, tải rất thấp; ít thứ phải vận hành | Không co giãn riêng từng phần (chưa cần) |
| 2 | Cư dân không đăng nhập, chỉ dùng token | Ma sát bằng 0 mới có người dùng thật | Phải làm chặt token (§4) |
| 3 | Mọi truy cập DB qua server, không gọi Supabase từ trình duyệt | Khóa không lộ; không phụ thuộc hoàn toàn vào RLS | Viết thêm API route |
| 4 | Log `wo_events` chỉ ghi thêm | Làm bằng chứng bảo hành | Dữ liệu lớn dần (không đáng kể ở quy mô này) |
| 5 | Thông báo qua interface nhiều driver | Zalo OA chưa chắc chắn (02 §5) | Thêm một lớp trừu tượng nhỏ |
| 6 | Thợ không đọc nhận xét | Giữ tính trung thực của đánh giá | Thợ nhận phản hồi chậm hơn, qua BQL |
| 7 | Dashboard đọc view SQL | Số liệu nhất quán giữa các màn hình | Đổi chỉ số phải sửa migration |

---

## 11. Thứ tự làm (nếu sếp duyệt)

| Đợt | Nội dung | Xong thì chứng minh được gì |
|---|---|---|
| 1 | Schema + seed 50 căn + `/f/{token}` + `/api/feedback` | **Chị Trang quét QR căn 10 nhận xét được, có log** |
| 2 | Tạo WO, phân công, màn hình thợ, Telegram nội bộ | BQL chạy trọn một việc trong hệ thống |
| 3 | QR tĩnh `/r/{code}` + in tem 50 căn | Cư dân tự báo hỏng |
| 4 | Dashboard + view SQL + xuất Excel | Sếp xem số thay vì hỏi BQL |
| 5 | Zalo OA + cron SLA + tự đóng 72h | Hệ thống tự chạy, ít phải nhắc tay |

Mỗi đợt ước tính 2–4 ngày công dev (**ước lượng của tôi, chưa phải cam kết**).

---

## 12. Bản mẫu dashboard

`docs/prototype/dashboard.html` — bản HTML tĩnh, **dữ liệu mẫu, không phải số thật** (có ghi rõ trên đầu trang).
Dùng để trình sếp duyệt bố cục trước khi viết code thật; dev lấy luôn làm mốc giao diện.

Bản mẫu thể hiện: hàng 5 thẻ số, biểu đồ cột xếp chồng đúng hạn/trễ theo tuần (có tooltip),
bảng xếp hạng thợ, sơ đồ 50 căn theo trạng thái, và danh sách nhận xét với đánh giá thấp nổi lên đầu.

Màu đi theo bộ nhận diện Nhã Đạt (terracotta `#802613`, nền kem `#FDFBF7`, chữ Outfit + Be Vietnam Pro).
Riêng hai màu dữ liệu — đúng hạn `#00897B` / trễ `#C9481F` (bản tối: `#26A69A` / `#E2703A`) — được **chạy qua
trình kiểm tra tương phản** và đạt cả ở nền sáng lẫn nền tối, kể cả với người mù màu đỏ-lục;
**cặp xanh lá – đỏ theo bản năng thì trượt bài kiểm tra này**, nên đừng đổi lại.
