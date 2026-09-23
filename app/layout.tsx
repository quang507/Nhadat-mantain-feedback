import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bảo trì Ny\'ah Phú Định',
  description: 'Tiếp nhận yêu cầu bảo trì và lấy đánh giá của cư dân',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
