// Phát lại lời nhắn bằng giọng nói của khách. Chỉ BQL nghe được:
// đây là lời của cư dân trong nhà họ, không để ai có link cũng mở.
import { NextResponse } from 'next/server';
import { daDangNhap } from '@/lib/auth';
import { docVoice, layWo } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!daDangNhap()) return NextResponse.json({ loi: 'Cần đăng nhập' }, { status: 401 });

  const wo = await layWo(params.id);
  const voice = wo?.feedback?.voice;
  if (!wo || !voice) return NextResponse.json({ loi: 'Không có lời nhắn' }, { status: 404 });

  const buf = await docVoice(wo.id, voice.duoi);
  if (!buf) return NextResponse.json({ loi: 'Không đọc được file' }, { status: 404 });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': voice.mime,
      'Content-Length': String(buf.length),
      'Cache-Control': 'private, no-store',
    },
  });
}
