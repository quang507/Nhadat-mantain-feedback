import { redirect } from 'next/navigation';
import Link from 'next/link';
import { daDangNhap } from '@/lib/auth';
import { danhSachWo, layInbox, luuWo } from '@/lib/store';
import { UNITS } from '@/lib/units';
import { CATEGORIES, type Channel, type WorkOrder } from '@/lib/types';
import { nextWoId } from '@/lib/wo';
import { baoBQL } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export default function TaoViec({
  searchParams,
}: {
  searchParams: { khach?: string; zalo?: string; mota?: string };
}) {
  if (!daDangNhap()) redirect('/login');

  async function tao(formData: FormData) {
    'use server';

    const unitId = Number(formData.get('unitId'));
    const khach = String(formData.get('khach') || '').trim();
    const kenh = String(formData.get('kenh') || 'zalo') as Channel;
    const zaloUserId = String(formData.get('zaloUserId') || '').trim();
    const moTa = String(formData.get('moTa') || '').trim();

    if (!Number.isInteger(unitId) || unitId < 1 || unitId > 50 || !khach || !moTa) {
      redirect('/admin/new?loi=1');
    }

    const ids = (await danhSachWo()).map((w) => w.id);
    const now = new Date().toISOString();

    const wo: WorkOrder = {
      id: nextWoId(ids),
      unitId,
      khach,
      sdt: String(formData.get('sdt') || '').trim(),
      kenh,
      ...(zaloUserId ? { zaloUserId } : {}),
      hangMuc: String(formData.get('hangMuc') || 'Khác'),
      moTa,
      tho: String(formData.get('tho') || '').trim(),
      trangThai: 'moi',
      taoLuc: now,
      log: [{ luc: now, ai: 'BQL', viec: `Tiếp nhận từ ${kenh === 'hotline' ? 'hotline' : kenh === 'zalo' ? 'Zalo' : 'báo trực tiếp'}` }],
    };

    await luuWo(wo, 'tạo việc mới');

    // đánh dấu tin Zalo đã xử lý để nó không nằm lại trong hộp thư
    if (zaloUserId) {
      const { luuInbox } = await import('@/lib/store');
      const inbox = await layInbox();
      await luuInbox(inbox.map((i) => (i.zaloUserId === zaloUserId && !i.daXuLy ? { ...i, daXuLy: true } : i)));
    }

    await baoBQL(`Việc mới ${wo.id} — căn ${wo.unitId} — ${wo.hangMuc}\n${wo.moTa}`);
    redirect(`/admin/wo/${wo.id}`);
  }

  return (
    <main className="wrap">
      <div className="top">
        <h1>Tạo việc bảo trì</h1>
        <Link className="muted" href="/admin">← Danh sách</Link>
      </div>

      <form action={tao} className="card pad-lg">
        <label htmlFor="unitId">Căn số</label>
        <select id="unitId" name="unitId" required defaultValue="">
          <option value="" disabled>— chọn căn —</option>
          {UNITS.map((u) => (
            <option key={u.id} value={u.id}>
              Căn {u.id} — {u.model} ({u.dtDat} m²)
            </option>
          ))}
        </select>

        <label htmlFor="khach">Tên khách</label>
        <input
          id="khach"
          name="khach"
          required
          defaultValue={searchParams.khach || ''}
          placeholder="vd: Chị Trang"
        />
        <p className="muted" style={{ marginTop: 4 }}>
          Khách nhắn qua Zalo OA thì tên đã điền sẵn. Khách gọi hotline thì BQL gõ tay vào đây.
        </p>

        <label htmlFor="sdt">Số điện thoại (không bắt buộc)</label>
        <input id="sdt" name="sdt" inputMode="tel" />

        <label htmlFor="kenh">Khách báo qua</label>
        <select id="kenh" name="kenh" defaultValue={searchParams.zalo ? 'zalo' : 'hotline'}>
          <option value="zalo">Zalo OA</option>
          <option value="hotline">Gọi hotline</option>
          <option value="truc_tiep">Báo trực tiếp</option>
        </select>

        <label htmlFor="hangMuc">Hạng mục</label>
        <select id="hangMuc" name="hangMuc" defaultValue="Khác">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label htmlFor="moTa">Khách báo gì</label>
        <textarea id="moTa" name="moTa" required defaultValue={searchParams.mota || ''} />

        <label htmlFor="tho">Giao cho thợ (điền sau cũng được)</label>
        <input id="tho" name="tho" placeholder="vd: Anh Hùng" />

        <input type="hidden" name="zaloUserId" defaultValue={searchParams.zalo || ''} />

        <div className="btn-row">
          <button type="submit">Tạo việc</button>
        </div>
      </form>
    </main>
  );
}
