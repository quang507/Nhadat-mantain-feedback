# Hướng dẫn vận hành (cho BQL)

Bản chạy: **https://nhadat-bao-tri.vercel.app**

| Trang | Ai vào | Link |
|---|---|---|
| Danh sách việc (dashboard) | BQL, sếp | https://nhadat-bao-tri.vercel.app/admin |
| Bảng thưởng đội thợ | BQL, sếp | https://nhadat-bao-tri.vercel.app/admin/thuong |
| Form đánh giá | **Khách** | link riêng từng việc, sinh ra khi thợ báo xong |

Trang quản trị đăng nhập bằng **Google**, chỉ tài khoản **@nhadat.company** vào được.
Khi Google trục trặc thì còn đường dự phòng bằng mật khẩu chung ở `/login?mk=1`.
Khách không cần mật khẩu, không cần cài gì.

---

## 1. Khách nhận được mẫu đánh giá bằng cách nào

Mỗi việc khi thợ báo xong sẽ sinh **một link riêng**, dạng
`https://nhadat-bao-tri.vercel.app/f/<mã dài>`. Có ba đường đưa link đó tới khách —
dùng đường nào cũng ra cùng một form:

### Đường 1 — Quét QR tại chỗ (nên dùng nhất)
Thợ làm xong, BQL mở việc đó trên điện thoại, màn hình hiện sẵn **mã QR**.
Thợ chìa điện thoại cho khách quét là form mở ra ngay, đã biết sẵn căn nào, việc gì, thợ nào.

Đây là đường tốt nhất vì khách chấm **lúc còn nhớ** và còn đứng cạnh chỗ vừa sửa.
Chậm một ngày là tỷ lệ chịu chấm rơi hẳn.

### Đường 2 — Dán link vào Zalo (khách không có mặt)
Ngay dưới mã QR có ô **link**, bấm copy rồi dán vào nhóm Zalo hoặc nhắn riêng cho khách.
Không cần cấu hình gì thêm, dùng được ngay hôm nay.

### Đường 3 — Zalo OA tự gửi (khi đã cấu hình `ZALO_OA_ACCESS_TOKEN`)
Nếu việc đó tiếp nhận từ **tin nhắn Zalo OA**, hệ thống đã biết khách là ai, nên
trang chi tiết có thêm nút **"Gửi thẳng qua Zalo OA cho khách"** — khách nhận tin kèm link.
Gửi không được thì hệ thống ghi rõ lý do vào dòng thời gian và BQL quay về đường 2.

> Khách **gọi hotline** thì không có Zalo user nào để nhận biết — BQL gõ tên khách vào
> lúc tạo việc, tên đó sẽ hiện sẵn trong form để khách khỏi phải điền.

---

## 2. Một việc đi từ đầu tới cuối

1. **Tiếp nhận** — Khách nhắn Zalo hoặc gọi hotline. BQL vào `/admin` → **+ Tạo việc**:
   chọn căn (1–50), tên khách, hạng mục, khách báo gì, thợ nào. Hệ thống sinh mã `WO-YYMM-nnn`.
2. **Giao thợ** — Mở việc, bấm **Giao thợ, bắt đầu làm**.
3. **Thợ báo xong** — Bấm **Thợ báo xong → lấy mã đánh giá**. QR và link hiện ra.
4. **Khách chấm** — Khách trả lời *đã xong chưa*, chọn **một mặt cười** cho mức hài lòng,
   rồi tick nhanh thợ được ở chỗ nào (đúng hẹn · thái độ · sửa được việc · dọn sạch).
   Cả form gọn trong một màn hình.
   - Chọn **Đã xong** → việc đóng lại, hệ thống xếp mức thưởng.
   - Chọn **Chưa xong** → việc **tự mở lại**, BQL cho thợ quay lại; lần đó không xét thưởng.
5. **Xem lại** — `/admin/thuong` gom điểm theo từng thợ để sếp duyệt thưởng cuối tháng.

Mỗi bước đều ghi vào dòng thời gian của việc: ai làm, lúc nào. Không sửa, không xóa được —
để có cái mà đối chiếu khi khách thắc mắc chuyện bảo hành.

---

## 3. Vài điều nên biết

- **Một link chỉ chấm được một lần.** Khách mở lại chỉ thấy "đã ghi nhận".
- **Link có hạn 30 ngày.** Quá hạn khách sẽ thấy lời nhắn liên hệ BQL, BQL tạo lại link mới.
- **Đừng dán link của căn này cho căn khác** — link gắn chặt với một việc cụ thể.
- **Khách chấm ≤ 2 sao hoặc bấm "chưa xong"** thì hệ thống bắt khách ghi vài chữ,
  để BQL biết đường xử lý chứ không chỉ thấy con số.

---

## 4. Việc còn phải làm trước khi dùng thật

Hiện hệ thống đang chạy **chế độ tạm**: chưa có `GITHUB_TOKEN` nên dữ liệu nằm trong ổ tạm
của máy chủ và **sẽ mất** khi Vercel khởi động lại. Trang quản trị có hiện cảnh báo đỏ.

Để dùng thật, thêm `GITHUB_TOKEN` vào Vercel:

1. Vào https://github.com/settings/personal-access-tokens/new
2. Chọn **Only select repositories** → `quang507/Nhadat-mantain-feedback`
3. Mục **Repository permissions** → **Contents: Read and write** (những quyền khác để nguyên "No access")
4. Tạo token, copy.
5. Vào Vercel → project **nhadat-bao-tri** → **Settings → Environment Variables**:
   thêm `GITHUB_TOKEN` = token vừa copy, chọn cả Production/Preview/Development.
6. **Redeploy** (Deployments → bản mới nhất → Redeploy).

Xong bước này, mỗi việc sẽ thành một file JSON trên nhánh `feedback-logs` của repo,
không mất, và xem lại được cả lịch sử chỉnh sửa.

Nên đổi luôn mật khẩu quản trị (`ADMIN_PASSWORD`) trong cùng trang Environment Variables.
