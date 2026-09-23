# User Stories, KPI, Roadmap & Rủi ro

## 1. User stories + tiêu chí nghiệm thu (MVP)

### US-01 — Cư dân báo sự cố bằng QR dán tại căn
> Là **cư dân**, tôi quét QR tại tủ điện nhà mình để báo hỏng mà không phải tìm số BQL.

- [ ] Quét QR-A mở form đã điền sẵn số căn, không cần đăng nhập.
- [ ] Chọn hạng mục, mô tả, đính kèm tối đa 3 ảnh, nhập SĐT.
- [ ] Gửi xong hiện mã **WO-YYMM-###** để cư dân nhắn lại trong Zalo khi cần.
- [ ] Nhóm BQL nhận thông báo trong vòng 1 phút.

### US-02 — BQL tạo & phân công WO
> Là **BQL**, tôi tạo WO từ tin nhắn Zalo và gán thợ, để việc không bị trôi.

- [ ] Tạo WO thủ công, chọn căn 1–50 từ danh sách có sẵn (không gõ tay).
- [ ] Chọn ưu tiên P1–P4 → hệ thống tự tính `due_at` theo SLA.
- [ ] Gán thợ; thợ nhận được thông báo.
- [ ] Sao chép được link WO để dán vào Zalo.

### US-03 — Thợ cập nhật tiến độ & đóng việc
> Là **thợ**, tôi cập nhật trạng thái và chụp ảnh trước/sau ngay trên điện thoại.

- [ ] Mở link WO trên điện thoại, bấm *Nhận việc* / *Hoàn thành*.
- [ ] Bắt buộc có ít nhất 1 ảnh "sau" trước khi chuyển sang **Chờ nghiệm thu**.
- [ ] Khi chuyển trạng thái, hệ thống hiện **QR-B** để đưa cư dân quét tại chỗ.

### US-04 — Cư dân nhận xét qua QR (yêu cầu trực tiếp của sếp)
> Là **chị Trang (căn 10)**, tôi quét QR và cho biết việc đã xong chưa, chấm sao, ghi ý kiến.

- [ ] Quét QR-B mở form đã biết sẵn WO, căn, thợ, nội dung việc; tên người nhận xét prefill "Chị Trang", sửa được.
- [ ] Chọn **Đã xong** → WO chuyển **Đóng**; chọn **Chưa xong** → WO **Mở lại** và báo BQL ngay.
- [ ] Bắt buộc nhập ý kiến khi chọn "Chưa xong" hoặc chấm ≤ 2 sao.
- [ ] Một token chỉ gửi được **một lần**; hết hạn sau 7 ngày, hiện thông báo rõ ràng.
- [ ] Hoàn tất toàn bộ trong **< 30 giây** trên điện thoại 4G.

### US-05 — Log tra cứu được
> Là **BQL**, tôi tra lại lịch sử của một căn khi có tranh chấp bảo hành.

- [ ] Mỗi WO có dòng thời gian đầy đủ: ai, lúc nào, làm gì.
- [ ] Log **chỉ ghi thêm**, không ai sửa/xóa được từ giao diện.
- [ ] Lọc theo căn / thợ / hạng mục / khoảng thời gian; xuất Excel.

### US-06 — Dashboard cho sếp
> Là **sếp**, tôi xem một màn hình là biết tháng này đội thợ làm ăn thế nào.

- [ ] Các số: tổng WO, % đúng SLA, CSAT trung bình, số WO mở lại, WO đang quá hạn.
- [ ] Xếp hạng CSAT theo thợ; top căn nhiều sự cố nhất.
- [ ] Chọn được khoảng thời gian; xuất báo cáo.

## 2. KPI theo dõi sau khi chạy

| KPI | Mục tiêu khởi điểm | Cách đo |
|---|---|---|
| % WO đúng SLA | ≥ 85% | `closed_at` ≤ `due_at` |
| Tỷ lệ WO có phản hồi | ≥ 80% | feedback / WO chờ nghiệm thu |
| CSAT trung bình | ≥ 4.3 / 5 | trung bình `rating_overall` |
| Tỷ lệ mở lại (rework) | ≤ 10% | WO có `reopen_of` trong 14 ngày |
| Thời gian đóng trung bình | giảm 30% sau 3 tháng | `closed_at − created_at` |

