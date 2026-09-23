'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CRITERIA, type CriteriaKey } from '@/lib/types';
import './khach.css';

interface Props {
  token: string;
  woId: string;
  unitId: number;
  hangMuc: string;
  moTa: string;
  tho: string;
}

type Diem = Partial<Record<CriteriaKey, number>>;

const GIAY_TOI_DA = 60;
const CAU_HOI: Record<CriteriaKey, { hoi: string; thap: string; cao: string }> = {
  dung_hen: { hoi: 'Thợ đến có đúng hẹn không?', thap: 'Trễ nhiều', cao: 'Rất đúng giờ' },
  thai_do: { hoi: 'Thái độ, tác phong thế nào?', thap: 'Chưa được', cao: 'Rất tốt' },
  chat_luong: { hoi: 'Sửa có được việc không?', thap: 'Còn lỗi', cao: 'Rất ổn' },
  ve_sinh: { hoi: 'Làm xong có dọn sạch không?', thap: 'Còn bừa', cao: 'Sạch sẽ' },
};

function dinhDang(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function rung(kieu: number | number[]) {
  try {
    navigator.vibrate?.(kieu);
  } catch {
    /* máy không có thì thôi */
  }
}

function Sao() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15zm6-3.5a6 6 0 0 1-5 5.92V20h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.58a6 6 0 0 1-5-5.92 1 1 0 1 1 2 0 4 4 0 0 0 8 0 1 1 0 1 1 2 0z" />
    </svg>
  );
}

