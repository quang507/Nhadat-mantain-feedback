// Kiểm chứng đường lời nhắn bằng giọng nói: khách ghi âm rồi gửi, BQL nghe lại được.
// Chromium chạy với micro giả (--use-fake-device-for-media-stream) nên không cần người nói thật.
//
//   npm run build && npm start   (cửa sổ khác)
//   npm run test:voice
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const MAT_KHAU = process.env.ADMIN_PASSWORD || 'test123';

function kiemTra(dieuKien, mo_ta) {
  if (!dieuKien) throw new Error(`HỎNG: ${mo_ta}`);
  console.log(`  ok — ${mo_ta}`);
}

const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } }
    : {}),
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctxOpts = {
  permissions: ['microphone'],
  ...(process.env.IGNORE_CERT === '1' ? { ignoreHTTPSErrors: true } : {}),
};

try {
  const bql = await browser.newContext(ctxOpts);
  const trangBQL = await bql.newPage();

  console.log('1. BQL tạo việc và cho thợ báo xong');
  await trangBQL.goto(`${BASE}/login`);
  await trangBQL.fill('#matkhau', MAT_KHAU);
  await trangBQL.click('button[type=submit]');
  await trangBQL.waitForURL('**/admin');

  await trangBQL.goto(`${BASE}/admin/new`);
  await trangBQL.selectOption('#unitId', '27');
  await trangBQL.fill('#khach', 'Anh Dũng');
  await trangBQL.fill('#moTa', 'Ổ cắm bếp không có điện');   // hạng mục để hệ thống tự nhận
  await trangBQL.fill('#tho', 'Anh Tuấn');
  await trangBQL.click('button[type=submit]');
  await trangBQL.waitForURL('**/admin/wo/**');
  const woUrl = trangBQL.url();
  const woId = woUrl.split('/').pop();

  await trangBQL.click('button:has-text("Thợ báo xong")');
  await trangBQL.waitForSelector('.qr img', { timeout: 15000 });
  const link = await trangBQL.inputValue('#link');

  console.log('2. Khách chọn "chưa xong" rồi nhắn bằng giọng nói');
  const khach = await browser.newContext(ctxOpts);
  const trangKhach = await khach.newPage();
  await trangKhach.goto(link);
  await trangKhach.waitForSelector('button:has-text("Chưa xong"):not([disabled])');
  await trangKhach.click('button:has-text("Chưa xong")');

  await trangKhach.waitForSelector('h2:has-text("Còn chỗ nào chưa ổn")');
  const nutGui = trangKhach.locator('button.gui');
  kiemTra(await nutGui.isDisabled(), 'chưa nói, chưa gõ gì thì chưa cho gửi');

  await trangKhach.click('button:has-text("Nhắn bằng giọng nói")');
  await trangKhach.waitForSelector('button:has-text("chạm để dừng")', { timeout: 15000 });
  kiemTra(true, 'bấm là bắt đầu ghi, nút đổi sang trạng thái đang nghe');

  await trangKhach.waitForTimeout(2500);          // nói ~2 giây
  await trangKhach.click('button:has-text("chạm để dừng")');
  await trangKhach.waitForSelector('text=Đã ghi', { timeout: 15000 });
  kiemTra(true, 'dừng lại thì hiện độ dài đoạn vừa ghi');

  kiemTra(!(await nutGui.isDisabled()), 'có tiếng rồi thì cho gửi, không bắt gõ chữ');
  await nutGui.click();
  await trangKhach.waitForSelector('h1:has-text("Đã báo Ban quản lý")', { timeout: 30000 });
  kiemTra(true, 'gửi được lời nhắn bằng giọng nói');

  console.log('3. BQL nghe lại được, người lạ thì không');
  await trangBQL.goto(woUrl);
  const noiDung = await trangBQL.locator('body').innerText();
  kiemTra(noiDung.includes('Khách nhắn bằng giọng nói'), 'trang việc hiện có lời nhắn');
  kiemTra(await trangBQL.locator('audio').count() === 1, 'có chỗ bấm nghe');

  const ketQua = await trangBQL.evaluate(async (id) => {
    const r = await fetch(`/api/voice/${id}`);
    return { status: r.status, kieu: r.headers.get('content-type'), dai: (await r.blob()).size };
  }, woId);
  kiemTra(ketQua.status === 200, 'BQL tải được file tiếng (200)');
  kiemTra(ketQua.dai > 1000, `file có tiếng thật (${ketQua.dai} byte)`);
  kiemTra(/^audio\//.test(ketQua.kieu || ''), `trả đúng kiểu âm thanh (${ketQua.kieu})`);

  const la = await browser.newContext(ctxOpts);
  const trangLa = await la.newPage();
  const resLa = await trangLa.goto(`${BASE}/api/voice/${woId}`);
  kiemTra(resLa.status() === 401, 'người chưa đăng nhập không nghe được (401)');

  console.log('\nĐường lời nhắn bằng giọng nói chạy được.');
} finally {
  await browser.close();
}
