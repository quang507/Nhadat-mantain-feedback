import { layWo } from '@/lib/store';
import { readToken } from '@/lib/token';
import FormDanhGia from './form';

export const dynamic = 'force-dynamic';

function Thong({ tieuDe, noiDung }: { tieuDe: string; noiDung: string }) {
  return (
    <main className="wrap">
      <div className="card pad-lg" style={{ marginTop: 24 }}>
        <h1>{tieuDe}</h1>
        <p className="muted">{noiDung}</p>
      </div>
    </main>
  );
}

export default async function TrangDanhGia({ params }: { params: { token: string } }) {
  const kq = readToken(params.token);

  if (!kq.ok) {
    return kq.ly_do === 'het_han'
      ? <Thong tieuDe="Link đã hết hạn" noiDung="Anh/chị vui lòng liên hệ Ban quản lý để được gửi lại link đánh giá." />
      : <Thong tieuDe="Link không đúng" noiDung="Link này không hợp lệ. Anh/chị vui lòng liên hệ Ban quản lý." />;
  }

  const wo = await layWo(kq.payload.wo);
  if (!wo) return <Thong tieuDe="Không tìm thấy công việc" noiDung="Anh/chị vui lòng liên hệ Ban quản lý." />;

  if (wo.feedback) {
    return (
      <Thong
        tieuDe="Đã ghi nhận"
        noiDung={`Cảm ơn ${wo.feedback.nguoiDanhGia}. Nhận xét cho công việc tại căn ${wo.unitId} đã được gửi tới Ban quản lý.`}
      />
    );
  }

  if (wo.trangThai !== 'cho_danh_gia') {
    return <Thong tieuDe="Công việc chưa tới bước đánh giá" noiDung="Anh/chị vui lòng liên hệ Ban quản lý." />;
  }

  return (
    <FormDanhGia
      token={params.token}
      woId={wo.id}
      unitId={wo.unitId}
      hangMuc={wo.hangMuc}
      moTa={wo.moTa}
      tho={wo.tho}
    />
  );
}
