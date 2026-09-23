# Nhã Đạt — Maintenance & Feedback (Ny'ah Phú Định)

Hồ sơ phân tích nghiệp vụ (BA) cho hệ thống **tiếp nhận yêu cầu bảo trì + lấy phản hồi cư dân**
tại khu dân cư **Ny'ah Phú Định** (50 căn, Quận 8, TP.HCM) — chủ đầu tư Nhã Đạt.

> Trạng thái: **tài liệu phương án, chưa code.** Repo hiện chỉ chứa tài liệu để sếp duyệt hướng đi.
>
> Đã chốt (23/09/2026): **Phương án C** — Next.js/Vercel + Supabase; kênh tới cư dân là **Zalo OA**
> (Nhà Đạt đã có OA), kênh nội bộ là Telegram. Chưa bắt tay code, chờ sếp duyệt.

## Bối cảnh 1 dòng

Hiện BQL/đội kỹ thuật làm việc **chủ yếu qua Zalo**: khách báo hỏng trong nhóm chat, thợ đi xử lý,
xong thì nhắn lại — **không có mã việc, không có log, không đo được SLA, không có nhận xét lưu lại**.
Yêu cầu của sếp: *quét QR → mở web form → người nhận xét (vd. chị Trang, căn 10) đánh giá công việc đã xong chưa → lưu log lại.*

## Tài liệu

| File | Nội dung |
|------|----------|
| [docs/01_LEAN_CANVAS.md](docs/01_LEAN_CANVAS.md) | Lean Canvas cho sản phẩm nội bộ |
| [docs/02_PHUONG_AN.md](docs/02_PHUONG_AN.md) | 3 phương án kỹ thuật, so sánh, khuyến nghị, kiến trúc |
| [docs/03_QUY_TRINH_DU_LIEU.md](docs/03_QUY_TRINH_DU_LIEU.md) | Quy trình Work Order, SLA, data model, spec QR + form + log |
| [docs/04_USER_STORIES_ROADMAP.md](docs/04_USER_STORIES_ROADMAP.md) | User story + tiêu chí nghiệm thu, KPI, roadmap, rủi ro |

## Nguồn tham chiếu đã dùng

- Repo `quang507/nhadat-chatbot` — hạ tầng sẵn có: Next.js 14 trên Vercel, ghi log qua GitHub API
  vào nhánh `chatbot-logs` (`lib/logs.ts`), thông báo Telegram, dữ liệu lô 1–50 trong `lib/units.ts`.
- Thực tiễn vận hành BĐS: Work Order (WO), Maintenance Request, SLA, nghiệm thu có chữ ký, CSAT/NPS.
- Mẫu vai trò Business Analyst (VoltAgent awesome-claude-code-subagents).
