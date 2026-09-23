// Smoke test chạy thật trên trình duyệt: đi trọn một việc từ lúc BQL tiếp nhận
// tới lúc khách chấm điểm, rồi kiểm tra kết quả hiện đúng trong trang quản trị.
//
//   npm run build && npm run test:smoke
//
// Cần server đang chạy ở BASE (mặc định http://localhost:3000) với
// ADMIN_PASSWORD=test123 và không có GITHUB_TOKEN (dữ liệu vào .data/).
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const MAT_KHAU = process.env.ADMIN_PASSWORD || 'test123';

function kiemTra(dieuKien, mo_ta) {
  if (!dieuKien) throw new Error(`HỎNG: ${mo_ta}`);
  console.log(`  ok — ${mo_ta}`);
}

// CHROME_PATH để chỉ tay vào Chromium có sẵn; bỏ trống thì để Playwright tự tìm.
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  // HTTPS_PROXY khi chạy trong môi trường CI có proxy bắt buộc.
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } }
    : {}),
});
// IGNORE_CERT=1 khi chạy sau proxy có chứng chỉ riêng (CI nội bộ), đừng bật khi kiểm thử thật.
const ctxOpts = process.env.IGNORE_CERT === '1' ? { ignoreHTTPSErrors: true } : {};
const bql = await browser.newContext(ctxOpts);
const trangBQL = await bql.newPage();

try {
  console.log('1. BQL đăng nhập');
  await trangBQL.goto(`${BASE}/login`);
  await trangBQL.fill('#matkhau', MAT_KHAU);
  await trangBQL.click('button[type=submit]');
  await trangBQL.waitForURL('**/admin');
  kiemTra(await trangBQL.locator('h1').innerText() === 'Việc bảo trì', 'vào được trang quản trị');

  console.log('2. Tạo việc cho căn 10, khách gọi hotline');
  await trangBQL.goto(`${BASE}/admin/new`);
  await trangBQL.selectOption('#unitId', '10');
  await trangBQL.fill('#khach', 'Chị Trang');
  await trangBQL.fill('#sdt', '0900000000');
  await trangBQL.selectOption('#kenh', 'hotline');
  await trangBQL.selectOption('#hangMuc', 'Cấp thoát nước');
  await trangBQL.fill('#moTa', 'Rò nước nhà tắm tầng 2');
  await trangBQL.fill('#tho', 'Anh Hùng');
  await trangBQL.click('button[type=submit]');
  await trangBQL.waitForURL('**/admin/wo/**');
  const woUrl = trangBQL.url();
  const woId = woUrl.split('/').pop();
  kiemTra(/^WO-\d{4}-\d{3}$/.test(woId), `sinh mã việc ${woId}`);
  kiemTra((await trangBQL.locator('h1').innerText()).includes('Căn 10'), 'trang chi tiết đúng căn 10');

  console.log('3. Giao thợ rồi báo xong');
  await trangBQL.click('button:has-text("Giao thợ")');
  await trangBQL.waitForSelector('button:has-text("Thợ báo xong")');
  await trangBQL.click('button:has-text("Thợ báo xong")');
  await trangBQL.waitForSelector('.qr img', { timeout: 15000 });
  kiemTra(await trangBQL.locator('.qr img').isVisible(), 'hiện mã QR cho khách quét');

  const link = await trangBQL.inputValue('#link');
  kiemTra(link.includes('/f/'), `có link đánh giá (${link.slice(0, 40)}…)`);

  console.log('4. Khách mở link, chấm điểm (trình duyệt riêng, không đăng nhập)');
  const khach = await browser.newContext(ctxOpts);
  const trangKhach = await khach.newPage();
  await trangKhach.goto(link);
  kiemTra((await trangKhach.locator('h1').innerText()) === 'Thợ làm xong việc chưa ạ?', 'khách mở được form');
  kiemTra(!(await trangKhach.locator('body').innerText()).includes('0900000000'), 'form của khách không in số điện thoại ra màn hình');
  kiemTra((await trangKhach.locator('#nguoi').count()) === 0, 'không bắt khách gõ lại tên mình');

  await trangKhach.waitForSelector('button:has-text("Xong rồi"):not([disabled])', { timeout: 20000 });
  await trangKhach.click('button:has-text("Xong rồi")');

  // bốn câu hỏi, mỗi câu một màn; chấm xong là tự sang câu kế
  for (const cau of ['Thợ đến có đúng hẹn không?', 'Thái độ, tác phong thế nào?',
                     'Sửa có được việc không?', 'Làm xong có dọn sạch không?']) {
    await trangKhach.waitForSelector(`h1:has-text("${cau}")`, { timeout: 15000 });
    await trangKhach.click('button[aria-label="5 trên 5"]');
  }
  kiemTra(true, 'bốn câu hỏi tự chuyển màn sau mỗi lần chấm');

  await trangKhach.waitForSelector('h1:has-text("nhắn gì thêm")', { timeout: 15000 });
  kiemTra(await trangKhach.locator('button:has-text("Nhắn bằng giọng nói")').isVisible(), 'có nút nhắn bằng giọng nói');

  await trangKhach.fill('#ykien', 'Thợ đến đúng hẹn, làm xong dọn sạch.');
  await trangKhach.click('button:has-text("Gửi cho Ban quản lý")');
  await trangKhach.waitForSelector('h1:has-text("Cảm ơn")', { timeout: 20000 });
  kiemTra(true, 'khách gửi được nhận xét');

  console.log('5. Link dùng lần hai phải bị chặn');
  const lan2 = await khach.newPage();
  await lan2.goto(link);
  const chu = await lan2.locator('h1').innerText();
  kiemTra(chu === 'Đã ghi nhận', 'mở lại link thì báo đã ghi nhận, không cho chấm lại');

  console.log('6. Link bịa thì không vào được');
  await lan2.goto(`${BASE}/f/aaaa.bbbb`);
  kiemTra((await lan2.locator('h1').innerText()) === 'Link không đúng', 'link sai bị từ chối');

  console.log('7. Kết quả hiện trong trang quản trị');
  await trangBQL.goto(woUrl);
  const noiDung = await trangBQL.locator('body').innerText();
  kiemTra(noiDung.includes('Xác nhận đã xong'), 'chi tiết việc hiện "đã xong"');
  kiemTra(noiDung.includes('5/5'), 'hiện điểm 5/5');
  kiemTra(noiDung.includes('Mức A'), 'xếp mức thưởng A');

  await trangBQL.goto(`${BASE}/admin/thuong`);
  const bang = await trangBQL.locator('body').innerText();
  kiemTra(bang.includes('Anh Hùng'), 'bảng thưởng có tên thợ');

  console.log('8. Khách chưa đăng nhập không xem được trang quản trị');
  const la = await browser.newContext(ctxOpts);
  const trangLa = await la.newPage();
  await trangLa.goto(`${BASE}/admin`);
  kiemTra(trangLa.url().includes('/login'), 'trang quản trị bắt đăng nhập');

  console.log('\nTất cả bước đều chạy được.');
} finally {
  await browser.close();
}
