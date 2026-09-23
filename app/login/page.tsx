import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { COOKIE, HAN_NGAY, daDangNhap, dungMatKhau, taoPhien } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function Login({ searchParams }: { searchParams: { loi?: string } }) {
  if (daDangNhap()) redirect('/admin');

  async function dangNhap(formData: FormData) {
    'use server';
    const mk = String(formData.get('matkhau') || '');
    if (!dungMatKhau(mk)) redirect('/login?loi=1');
    cookies().set(COOKIE, taoPhien(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: HAN_NGAY * 86_400,
    });
    redirect('/admin');
  }

  return (
    <main className="wrap">
      <h1>Bảo trì Ny&apos;ah Phú Định</h1>
      <form action={dangNhap} className="card pad-lg" style={{ marginTop: 20 }}>
        {searchParams.loi ? <p className="err">Mật khẩu chưa đúng.</p> : null}
        <label htmlFor="matkhau">Mật khẩu Ban quản lý</label>
        <input id="matkhau" name="matkhau" type="password" autoComplete="current-password" required autoFocus />
        <div className="btn-row">
          <button type="submit">Vào</button>
        </div>
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Máy này nhớ đăng nhập {HAN_NGAY} ngày.
        </p>
      </form>
    </main>
  );
}
