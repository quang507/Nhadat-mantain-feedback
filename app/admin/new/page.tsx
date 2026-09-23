import { redirect } from 'next/navigation';
import Link from 'next/link';
import { daDangNhap } from '@/lib/auth';
import { danhSachWo, layInbox, luuWo } from '@/lib/store';
import { UNITS } from '@/lib/units';
import { CATEGORIES, type Channel, type WorkOrder } from '@/lib/types';
import { nextWoId } from '@/lib/wo';
import { doanHangMuc } from '@/lib/doan';
import { baoBQL } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export default function TaoViec({
  searchParams,
}: {
  searchParams: { khach?: string; zalo?: string; mota?: string; loi?: string };
}) {
  if (!daDangNhap()) redirect('/login');

  async function tao(formData: FormData) {
    'use server';

    const unitId = Number(formData.get('unitId'));
    const khach = String(formData.get('khach') || '').trim();
    const moTa = String(formData.get('moTa') || '').trim();
    const tho = String(formData.get('tho') || '').trim();
    const zaloUserId = String(formData.get('zaloUserId') || '').trim();

    if (!Number.isInteger(unitId) || unitId < 1 || unitId > 50 || !khach || !moTa) {
      redirect('/admin/new?loi=1');
    }

    // Hạng mục đoán từ câu khách báo; BQL chọn tay thì lấy cái đã chọn.
    const hangMucChon = String(formData.get('hangMuc') || '').trim();
    const hangMuc = hangMucChon || doanHangMuc(moTa);
    const kenh = (String(formData.get('kenh') || '') || (zaloUserId ? 'zalo' : 'hotline')) as Channel;

    // Kho dữ liệu hỏng thì báo hẳn ra màn hình, đừng để Next văng "Application error".
    let ids: string[];
    try {
      ids = (await danhSachWo()).map((w) => w.id);
    } catch (err) {
      redirect(`/admin/new?loi=${encodeURIComponent(String(err instanceof Error ? err.message : err).slice(0, 200))}`);
    }
    const now = new Date().toISOString();

    // Điền sẵn tên thợ thì việc vào luôn trạng thái đang xử lý - bớt cho BQL một lần bấm.
    const wo: WorkOrder = {
      id: nextWoId(ids),
      unitId,
      khach,
      sdt: String(formData.get('sdt') || '').trim(),
      kenh,
      ...(zaloUserId ? { zaloUserId } : {}),
      hangMuc,
      moTa,
      tho,
      trangThai: tho ? 'dang_lam' : 'moi',
      taoLuc: now,
      log: [
        { luc: now, ai: 'BQL', viec: `Tiếp nhận từ ${kenh === 'hotline' ? 'hotline' : kenh === 'zalo' ? 'Zalo' : 'báo trực tiếp'}` },
        ...(tho ? [{ luc: now, ai: 'BQL', viec: `Giao cho thợ ${tho}` }] : []),
      ],
    };

    try {
      await luuWo(wo, 'tạo việc mới');

      if (zaloUserId) {
        const { luuInbox } = await import('@/lib/store');
        const inbox = await layInbox();
        await luuInbox(inbox.map((i) => (i.zaloUserId === zaloUserId && !i.daXuLy ? { ...i, daXuLy: true } : i)));
      }
    } catch (err) {
      redirect(`/admin/new?loi=${encodeURIComponent(String(err instanceof Error ? err.message : err).slice(0, 200))}`);
    }

    await baoBQL(`Việc mới ${wo.id} — căn ${wo.unitId} — ${wo.hangMuc}\n${wo.moTa}`);
    redirect(`/admin/wo/${wo.id}`);
  }

  return (
    <main className="wrap">
      <div className="top">
        <h1>Việc mới</h1>
        <Link className="muted" href="/admin">← Danh sách</Link>
      </div>

      <form action={tao} className="card pad-lg">
        {searchParams.loi ? (
          <p className="err">
            {searchParams.loi === '1'
              ? 'Cần có căn, tên khách và nội dung khách báo.'
              : `Chưa lưu được việc: ${searchParams.loi}`}
          </p>
        ) : null}

        <label htmlFor="unitId">Căn số</label>
        <select id="unitId" name="unitId" required defaultValue="">
          <option value="" disabled>— chọn căn —</option>
          {UNITS.map((u) => (
            <option key={u.id} value={u.id}>Căn {u.id} — {u.model}</option>
          ))}
        </select>

        <label htmlFor="khach">Tên khách</label>
        <input id="khach" name="khach" required defaultValue={searchParams.khach || ''} placeholder="vd: Chị Trang" />

        <label htmlFor="moTa">Khách báo gì</label>
        <textarea id="moTa" name="moTa" required defaultValue={searchParams.mota || ''}
          placeholder="vd: Rò nước nhà tắm tầng 2" />

        <label htmlFor="tho">Giao cho thợ</label>
        <input id="tho" name="tho" placeholder="vd: Anh Hùng — để trống nếu chưa giao" />

        <details style={{ marginTop: 18 }}>
          <summary className="muted" style={{ cursor: 'pointer' }}>Thêm chi tiết (không bắt buộc)</summary>

          <label htmlFor="sdt">Số điện thoại khách</label>
          <input id="sdt" name="sdt" inputMode="tel" />

          <label htmlFor="hangMuc">Hạng mục</label>
          <select id="hangMuc" name="hangMuc" defaultValue="">
            <option value="">— tự nhận từ nội dung —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label htmlFor="kenh">Khách báo qua</label>
          <select id="kenh" name="kenh" defaultValue={searchParams.zalo ? 'zalo' : 'hotline'}>
            <option value="hotline">Gọi hotline</option>
            <option value="zalo">Zalo OA</option>
            <option value="truc_tiep">Báo trực tiếp</option>
          </select>
        </details>

        <input type="hidden" name="zaloUserId" defaultValue={searchParams.zalo || ''} />

        <div className="btn-row">
          <button type="submit">Tạo việc</button>
        </div>
      </form>
    </main>
  );
}
