import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { daDangNhap } from '@/lib/auth';
import { layWo, luuWo } from '@/lib/store';
import { createToken } from '@/lib/token';
import { getUnit } from '@/lib/units';
import { CHANNEL_LABEL, CRITERIA, STATUS_LABEL, type Status } from '@/lib/types';
import { coTheChuyen, diemTrungBinh, tienThuong, xepThuong } from '@/lib/wo';
import { baoBQL, guiZaloOA } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function baseUrl(): string {
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function gio(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export default async function ChiTiet({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { gui?: string };
}) {
  if (!daDangNhap()) redirect('/login');

  const wo = await layWo(params.id);
  if (!wo) notFound();

  const unit = getUnit(wo.unitId);
  const thuong = xepThuong(wo.feedback);
  const diem = wo.feedback ? diemTrungBinh(wo.feedback.ratings) : null;

  async function chuyen(formData: FormData) {
    'use server';
    const den = String(formData.get('den')) as Status;
    const cur = await layWo(params.id);
    if (!cur) notFound();
    if (!coTheChuyen(cur.trangThai, den)) redirect(`/admin/wo/${params.id}`);

    const now = new Date().toISOString();
    cur.trangThai = den;

    if (den === 'dang_lam') {
      const tho = String(formData.get('tho') || '').trim();
      if (tho) cur.tho = tho;
      cur.log.push({ luc: now, ai: 'BQL', viec: `Giao cho thợ ${cur.tho || '(chưa ghi tên)'}` });
    }

    if (den === 'cho_danh_gia') {
      cur.xongLuc = now;
      cur.token = createToken(cur.id);
      cur.log.push({ luc: now, ai: 'BQL', viec: 'Thợ báo xong — phát link đánh giá cho khách' });
    }

    await luuWo(cur, `chuyển trạng thái ${den}`);
    redirect(`/admin/wo/${params.id}`);
  }

  async function guiZalo() {
    'use server';
    const cur = await layWo(params.id);
    if (!cur?.token || !cur.zaloUserId) redirect(`/admin/wo/${params.id}?gui=thieu`);

    const link = `${baseUrl()}/f/${cur.token}`;
    const kq = await guiZaloOA(
      cur.zaloUserId,
      `Ban quản lý Ny'ah Phú Định: công việc ${cur.hangMuc.toLowerCase()} tại căn ${cur.unitId} đã làm xong.\nAnh/chị vui lòng xác nhận và nhận xét giúp: ${link}`,
    );
    cur.log.push({ luc: new Date().toISOString(), ai: 'Hệ thống', viec: kq.ghiChu });
    await luuWo(cur, 'gửi link đánh giá qua Zalo');
    redirect(`/admin/wo/${params.id}?gui=${kq.ok ? 'ok' : 'loi'}`);
  }

  const link = wo.token ? `${baseUrl()}/f/${wo.token}` : null;
  const qr = link ? await QRCode.toDataURL(link, { width: 420, margin: 1 }) : null;

  return (
    <main className="wrap">
      <div className="top">
        <div>
          <h1>Căn {wo.unitId} — {wo.hangMuc}</h1>
          <p className="muted">{wo.id} · {unit ? `${unit.model}, ${unit.dtDat} m²` : ''}</p>
        </div>
        <Link className="muted" href="/admin">← Danh sách</Link>
      </div>

      <div className="card">
        <span className={`pill ${wo.trangThai}`}>{STATUS_LABEL[wo.trangThai]}</span>
        <dl className="kv" style={{ marginTop: 14 }}>
          <dt>Khách</dt><dd>{wo.khach}{wo.sdt ? ` · ${wo.sdt}` : ''}</dd>
          <dt>Báo qua</dt><dd>{CHANNEL_LABEL[wo.kenh]}</dd>
          <dt>Nội dung</dt><dd>{wo.moTa}</dd>
          <dt>Thợ</dt><dd>{wo.tho || '— chưa giao —'}</dd>
          <dt>Tiếp nhận</dt><dd>{gio(wo.taoLuc)}</dd>
        </dl>

        {wo.trangThai === 'moi' && (
          <form action={chuyen} className="btn-row">
            <input type="hidden" name="den" value="dang_lam" />
            <input name="tho" placeholder="Tên thợ" defaultValue={wo.tho} style={{ maxWidth: 220 }} />
            <button type="submit">Giao thợ, bắt đầu làm</button>
          </form>
        )}

        {(wo.trangThai === 'dang_lam' || wo.trangThai === 'lam_lai') && (
          <form action={chuyen} className="btn-row">
            <input type="hidden" name="den" value={wo.trangThai === 'lam_lai' ? 'dang_lam' : 'cho_danh_gia'} />
            <button type="submit">
              {wo.trangThai === 'lam_lai' ? 'Nhận lại việc, làm tiếp' : 'Thợ báo xong → lấy mã đánh giá'}
            </button>
          </form>
        )}
      </div>

      {wo.trangThai === 'cho_danh_gia' && link && (
        <div className="card pad-lg">
          <h2 style={{ marginTop: 0 }}>Đưa khách quét mã này</h2>
          <p className="muted">
            Khách quét là mở thẳng form đánh giá, không cần cài gì, không cần đăng nhập.
            Mỗi mã chỉ gửi được một lần.
          </p>
          <div className="qr">
            {qr ? <img src={qr} alt={`Mã QR đánh giá việc ${wo.id}`} /> : null}
          </div>
          <label htmlFor="link">Hoặc copy link dán vào Zalo</label>
          <input id="link" readOnly value={link} />
          {wo.zaloUserId && (
            <form action={guiZalo} className="btn-row">
              <button type="submit">Gửi thẳng qua Zalo OA cho khách</button>
            </form>
          )}
          {searchParams.gui === 'ok' && <p className="ok-box" style={{ marginTop: 12 }}>Đã gửi qua Zalo OA.</p>}
          {searchParams.gui === 'loi' && (
            <p className="err" style={{ marginTop: 12 }}>
              Gửi qua Zalo OA không được (xem dòng thời gian bên dưới). Cứ copy link dán vào Zalo như thường.
            </p>
          )}
        </div>
      )}

      {wo.feedback && (
        <div className="card pad-lg">
          <h2 style={{ marginTop: 0 }}>Khách đánh giá</h2>
          <p>
            <strong>{wo.feedback.daXong ? 'Xác nhận đã xong' : 'Báo CHƯA xong'}</strong>
            {' · '}
            {wo.feedback.nguoiDanhGia} · {gio(wo.feedback.luc)}
          </p>
          <dl className="kv">
            {CRITERIA.map((c) => {
              const sao = wo.feedback?.ratings[c.key];
              return (
                <div key={c.key} style={{ display: 'contents' }}>
                  <dt>{c.label}</dt>
                  <dd>{sao ? `${'★'.repeat(sao)}${'☆'.repeat(5 - sao)}` : '— khách không chấm —'}</dd>
                </div>
              );
            })}
            <dt>Điểm chung</dt>
            <dd><strong>{diem !== null ? `${diem}/5` : '—'}</strong></dd>
            <dt>Mức thưởng</dt>
            <dd>
              {thuong.nhan}
              {tienThuong(thuong.muc) > 0 ? ` · ${tienThuong(thuong.muc).toLocaleString('vi-VN')} đ` : ''}
            </dd>
          </dl>
          {wo.feedback.yKien && <p style={{ marginTop: 12 }}>“{wo.feedback.yKien}”</p>}
          {wo.feedback.voice && (
            <div style={{ marginTop: 14 }}>
              <p className="muted" style={{ marginBottom: 6 }}>
                Khách nhắn bằng giọng nói ({wo.feedback.voice.giay} giây)
              </p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls preload="none" style={{ width: '100%' }} src={`/api/voice/${wo.id}`} />
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dòng thời gian</h2>
        <ul className="log">
          {wo.log.map((l, i) => (
            <li key={i}>
              <time>{gio(l.luc)}</time> — {l.ai}: {l.viec}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
