import { NextResponse } from 'next/server';
import { layWo, luuWo } from '@/lib/store';
import { readToken } from '@/lib/token';
import { CRITERIA, type CriteriaKey, type Ratings } from '@/lib/types';
import { diemTrungBinh, xepThuong } from '@/lib/wo';
import { baoBQL } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function docRatings(raw: unknown): Ratings | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out = {} as Ratings;
  for (const c of CRITERIA) {
    const v = r[c.key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) return null;
    out[c.key as CriteriaKey] = v;
  }
  return out;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ loi: 'Dữ liệu không đọc được' }, { status: 400 });

  const kq = readToken(String(body.token || ''));
  if (!kq.ok) {
    return NextResponse.json(
      { loi: kq.ly_do === 'het_han' ? 'Link đã hết hạn, liên hệ Ban quản lý giúp' : 'Link không hợp lệ' },
      { status: 400 },
    );
  }

  const daXong = body.daXong;
  if (typeof daXong !== 'boolean') return NextResponse.json({ loi: 'Chưa chọn công việc đã xong chưa' }, { status: 400 });

  const ratings = docRatings(body.ratings);
  if (!ratings) return NextResponse.json({ loi: 'Chấm chưa đủ 4 mục' }, { status: 400 });

  const nguoiDanhGia = String(body.nguoiDanhGia || '').trim().slice(0, 80);
  if (!nguoiDanhGia) return NextResponse.json({ loi: 'Chưa điền tên người nhận xét' }, { status: 400 });

  const yKien = String(body.yKien || '').trim().slice(0, 2000);
  const thapDiem = Object.values(ratings).some((v) => v <= 2);
  if ((!daXong || thapDiem) && !yKien) {
    return NextResponse.json({ loi: 'Nhờ anh/chị ghi thêm vài chữ để BQL biết đường xử lý' }, { status: 400 });
  }

  const wo = await layWo(kq.payload.wo);
  if (!wo) return NextResponse.json({ loi: 'Không tìm thấy công việc' }, { status: 404 });

  // một link chỉ gửi được một lần
  if (wo.feedback) return NextResponse.json({ loi: 'Nhận xét cho việc này đã được gửi trước đó' }, { status: 409 });
  if (wo.trangThai !== 'cho_danh_gia') {
    return NextResponse.json({ loi: 'Công việc chưa tới bước đánh giá' }, { status: 409 });
  }

  const now = new Date().toISOString();
  wo.feedback = { daXong, ratings, yKien, nguoiDanhGia, luc: now, jti: kq.payload.jti };
  wo.trangThai = daXong ? 'xong' : 'lam_lai';
  if (daXong) wo.dongLuc = now;
  wo.token = undefined; // link đã dùng xong
  wo.log.push({
    luc: now,
    ai: 'Khách',
    viec: daXong
      ? `Xác nhận đã xong, điểm ${diemTrungBinh(ratings)}/5`
      : `Báo CHƯA xong, điểm ${diemTrungBinh(ratings)}/5`,
  });

  await luuWo(wo, 'khách gửi nhận xét');

  const thuong = xepThuong(wo.feedback);
  await baoBQL(
    `${wo.id} — căn ${wo.unitId}: ${daXong ? 'khách xác nhận XONG' : 'khách báo CHƯA XONG'}\n` +
      `Điểm ${diemTrungBinh(ratings)}/5 · ${thuong.nhan}\n` +
      (yKien ? `Ý kiến: ${yKien}` : ''),
  );

  return NextResponse.json({ ok: true });
}