> Các mốc mục tiêu là **giả định khởi điểm** vì hiện chưa có số liệu nền (baseline).
> Sau tháng đầu chạy thật, lấy số thực tế làm chuẩn rồi điều chỉnh.

## 3. Roadmap

| Giai đoạn | Thời lượng ước tính | Nội dung | Kết quả bàn giao |
|---|---|---|---|
| **0. Chốt hướng** | 2–3 ngày | Sếp duyệt phương án; BQL cung cấp danh sách 50 chủ hộ + SĐT; chốt hạng mục & SLA | Biên bản chốt phạm vi |
| **1. MVP** | 1.5–2 tuần | QR-B + form nghiệm thu + WO + log + thông báo nội bộ; seed 50 căn | App chạy thật trên Vercel |
| **2. Chạy thử** | 2 tuần | Thử trên ~10 căn (gồm căn 10), BQL vận hành song song Zalo | Báo cáo chạy thử + điều chỉnh |
| **3. Toàn khu** | 1 tuần | In & dán QR-A 50 căn, đào tạo, dashboard cho sếp | Vận hành chính thức |
| **4. Mở rộng** | sau đó | Zalo OA/ZNS (nếu duyệt được), khảo sát CSAT định kỳ, bảo trì định kỳ theo lịch | — |

Ước lượng trên là của tôi dựa trên phạm vi MVP, **chưa phải cam kết tiến độ** — cần dev xác nhận.

## 4. Rủi ro & cách giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Cư dân không quét QR, vẫn chỉ nhắn Zalo | **Cao** | BQL vẫn tạo WO thay; thợ đưa QR tận tay lúc nghiệm thu; giữ phiếu giấy có QR |
| Thợ ngại cập nhật trạng thái trên điện thoại | Cao | Rút còn 2 nút *Nhận việc* / *Hoàn thành*; đào tạo tại chỗ; BQL cập nhật hộ giai đoạn đầu |
| Không gửi tự động được vào nhóm Zalo | Trung bình | Giai đoạn 1 BQL dán link thủ công; cảnh báo nội bộ đi Telegram; kiểm chứng Zalo OA sau |
| Đánh giá bị thiên lệch (thợ đứng cạnh xem) | Trung bình | Cho gửi link qua Zalo để cư dân điền riêng; thợ không xem được nội dung nhận xét, chỉ BQL/sếp thấy |
| Dữ liệu cá nhân (SĐT, ảnh trong nhà) | Trung bình | Chỉ BQL/sếp xem; nêu rõ mục đích trên form; hạn chế thời gian lưu ảnh |
| Điền bừa / spam qua link | Thấp | Token 1 lần, hết hạn, rate-limit theo IP như `lib/ratelimit.ts` của chatbot |
| Phụ thuộc một dev duy nhất | Trung bình | Tài liệu hóa trong repo này; code cùng chuẩn với repo chatbot |

## 5. Việc cần sếp/BQL quyết

~~1. Chọn phương án A / B / C~~ → **đã chốt: Phương án C** (Next.js + Supabase), 23/09/2026.
~~2. Nhà Đạt đã có Zalo OA chưa?~~ → **đã có OA**; dùng OA gửi tin nghiệm thu 1-1, Telegram cho nội bộ.

Còn lại chờ sếp/BQL:

1. Danh sách **50 chủ hộ** (tên + SĐT) để prefill form và gửi tin OA — ai cung cấp, khi nào?
2. **Quyền truy cập Zalo OA** cho dev (App ID/secret, quyền gửi tin) + ai duyệt template T1/T2/T3.
3. Duyệt **danh mục hạng mục và mốc SLA** ở tài liệu 03 §2.
4. Ai được xem dashboard và nội dung nhận xét (chỉ sếp + trưởng BQL?).
5. Duyệt ngân sách **ZNS** nếu chọn gửi theo SĐT thay vì chỉ gửi cho người đã quan tâm OA.
