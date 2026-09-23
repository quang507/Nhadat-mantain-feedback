import Link from 'next/link';
import { redirect } from 'next/navigation';
import { daDangNhap } from '@/lib/auth';
import { danhSachWo, layInbox } from '@/lib/store';
import { STATUS_LABEL, type WorkOrder } from '@/lib/types';
import { dangMo, soNgayMo, diemTrungBinh } from '@/lib/wo';

export const dynamic = 'force-dynamic';

function Dong({ wo }: { wo: WorkOrder }) {
  const ngay = soNgayMo(wo);
  return (
    <li>
      <div className="row">
        <div>
          <Link href={`/admin/wo/${wo.id}`} style={{ fontWeight: 500 }}>
            Căn {wo.unitId} — {wo.hangMuc}
          </Link>
          <div className="muted">
            {wo.id} · {wo.khach || 'chưa rõ khách'} · {ngay === 0 ? 'hôm nay' : `${ngay} ngày`}
            {wo.tho ? ` · thợ ${wo.tho}` : ' · chưa giao thợ'}
          </div>
        </div>
        <span className={`pill ${wo.trangThai}`}>{STATUS_LABEL[wo.trangThai]}</span>
      </div>
    </li>
  );
}

export default async function Admin() {
  if (!daDangNhap()) redirect('/login');

  const tatCa = await danhSachWo();
  const inbox = await layInbox();
  const mo = tatCa.filter(dangMo);
  const xong = tatCa.filter((w) => !dangMo(w)).slice(0, 10);
  const choDanhGia = mo.filter((w) => w.trangThai === 'cho_danh_gia').length;
  const chuaXuLy = inbox.filter((i) => !i.daXuLy);

  const daCham = tatCa.filter((w) => w.feedback);
  const diemTB = daCham.length
    ? Math.round((daCham.reduce((s, w) => s + diemTrungBinh(w.feedback!.ratings), 0) / daCham.length) * 100) / 100
    : null;

  return (
    <main className="wrap wide">
      <div className="top">
        <div>
          <h1>Việc bảo trì</h1>
          <p className="muted">
            {mo.length} việc đang mở
            {choDanhGia > 0 ? ` · ${choDanhGia} chờ khách đánh giá` : ''}
            {diemTB !== null ? ` · điểm trung bình ${diemTB}/5` : ''}
          </p>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <Link className="btn" href="/admin/new">+ Tạo việc</Link>
          <Link className="btn btn-ghost" href="/admin/thuong">Bảng thưởng</Link>
        </div>
      </div>

      {chuaXuLy.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Khách vừa nhắn qua Zalo OA</h2>
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
        <h2 style={{ marginTop: 0 }}>Đang xử lý</h2>
        {mo.length === 0 ? (
          <p className="muted">Không có việc nào đang mở.</p>
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
