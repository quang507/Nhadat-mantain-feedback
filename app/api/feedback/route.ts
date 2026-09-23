import { NextResponse } from 'next/server';
import { layWo, luuVoice, luuWo } from '@/lib/store';
import { readToken } from '@/lib/token';
import { CRITERIA, type CriteriaKey, type Ratings, type VoiceNote } from '@/lib/types';
import { diemTrungBinh, xepThuong } from '@/lib/wo';
import { baoBQL } from '@/lib/notify';

export const dynamic = 'force-dynamic';

/** Khách nói tối đa 60 giây; chặn ở đây để không ai đẩy file lớn lên. */
const VOICE_TOI_DA = 3 * 1024 * 1024;

const DUOI_THEO_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',   // iPhone ghi ra định dạng này
  'audio/mpeg': 'mp3',
  'audio/aac': 'aac',
};

/** Khách bấm "chưa xong" thì không chấm sao -> chấp nhận bỏ trống. */
function docRatings(raw: unknown, batBuoc: boolean): Ratings | null {
  if (raw === undefined || raw === null) return batBuoc ? null : {};
  if (typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: Ratings = {};
  for (const c of CRITERIA) {
    const v = r[c.key];
    if (v === undefined || v === null) {
      if (batBuoc) return null;
      continue;
    }
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) return null;
    out[c.key as CriteriaKey] = v;
  }
  return out;
}

function docVoice(raw: unknown): { note: VoiceNote; data: Buffer } | null | 'loi' {
  if (!raw) return null;
  if (typeof raw !== 'object') return 'loi';
  const v = raw as { mime?: unknown; giay?: unknown; data?: unknown };

  const mime = String(v.mime || '').split(';')[0].trim();
  const duoi = DUOI_THEO_MIME[mime];
  if (!duoi) return 'loi';

  const giay = Number(v.giay);
  if (!Number.isFinite(giay) || giay < 1 || giay > 120) return 'loi';

  if (typeof v.data !== 'string' || v.data.length === 0) return 'loi';
  const data = Buffer.from(v.data, 'base64');
  if (data.length === 0 || data.length > VOICE_TOI_DA) return 'loi';

  return { note: { duoi, mime, giay: Math.round(giay) }, data };
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

  const ratings = docRatings(body.ratings, daXong);
  if (!ratings) return NextResponse.json({ loi: 'Chấm chưa đủ 4 mục' }, { status: 400 });

  const voice = docVoice(body.voice);
  if (voice === 'loi') return NextResponse.json({ loi: 'Lời nhắn bằng giọng nói không gửi được' }, { status: 400 });

  const yKien = String(body.yKien || '').trim().slice(0, 2000);

  // Chưa xong thì phải nói rõ vì sao - gõ chữ hoặc nói, cái nào cũng được.
  if (!daXong && !yKien && !voice) {
    return NextResponse.json({ loi: 'Nhờ anh/chị ghi vài chữ hoặc nói một câu để BQL biết đường xử lý' }, { status: 400 });
  }

  const wo = await layWo(kq.payload.wo);
  if (!wo) return NextResponse.json({ loi: 'Không tìm thấy công việc' }, { status: 404 });

  // một link chỉ gửi được một lần
  if (wo.feedback) return NextResponse.json({ loi: 'Nhận xét cho việc này đã được gửi trước đó' }, { status: 409 });
  if (wo.trangThai !== 'cho_danh_gia') {
    return NextResponse.json({ loi: 'Công việc chưa tới bước đánh giá' }, { status: 409 });
  }

  // Lưu file tiếng trước: hỏng thì vẫn nhận phần chấm điểm, chỉ mất lời nhắn.
  let voiceNote: VoiceNote | undefined;
  let voiceLoi = '';
  if (voice) {
    try {
      await luuVoice(wo.id, voice.note.duoi, voice.data);
      voiceNote = voice.note;
    } catch (err) {
      voiceLoi = `Không lưu được lời nhắn bằng giọng nói: ${String(err)}`;
    }
  }

  const now = new Date().toISOString();
  const diem = diemTrungBinh(ratings);

  wo.feedback = {
    daXong,
    ratings,
    yKien,
    ...(voiceNote ? { voice: voiceNote } : {}),
    nguoiDanhGia: wo.khach,   // đã biết từ lúc tiếp nhận, không bắt khách gõ lại
    luc: now,
    jti: kq.payload.jti,
  };
  wo.trangThai = daXong ? 'xong' : 'lam_lai';
  if (daXong) wo.dongLuc = now;
  wo.token = undefined; // link đã dùng xong

  wo.log.push({
    luc: now,
    ai: 'Khách',
    viec:
      (daXong ? `Xác nhận đã xong${diem !== null ? `, điểm ${diem}/5` : ''}` : 'Báo CHƯA xong') +
      (voiceNote ? ` · có lời nhắn ${voiceNote.giay}s` : ''),
  });
  if (voiceLoi) wo.log.push({ luc: now, ai: 'Hệ thống', viec: voiceLoi });

  await luuWo(wo, 'khách gửi nhận xét');

  const thuong = xepThuong(wo.feedback);
  await baoBQL(
    `${wo.id} — căn ${wo.unitId}: ${daXong ? 'khách xác nhận XONG' : 'khách báo CHƯA XONG'}\n` +
      `${diem !== null ? `Điểm ${diem}/5 · ` : ''}${thuong.nhan}\n` +
      (yKien ? `Ý kiến: ${yKien}\n` : '') +
      (voiceNote ? `Có lời nhắn bằng giọng nói (${voiceNote.giay}s), nghe trong trang việc.` : ''),
  );

  return NextResponse.json({ ok: true });
}
