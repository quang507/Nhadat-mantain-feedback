'use client';

import { useState } from 'react';
import { CRITERIA, type CriteriaKey } from '@/lib/types';

interface Props {
  token: string;
  woId: string;
  unitId: number;
  model: string;
  hangMuc: string;
  moTa: string;
  tho: string;
  khach: string;
}

const MAC_DINH: Record<CriteriaKey, number> = { dung_hen: 0, thai_do: 0, chat_luong: 0, ve_sinh: 0 };

export default function FormDanhGia(p: Props) {
  const [daXong, setDaXong] = useState<boolean | null>(null);
  const [ratings, setRatings] = useState<Record<CriteriaKey, number>>(MAC_DINH);
  const [yKien, setYKien] = useState('');
  const [nguoi, setNguoi] = useState(p.khach);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState('');
  const [xong, setXong] = useState(false);

  const thieuSao = CRITERIA.some((c) => ratings[c.key] === 0);
  const canYKien = daXong === false || CRITERIA.some((c) => ratings[c.key] > 0 && ratings[c.key] <= 2);
  const hopLe = daXong !== null && !thieuSao && nguoi.trim() !== '' && (!canYKien || yKien.trim() !== '');

  async function gui() {
    setDangGui(true);
    setLoi('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: p.token, daXong, ratings, yKien, nguoiDanhGia: nguoi.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoi(json?.loi || 'Gửi không được, anh/chị thử lại giúp.');
        setDangGui(false);
        return;
      }
      setXong(true);
    } catch {
      setLoi('Mạng đang trục trặc, anh/chị thử lại giúp.');
      setDangGui(false);
    }
  }

  if (xong) {
    return (
      <main className="wrap">
        <div className="card pad-lg" style={{ marginTop: 24 }}>
          <h1>Cảm ơn {nguoi}</h1>
          <p className="muted">
            {daXong
              ? 'Ban quản lý đã nhận được xác nhận và nhận xét của anh/chị.'
              : 'Ban quản lý đã nhận phản ánh và sẽ cho thợ quay lại xử lý.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <h1>Nhận xét công việc</h1>
      <p className="muted">Ban quản lý Ny&apos;ah Phú Định · {p.woId}</p>

      <div className="card">
        <dl className="kv">
          <dt>Căn</dt><dd>Căn {p.unitId}{p.model ? ` — ${p.model}` : ''}</dd>
          <dt>Việc</dt><dd>{p.hangMuc} — {p.moTa}</dd>
          <dt>Thợ</dt><dd>{p.tho || '—'}</dd>
        </dl>
      </div>

      <div className="card pad-lg">
        <label>Công việc đã xong chưa?</label>
        <div className="yesno">
          <button type="button" aria-pressed={daXong === true} onClick={() => setDaXong(true)}>Đã xong</button>
          <button type="button" aria-pressed={daXong === false} onClick={() => setDaXong(false)}>Chưa xong</button>
        </div>

        {CRITERIA.map((c) => (
          <div key={c.key}>
            <label>{c.label}</label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${c.label}: ${n} sao`}
                  aria-pressed={ratings[c.key] === n}
                  onClick={() => setRatings({ ...ratings, [c.key]: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}

        <label htmlFor="ykien">Ý kiến {canYKien ? '(cần ghi rõ giúp BQL)' : '(không bắt buộc)'}</label>
        <textarea id="ykien" value={yKien} onChange={(e) => setYKien(e.target.value)} />

        <label htmlFor="nguoi">Người nhận xét</label>
        <input id="nguoi" value={nguoi} onChange={(e) => setNguoi(e.target.value)} />

        {loi && <p className="err" style={{ marginTop: 14 }}>{loi}</p>}

        <div className="btn-row">
          <button type="button" disabled={!hopLe || dangGui} onClick={gui}>
            {dangGui ? 'Đang gửi…' : 'Gửi nhận xét'}
          </button>
        </div>
        {!hopLe && (
          <p className="muted" style={{ marginTop: 8 }}>
            {daXong === null
              ? 'Anh/chị chọn giúp công việc đã xong chưa.'
              : thieuSao
                ? 'Anh/chị chấm giúp đủ 4 mục ở trên (1 là kém, 5 là rất tốt).'
                : canYKien
                  ? 'Anh/chị ghi giúp vài chữ để Ban quản lý biết đường xử lý.'
                  : 'Anh/chị điền tên người nhận xét.'}
          </p>
        )}
      </div>
    </main>
  );
}