/** Ghi âm bằng MediaRecorder. iPhone ghi ra audio/mp4, Android thường là webm. */
function useGhiAm() {
  const [dangThu, setDangThu] = useState(false);
  const [giay, setGiay] = useState(0);
  const [xong, setXong] = useState<{ base64: string; mime: string; giay: number } | null>(null);
  const [loi, setLoi] = useState('');

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const demRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const giayRef = useRef(0);

  const dung = useCallback(() => {
    if (demRef.current) clearInterval(demRef.current);
    demRef.current = null;
    recRef.current?.state === 'recording' && recRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setDangThu(false);
    rung(8);
  }, []);

  useEffect(() => () => {
    if (demRef.current) clearInterval(demRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const bat = useCallback(async () => {
    setLoi('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setLoi('Máy này không ghi âm được, anh/chị gõ giúp vài chữ.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setLoi('Chưa bật được micro. Anh/chị cho phép micro rồi bấm lại, hoặc gõ vài chữ.');
      return;
    }

    const kieu = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(
      (m) => MediaRecorder.isTypeSupported?.(m),
    );
    const rec = new MediaRecorder(stream, kieu ? { mimeType: kieu } : undefined);
    const mieng: Blob[] = [];

    rec.ondataavailable = (e) => e.data.size > 0 && mieng.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(mieng, { type: rec.mimeType || 'audio/webm' });
      const doc = new FileReader();
      doc.onloadend = () => {
        const s = String(doc.result || '');
        const base64 = s.slice(s.indexOf(',') + 1);
        if (base64 && giayRef.current >= 1) {
          setXong({ base64, mime: (rec.mimeType || 'audio/webm').split(';')[0], giay: giayRef.current });
        }
      };
      doc.readAsDataURL(blob);
    };

    recRef.current = rec;
    streamRef.current = stream;
    giayRef.current = 0;
    setGiay(0);
    setXong(null);
    rec.start();
    setDangThu(true);
    rung(8);

    demRef.current = setInterval(() => {
      giayRef.current += 1;
      setGiay(giayRef.current);
      if (giayRef.current >= GIAY_TOI_DA) dung();
    }, 1000);
  }, [dung]);

  const xoa = useCallback(() => {
    setXong(null);
    setGiay(0);
    giayRef.current = 0;
  }, []);

  return { dangThu, giay, xong, loi, bat, dung, xoa };
}

function NutGhiAm({ chu, ghi }: { chu: string; ghi: ReturnType<typeof useGhiAm> }) {
  if (ghi.xong) {
    return (
      <div className="daghi">
        <div className="nhan">
          Đã ghi <b>{dinhDang(ghi.xong.giay)}</b> giọng nói
        </div>
        <button type="button" onClick={ghi.xoa}>Ghi lại</button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`mic${ghi.dangThu ? ' thu' : ''}`}
        onClick={() => (ghi.dangThu ? ghi.dung() : ghi.bat())}
      >
        <IconMic />
        {ghi.dangThu ? (
          <>
            <span>
              Đang nghe · <span className="giay">{dinhDang(ghi.giay)}</span> · chạm để dừng
            </span>
            <span className="song" aria-hidden="true">
              <i /><i /><i /><i /><i />
            </span>
          </>
        ) : (
          <span>{chu}</span>
        )}
      </button>
      {ghi.loi ? (
        <p className="ghichu">{ghi.loi}</p>
      ) : (
        <p className="ghichu">Chỉ Ban quản lý nghe lại lời nhắn này.</p>
      )}
    </>
  );
}

export default function FormDanhGia(p: Props) {
  const [buoc, setBuoc] = useState(0);   // 0: xong chưa · 1..4: bốn tiêu chí · 5: nhắn thêm
  const [lui, setLui] = useState(false);
  const [daXong, setDaXong] = useState<boolean | null>(null);
  const [diem, setDiem] = useState<Diem>({});
  const [yKien, setYKien] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState('');
  const [guiRoi, setGuiRoi] = useState(false);

  const ghi = useGhiAm();

  function di(toi: number, veTruoc = false) {
    setLui(veTruoc);
    setBuoc(toi);
  }

  function chonXong(giaTri: boolean) {
    setDaXong(giaTri);
    rung(8);
    setTimeout(() => di(giaTri ? 1 : 5), 180);
  }

  function chamSao(key: CriteriaKey, n: number) {
    setDiem((cu) => ({ ...cu, [key]: n }));
    rung(8);
    setTimeout(() => di(buoc + 1), 270);
  }

  async function gui() {
    setDangGui(true);
    setLoi('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: p.token,
          daXong,
          ratings: daXong ? diem : undefined,
          yKien: yKien.trim(),
          voice: ghi.xong ? { data: ghi.xong.base64, mime: ghi.xong.mime, giay: ghi.xong.giay } : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoi(json?.loi || 'Gửi không được, anh/chị thử lại giúp.');
        setDangGui(false);
        return;
      }
      rung([6, 40, 12]);
      setGuiRoi(true);
    } catch {
      setLoi('Mạng đang trục trặc, anh/chị thử lại giúp.');
      setDangGui(false);
    }
  }

  /* ---- màn cảm ơn ---- */
  if (guiRoi) {
    const chamDu = CRITERIA.map((c) => diem[c.key]).filter((v): v is number => typeof v === 'number');
    const tb = chamDu.length ? Math.round((chamDu.reduce((a, b) => a + b, 0) / chamDu.length) * 10) / 10 : null;
    return (
      <main className="k">
        <div className="stage">
          <section className="step done">
            <div className="tick">
              <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 25l8 8 15-17" /></svg>
            </div>
            <h1>{daXong ? 'Cảm ơn anh/chị' : 'Đã báo Ban quản lý'}</h1>
            <p className="sub">
              {daXong
                ? 'Ban quản lý đã nhận nhận xét của anh/chị.'
                : 'Ban quản lý sẽ cho thợ quay lại xử lý và báo lại anh/chị.'}
            </p>
            {daXong && tb !== null && (
              <div className="score">
                {p.tho || 'Thợ'}: {String(tb).replace('.', ',')} / 5
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  const tongBuoc = daXong === false ? 2 : 6;
  const buocHienTai = daXong === false ? (buoc === 5 ? 2 : 1) : buoc + 1;
  const tieuChi = buoc >= 1 && buoc <= 4 ? CRITERIA[buoc - 1] : null;
  const stepClass = `step${lui ? ' lui' : ''}`;

  return (
    <main className="k">
      <div className="bar">
        <div className="track">
          <i style={{ width: `${Math.round((buocHienTai / tongBuoc) * 100)}%` }} />
        </div>
        <div className="ctx">
          {buoc > 0 && (
            <button
              type="button"
              className="back"
              onClick={() => {
                if (daXong === false) { setDaXong(null); di(0, true); }
                else di(buoc - 1, true);
              }}
            >
              ‹ Quay lại
            </button>
          )}
          <span className="who">
            Căn <b>{p.unitId}</b> · {p.hangMuc}
            {p.tho ? <> · thợ <b>{p.tho}</b></> : null}
          </span>
        </div>
      </div>

      <div className="stage">
        {buoc === 0 && (
          <section className={stepClass} key="b0">
            <h1>Thợ làm xong việc chưa ạ?</h1>
            <p className="sub">{p.moTa}</p>
            <div className="stack">
              <button type="button" className="big" onClick={() => chonXong(true)}>Xong rồi</button>
              <button type="button" className="big" onClick={() => chonXong(false)}>Chưa xong</button>
            </div>
          </section>
        )}

        {tieuChi && (
          <section className={stepClass} key={tieuChi.key}>
            <h1>{CAU_HOI[tieuChi.key].hoi}</h1>
            <div className="stars" role="group" aria-label={tieuChi.label}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={(diem[tieuChi.key] ?? 0) >= n ? 'lit' : ''}
                  aria-label={`${n} trên 5`}
                  onClick={() => chamSao(tieuChi.key, n)}
                >
                  <Sao />
                </button>
              ))}
            </div>
            <div className="scale">
              <span>{CAU_HOI[tieuChi.key].thap}</span>
              <span>{CAU_HOI[tieuChi.key].cao}</span>
            </div>
          </section>
        )}

        {buoc === 5 && daXong === true && (
          <section className={stepClass} key="b5">
            <h1>Anh/chị muốn nhắn gì thêm không?</h1>
            <p className="sub">Không bắt buộc — bỏ qua cũng được.</p>
            <textarea
              id="ykien"
              value={yKien}
              onChange={(e) => setYKien(e.target.value)}
              placeholder="Ví dụ: thợ đến sớm hơn hẹn, làm xong lau sạch sàn."
            />
            <div className="hoac">hoặc nói cho nhanh</div>
            <NutGhiAm chu="Nhắn bằng giọng nói" ghi={ghi} />
            {loi && <p className="loi">{loi}</p>}
            <div className="stack">
              <button type="button" className="big pick" disabled={dangGui} onClick={gui}>
                {dangGui ? 'Đang gửi…' : 'Gửi cho Ban quản lý'}
              </button>
              <button
                type="button"
                className="big ghost"
                disabled={dangGui}
                onClick={() => { setYKien(''); ghi.xoa(); gui(); }}
              >
                Không có gì thêm, gửi luôn
              </button>
            </div>
          </section>
        )}

        {buoc === 5 && daXong === false && (
          <section className={stepClass} key="b5x">
            <h1>Còn chỗ nào chưa ổn ạ?</h1>
            <p className="sub">Ban quản lý sẽ cho thợ quay lại xử lý.</p>
            <textarea
              id="chua-on"
              value={yKien}
              onChange={(e) => setYKien(e.target.value)}
              placeholder="Ví dụ: chân bồn rửa vẫn còn rỉ nước."
            />
            <div className="hoac">hoặc nói cho nhanh</div>
            <NutGhiAm chu="Nói cho Ban quản lý nghe" ghi={ghi} />
            {loi && <p className="loi">{loi}</p>}
            <div className="stack">
              <button
                type="button"
                className="big pick"
                disabled={dangGui || (!yKien.trim() && !ghi.xong)}
                onClick={gui}
              >
                {dangGui ? 'Đang gửi…' : 'Báo Ban quản lý'}
              </button>
            </div>
            {!yKien.trim() && !ghi.xong && (
              <p className="ghichu">Anh/chị ghi vài chữ hoặc bấm nói, để thợ biết đường quay lại.</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
