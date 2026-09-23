import Link from 'next/link';
import { redirect } from 'next/navigation';
import { daDangNhap } from '@/lib/auth';
import { danhSachWo } from '@/lib/store';
import { diemCua, tienThuong, xepThuong } from '@/lib/wo';

export const dynamic = 'force-dynamic';

export default async function Thuong() {
  if (!daDangNhap()) redirect('/login');

  const daCham = (await danhSachWo()).filter((w) => w.feedback);

  const theoTho = new Map<
    string,
    { viec: number; tongDiem: number; soCham: number; A: number; B: number; C: number; khong: number }
  >();
  for (const w of daCham) {
    const ten = w.tho || '(chưa ghi tên thợ)';
    const cur = theoTho.get(ten) || { viec: 0, tongDiem: 0, soCham: 0, A: 0, B: 0, C: 0, khong: 0 };
    cur.viec += 1;
    const d = diemCua(w.feedback);
    if (d !== null) {
      cur.tongDiem += d;
      cur.soCham += 1;   // việc khách báo "chưa xong" không có điểm, không kéo trung bình xuống
    }
    cur[xepThuong(w.feedback).muc] += 1;
    theoTho.set(ten, cur);
  }

  const rows = [...theoTho.entries()]
    .map(([ten, v]) => ({ ten, ...v, tb: v.soCham ? Math.round((v.tongDiem / v.soCham) * 100) / 100 : null }))
    .sort((a, b) => (b.tb ?? -1) - (a.tb ?? -1));

  const coTien = tienThuong('A') + tienThuong('B') + tienThuong('C') > 0;

  return (
    <main className="wrap wide">
      <div className="top">
        <div>
          <h1>Thưởng đội thợ</h1>
          <p className="muted">Tính từ {daCham.length} việc đã có nhận xét của khách.</p>
        </div>
        <Link className="muted" href="/admin">← Danh sách</Link>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <p className="muted">Chưa có việc nào được khách đánh giá.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Thợ</th>
                <th className="rt">Việc</th>
                <th className="rt">Điểm TB</th>
                <th className="rt">Mức A</th>
                <th className="rt">Mức B</th>
                <th className="rt">Mức C</th>
                <th className="rt">Không thưởng</th>
                {coTien && <th className="rt">Tạm tính</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ten}>
                  <td>{r.ten}</td>
                  <td className="rt">{r.viec}</td>
                  <td className="rt"><strong>{r.tb ?? '—'}</strong></td>
                  <td className="rt">{r.A}</td>
                  <td className="rt">{r.B}</td>
                  <td className="rt">{r.C}</td>
                  <td className="rt">{r.khong}</td>
                  {coTien && (
                    <td className="rt">
                      {(r.A * tienThuong('A') + r.B * tienThuong('B') + r.C * tienThuong('C')).toLocaleString('vi-VN')} đ
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cách xếp mức</h2>
        <ul className="muted" style={{ paddingLeft: 18, margin: 0 }}>
          <li>Điểm của một việc = mức hài lòng khách chọn trên hàng mặt cười (1 Tệ → 5 Rất tốt).</li>
          <li>Mức A từ 4,5 · Mức B từ 3,5 · Mức C từ 2,5 · dưới 2,5 thì BQL xem lại.</li>
          <li>Khách bấm <strong>chưa xong</strong> thì việc đó không xét thưởng, dù chấm mấy sao.</li>
          {!coTien && <li>Số tiền mỗi mức: sếp chốt rồi điền vào <code>BONUS_VND</code> trong <code>lib/wo.ts</code>, bảng này tự hiện thành tiền.</li>}
        </ul>
      </div>
    </main>
  );
}
