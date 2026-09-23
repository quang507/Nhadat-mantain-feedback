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

const GIAY_TOI_DA = 60;

/** Năm mức hài lòng. Mặt khác nhau nên người không phân biệt màu vẫn chọn đúng. */
const MUC = [
  { icon: '😠', nhan: 'Tệ' },
  { icon: '🙁', nhan: 'Chưa được' },
  { icon: '😐', nhan: 'Tạm' },
  { icon: '🙂', nhan: 'Tốt' },
  { icon: '😍', nhan: 'Rất tốt!' },
];

const KHEN: Record<CriteriaKey, string> = {
  dung_hen: 'Đến đúng hẹn',
  thai_do: 'Thái độ lịch sự',
  chat_luong: 'Sửa được việc',
  ve_sinh: 'Dọn dẹp sạch sẽ',
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
    if (recRef.current?.state === 'recording') recRef.current.stop();
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

    const kieu = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m));
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

export default function FormDanhGia(p: Props) {
  const [daXong, setDaXong] = useState<boolean | null>(null);
  const [muc, setMuc] = useState(0);                       // 1..5
  const [khen, setKhen] = useState<CriteriaKey[]>([]);
  const [yKien, setYKien] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState('');
  const [guiRoi, setGuiRoi] = useState(false);
  const [sanSang, setSanSang] = useState(false);

  const ghi = useGhiAm();
  useEffect(() => setSanSang(true), []);

  // Xong rồi: phải chọn mức hài lòng. Chưa xong: phải nói rõ vì sao (gõ hoặc nói).
  const duocGui =
    sanSang &&
    (daXong === true ? muc > 0 : daXong === false ? Boolean(yKien.trim()) || Boolean(ghi.xong) : false);

  function chonXong(giaTri: boolean) {
    setDaXong(giaTri);
    rung(8);
  }

  function doiKhen(key: CriteriaKey) {
    setKhen((cu) => (cu.includes(key) ? cu.filter((k) => k !== key) : [...cu, key]));
    rung(6);
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
          mucHaiLong: daXong ? muc : undefined,
          khen: daXong ? khen : undefined,
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

  if (guiRoi) {
    return (
      <main className="k">
        <div className="xong-man">
          <div className="tick-to">✓</div>
          <h1>{daXong ? 'Cảm ơn anh/chị' : 'Đã báo Ban quản lý'}</h1>
          <p className="sub">
            {daXong
              ? `Ban quản lý đã nhận nhận xét${muc ? ` — ${MUC[muc - 1].nhan.replace('!', '')}` : ''}${
                  khen.length ? `, khen thợ ${khen.length}/4 mục.` : '.'
                }`
              : 'Ban quản lý sẽ cho thợ quay lại xử lý và báo lại anh/chị.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="k">
      <div className="top">
        <span className="ten">Căn {p.unitId}</span>
        <span className="phu">{p.hangMuc}{p.tho ? ` · thợ ${p.tho}` : ''}</span>
      </div>

      <h1>Anh/chị thấy thợ làm thế nào?</h1>
      <p className="sub">{p.moTa}</p>

      <h2>Việc đã xong chưa?</h2>
      <div className="doi">
        <button type="button" disabled={!sanSang} aria-pressed={daXong === true} onClick={() => chonXong(true)}>
          Xong rồi
        </button>
        <button type="button" className="xau" disabled={!sanSang} aria-pressed={daXong === false}
          onClick={() => chonXong(false)}>
          Chưa xong
        </button>
      </div>

      {daXong === true && (
        <>
          <h2>Anh/chị hài lòng tới đâu?</h2>
          <div className="mat" role="group" aria-label="Mức hài lòng">
            {MUC.map((m, i) => (
              <button key={m.nhan} type="button" aria-pressed={muc === i + 1} aria-label={m.nhan}
                onClick={() => { setMuc(i + 1); rung(8); }}>
                <span className="vong" aria-hidden="true">{m.icon}</span>
                <span className="nhan">{m.nhan}</span>
              </button>
            ))}
          </div>

          <h2>Thợ được ở chỗ nào ạ?</h2>
          <ul className="ds">
            {CRITERIA.map((c) => (
              <li key={c.key}>
                <button type="button" aria-pressed={khen.includes(c.key)} onClick={() => doiKhen(c.key)}>
                  <span className="chu">{KHEN[c.key]}</span>
                  <span className="o" aria-hidden="true">✓</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>{daXong === false ? 'Còn chỗ nào chưa ổn ạ?' : 'Muốn nhắn gì thêm không?'}</h2>
      <textarea
        id="ykien"
        value={yKien}
        onChange={(e) => setYKien(e.target.value)}
        placeholder={
          daXong === false
            ? 'Ví dụ: chân bồn rửa vẫn còn rỉ nước.'
            : 'Không bắt buộc — anh/chị gõ vài chữ hoặc bấm nói.'
        }
      />

      {ghi.xong ? (
        <div className="daghi">
          Đã ghi <b>{dinhDang(ghi.xong.giay)}</b> giọng nói
          <button className="x" type="button" onClick={ghi.xoa}>Ghi lại</button>
        </div>
      ) : (
        <button
          type="button"
          className={`mic${ghi.dangThu ? ' thu' : ''}`}
          disabled={!sanSang}
          onClick={() => (ghi.dangThu ? ghi.dung() : ghi.bat())}
        >
          <IconMic />
          {ghi.dangThu ? (
            <>
              <span>Đang nghe · <span className="giay">{dinhDang(ghi.giay)}</span> · chạm để dừng</span>
              <span className="song" aria-hidden="true"><i /><i /><i /><i /></span>
            </>
          ) : (
            <span>Nhắn bằng giọng nói</span>
          )}
        </button>
      )}

      <p className="ghichu">
        {ghi.loi || 'Chỉ Ban quản lý nghe lại lời nhắn này.'}
      </p>

      {loi && <p className="loi">{loi}</p>}

      <button type="button" className="gui" disabled={!duocGui || dangGui} onClick={gui}>
        {dangGui ? 'Đang gửi…' : daXong === false ? 'Báo Ban quản lý' : 'Gửi cho Ban quản lý'}
      </button>

      {!duocGui && sanSang && (
        <p className="ghichu">
          {daXong === null
            ? 'Anh/chị chọn giúp việc đã xong chưa.'
            : daXong
              ? 'Anh/chị chọn giúp một mặt ở trên.'
              : 'Anh/chị ghi vài chữ hoặc bấm nói, để thợ biết đường quay lại.'}
        </p>
      )}
    </main>
  );
}
