import Link from 'next/link';
import { redirect } from 'next/navigation';
import { COOKIE, aiDangDangNhap, daDangNhap } from '@/lib/auth';
import { chayTam, danhSachWo, layInbox, layWo, luuWo } from '@/lib/store';
import { STATUS_LABEL, type WorkOrder } from '@/lib/types';
import { createToken } from '@/lib/token';
import { coTheChuyen, dangMo, diemCua, soNgayMo } from '@/lib/wo';

export const dynamic = 'force-dynamic';

/** Đẩy việc sang bước kế ngay từ danh sách - BQL khỏi phải mở chi tiết rồi bấm tiếp. */
async function buocKe(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const wo = await layWo(id);
  if (!wo) redirect('/admin');

  const den = wo.trangThai === 'moi' ? 'dang_lam' : 'cho_danh_gia';
  if (!coTheChuyen(wo.trangThai, den)) redirect('/admin');

  const now = new Date().toISOString();
  wo.trangThai = den;
  if (den === 'cho_danh_gia') {
    wo.xongLuc = now;
    wo.token = createToken(wo.id);
    wo.log.push({ luc: now, ai: 'BQL', viec: 'Thợ báo xong — phát link đánh giá cho khách' });
    await luuWo(wo, 'thợ báo xong');
    redirect(`/admin/wo/${wo.id}`);   // sang thẳng trang có mã QR
  }

  wo.log.push({ luc: now, ai: 'BQL', viec: `Giao cho thợ ${wo.tho || '(chưa ghi tên)'}` });
  await luuWo(wo, 'giao thợ');
  redirect('/admin');
}

function Dong({ wo }: { wo: WorkOrder }) {
  const ngay = soNgayMo(wo);
  const nut =
    wo.trangThai === 'moi' ? 'Giao thợ'
    : wo.trangThai === 'dang_lam' || wo.trangThai === 'lam_lai' ? 'Thợ xong → QR'
    : null;

  return (
    <li>
      <div className="row">
        <div style={{ minWidth: 0 }}>
          <Link href={`/admin/wo/${wo.id}`} style={{ fontWeight: 500 }}>
            Căn {wo.unitId} — {wo.hangMuc}
          </Link>
          <div className="muted">
            {wo.khach || 'chưa rõ khách'} · {ngay === 0 ? 'hôm nay' : `${ngay} ngày`}
            {wo.tho ? ` · ${wo.tho}` : ' · chưa giao thợ'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`pill ${wo.trangThai}`}>{STATUS_LABEL[wo.trangThai]}</span>
          {nut && (
            <form action={buocKe}>
              <input type="hidden" name="id" value={wo.id} />
              <button type="submit" className="btn-ghost" style={{ padding: '8px 14px', fontSize: '0.875rem' }}>
                {nut}
              </button>
            </form>
          )}
          {wo.trangThai === 'cho_danh_gia' && (
            <Link className="btn btn-ghost" href={`/admin/wo/${wo.id}`}
              style={{ padding: '8px 14px', fontSize: '0.875rem' }}>
              Mở mã QR
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

async function thoat() {
  'use server';
  const { cookies } = await import('next/headers');
  cookies().delete(COOKIE);
  redirect('/login');
}

export default async function Admin() {
  if (!daDangNhap()) redirect('/login');
  const ai = aiDangDangNhap();

  const tatCa = await danhSachWo();
  const inbox = await layInbox();
  const mo = tatCa.filter(dangMo);
  const xong = tatCa.filter((w) => !dangMo(w)).slice(0, 8);
  const chuaXuLy = inbox.filter((i) => !i.daXuLy);

  // Việc khách báo "chưa xong" không có điểm, nên chỉ lấy trung bình trên việc đã chấm.
  const coDiem = tatCa
    .map((w) => diemCua(w.feedback))
    .filter((d): d is number => d !== null);
  const diemTB = coDiem.length
    ? Math.round((coDiem.reduce((a, b) => a + b, 0) / coDiem.length) * 100) / 100
    : null;

  return (
    <main className="wrap wide">
      {chayTam() && (
        <p className="err" style={{ marginBottom: 16 }}>
          <strong>Đang chạy thử.</strong> Chưa cấu hình <code>GITHUB_TOKEN</code> nên dữ liệu chỉ nằm
          trong ổ tạm của máy chủ và sẽ mất khi Vercel khởi động lại.
        </p>
      )}

      <div className="top">
        <div>
          <h1>Việc bảo trì</h1>
          <p className="muted">
            {mo.length} việc đang mở{diemTB !== null ? ` · điểm trung bình ${diemTB}/5` : ''}
            {ai && ai !== 'BQL' ? ` · ${ai}` : ''}
          </p>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <Link className="btn" href="/admin/new">+ Việc mới</Link>
          <Link className="btn btn-ghost" href="/admin/thuong">Thưởng thợ</Link>
          <form action={thoat}>
            <button type="submit" className="btn-ghost" style={{ padding: '12px 14px' }}>Thoát</button>
          </form>
        </div>
      </div>

      {chuaXuLy.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Khách vừa nhắn Zalo</h2>
          <ul className="list">
            {chuaXuLy.map((i) => (
              <li key={i.zaloUserId + i.luc}>
                <div className="row">
                  <div>
                    <strong>{i.ten}</strong>
                    <div className="muted">{i.tinNhan}</div>
                  </div>
                  <Link
                    className="btn btn-ghost"
                    href={`/admin/new?khach=${encodeURIComponent(i.ten)}&zalo=${encodeURIComponent(i.zaloUserId)}&mota=${encodeURIComponent(i.tinNhan)}`}
                  >
                    Tạo việc
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        {mo.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Không có việc nào đang mở.</p>
        ) : (
          <ul className="list">{mo.map((w) => <Dong key={w.id} wo={w} />)}</ul>
        )}
      </section>

      {xong.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Đã xong gần đây</h2>
          <ul className="list">{xong.map((w) => <Dong key={w.id} wo={w} />)}</ul>
        </section>
      )}
    </main>
  );
}
