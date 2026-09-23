import Image from 'next/image';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { COOKIE, HAN_NGAY, daDangNhap, dungMatKhau, optionsCookie, taoPhien } from '@/lib/auth';
import { DOMAIN, coGoogle } from '@/lib/google';

export const dynamic = 'force-dynamic';

export default function Login({ searchParams }: { searchParams: { loi?: string; mk?: string } }) {
  if (daDangNhap()) redirect('/admin');

  async function dangNhap(formData: FormData) {
    'use server';
    const mk = String(formData.get('matkhau') || '');
    if (!dungMatKhau(mk)) redirect('/login?mk=1&loi=Mật khẩu chưa đúng');
    cookies().set(COOKIE, taoPhien('BQL'), optionsCookie());
    redirect('/admin');
  }

  const google = coGoogle();
  // Ô mật khẩu chỉ hiện khi chưa bật Google, hoặc khi ai đó cần đường dự phòng (/login?mk=1).
  const hienMatKhau = !google || searchParams.mk === '1';

  return (
    <main className="wrap" style={{ maxWidth: 420 }}>
      <div style={{ textAlign: 'center', paddingBlock: '28px 4px' }}>
        <Image src="/logo-nhadat.png" alt="Nhã Đạt" width={168} height={168}
          style={{ width: 132, height: 'auto', margin: '0 auto' }} priority />
      </div>

      <h1 style={{ textAlign: 'center' }}>Bảo trì Ny&apos;ah Phú Định</h1>
      <p className="muted" style={{ textAlign: 'center' }}>Trang dành cho Ban quản lý.</p>

      <div className="card pad-lg" style={{ marginTop: 18 }}>
        {searchParams.loi && searchParams.loi !== 'chua-cau-hinh' && (
          <p className="err" style={{ marginBottom: 14 }}>
            {searchParams.loi === 'huy' ? 'Đăng nhập Google đã bị hủy.'
              : searchParams.loi === 'state' ? 'Phiên đăng nhập quá hạn, anh/chị bấm lại giúp.'
              : searchParams.loi === 'thieu-ma' ? 'Google không trả về mã đăng nhập.'
              : searchParams.loi}
          </p>
        )}

        {google ? (
          <>
            <a className="btn" href="/api/auth/google" style={{ width: '100%' }}>
              Đăng nhập bằng Google
            </a>
            <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
              Chỉ tài khoản <strong>@{DOMAIN}</strong> vào được. Máy này nhớ đăng nhập {HAN_NGAY} ngày.
            </p>
          </>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>
            Chưa bật đăng nhập Google — tạm dùng mật khẩu chung của Ban quản lý.
          </p>
        )}

        {hienMatKhau && (
          <form action={dangNhap} style={{ marginTop: google ? 22 : 0 }}>
            {google && (
              <p className="muted" style={{ fontSize: '0.8125rem', marginBottom: 0 }}>
                Hoặc dùng mật khẩu dự phòng khi Google trục trặc:
              </p>
            )}
            <label htmlFor="matkhau">Mật khẩu Ban quản lý</label>
            <input id="matkhau" name="matkhau" type="password" autoComplete="current-password" required />
            <div className="btn-row">
              <button type="submit" className={google ? 'btn-ghost' : ''}>Vào</button>
            </div>
          </form>
        )}
      </div>

      {google && !hienMatKhau && (
        <p className="muted" style={{ textAlign: 'center', fontSize: '0.8125rem', marginTop: 14 }}>
          <a href="/login?mk=1">Google trục trặc? Vào bằng mật khẩu</a>
        </p>
      )}
    </main>
  );
}
