// Nơi cất dữ liệu.
//
// Mỗi tháng chỉ 1-2 việc, nên không dựng database: mỗi việc là một file JSON.
//  - Trên Vercel: ghi qua GitHub API vào một nhánh riêng (không trigger deploy lại).
//    Chọn cách này thay vì Supabase free vì Supabase tạm dừng project sau 7 ngày ít
//    hoạt động và phải vào dashboard bấm Resume - với 1-2 việc/tháng thì đúng lúc
//    khách quét QR là hỏng.
//  - Chạy máy local (không có GITHUB_TOKEN): ghi thẳng vào thư mục .data/
import type { WorkOrder, ZaloInboxItem } from './types';

const OWNER = process.env.GITHUB_OWNER || 'quang507';
const REPO = process.env.GITHUB_REPO || 'Nhadat-mantain-feedback';
const BRANCH = process.env.GITHUB_DATA_BRANCH || 'feedback-logs';
/** Nhánh lấy làm gốc khi tạo nhánh dữ liệu lần đầu. */
const SRC_BRANCH = process.env.GITHUB_BRANCH || 'main';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

const WO_DIR = 'wo';
const INBOX_FILE = 'zalo-inbox.json';

export function dungGithub(): boolean {
  // DATA_LOCAL=1 ép ghi vào thư mục tạm ngay cả khi máy có sẵn GITHUB_TOKEN của việc khác.
  if (process.env.DATA_LOCAL === '1') return false;
  return Boolean(process.env.GITHUB_TOKEN);
}

/**
 * Chưa cấu hình GITHUB_TOKEN trên Vercel = dữ liệu chỉ nằm trong ổ tạm của máy chủ
 * và MẤT khi Vercel khởi động lại instance. Dùng để xem thử giao diện, không dùng thật.
 * Trang quản trị đọc cờ này để hiện cảnh báo.
 */
export function chayTam(): boolean {
  return !dungGithub() && Boolean(process.env.VERCEL);
}

/* ---------- ngăn local (chạy máy) ---------- */

async function localDir() {
  const path = await import('path');
  // Trên Vercel chỉ /tmp ghi được; máy dev thì ghi vào .data/ ngay trong dự án.
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  return process.env.VERCEL ? '/tmp/ndm-data' : path.join(process.cwd(), '.data');
}

async function localRead(file: string): Promise<string | null> {
  const fs = await import('fs/promises');
  const path = await import('path');
  try {
    return await fs.readFile(path.join(await localDir(), file), 'utf8');
  } catch {
    return null;
  }
}

async function localWrite(file: string, body: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const full = path.join(await localDir(), file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body, 'utf8');
}

async function localList(dir: string): Promise<string[]> {
  const fs = await import('fs/promises');
  const path = await import('path');
  try {
    return await fs.readdir(path.join(await localDir(), dir));
  } catch {
    return [];
  }
}

/* ---------- ngăn GitHub ---------- */

function ghHeaders(coBody = false): Record<string, string> {
  return {
    // Token lấy qua trim: dán vào bảng cấu hình rất dễ dính khoảng trắng hoặc xuống dòng,
    // mà header có ký tự lạ thì cả lời gọi hỏng chứ không báo gì rõ ràng.
    Authorization: `Bearer ${(process.env.GITHUB_TOKEN || '').trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nhadat-bao-tri',   // GitHub đòi User-Agent, thiếu là bị chặn
    ...(coBody ? { 'Content-Type': 'application/json' } : {}),
  };
}

let branchReady = false;

/** Tạo nhánh dữ liệu nếu chưa có (tách khỏi nhánh code để không deploy lại). */
async function ensureBranch(): Promise<void> {
  if (branchReady) return;
  // Dùng git/ref/... (số ít) để lấy đúng một nhánh: git/refs/... trả về mảng,
  // đọc .object.sha trên mảng sẽ ra undefined.
  const check = await fetch(`${API}/git/ref/heads/${BRANCH}`, { headers: ghHeaders(), cache: 'no-store' });
  if (check.ok) {
    branchReady = true;
    return;
  }
  const main = await fetch(`${API}/git/ref/heads/${SRC_BRANCH}`, { headers: ghHeaders(), cache: 'no-store' });
  if (!main.ok) {
    const chiTiet = await main.text().catch(() => '');
    throw new Error(
      `Không đọc được nhánh ${SRC_BRANCH} (${main.status}) để tạo nhánh dữ liệu` +
        ` · id=${main.headers.get('x-github-request-id') ?? '?'} · ${chiTiet.slice(0, 150)}`,
    );
  }
  const sha = (await main.json())?.object?.sha;
  if (!sha) throw new Error(`Nhánh ${SRC_BRANCH} không trả về mã commit để tạo nhánh dữ liệu`);
  const created = await fetch(`${API}/git/refs`, {
    method: 'POST',
    headers: ghHeaders(true),
    body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha }),
  });
  if (!created.ok && created.status !== 422) {
    const chiTiet = await created.text().catch(() => '');
    throw new Error(`Không tạo được nhánh ${BRANCH} (${created.status}): ${chiTiet.slice(0, 200)}`);
  }
  branchReady = true;
}

async function ghRead(file: string): Promise<{ body: string; sha: string } | null> {
  const raw = await ghReadRaw(file);
  return raw ? { body: raw.buf.toString('utf8'), sha: raw.sha } : null;
}

/** Đọc nguyên byte - dùng cho file âm thanh, đừng ép về utf8. */
async function ghReadRaw(file: string): Promise<{ buf: Buffer; sha: string } | null> {
  const res = await fetch(`${API}/contents/${file}?ref=${BRANCH}`, { headers: ghHeaders(), cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Đọc ${file} lỗi: ${res.status}`);
  const json = await res.json();
  return { buf: Buffer.from(json.content, 'base64'), sha: json.sha };
}

async function ghWrite(file: string, body: string, message: string): Promise<void> {
  await ensureBranch();
  const cur = await ghRead(file);
  const res = await fetch(`${API}/contents/${file}`, {
    method: 'PUT',
    headers: ghHeaders(true),
    body: JSON.stringify({
      message,
      content: Buffer.from(body, 'utf8').toString('base64'),
      branch: BRANCH,
      ...(cur ? { sha: cur.sha } : {}),
    }),
  });
  if (!res.ok) {
    const chiTiet = await res.text().catch(() => '');
    throw new Error(`Ghi ${file} lỗi ${res.status}: ${chiTiet.slice(0, 200)}`);
  }
}

async function ghList(dir: string): Promise<string[]> {
  const res = await fetch(`${API}/contents/${dir}?ref=${BRANCH}`, { headers: ghHeaders(), cache: 'no-store' });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Liệt kê ${dir} lỗi: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json.map((f: { name: string }) => f.name) : [];
}

/* ---------- API dùng chung ---------- */

async function readFile(file: string): Promise<string | null> {
  return dungGithub() ? (await ghRead(file))?.body ?? null : localRead(file);
}

async function writeFile(file: string, body: string, message: string): Promise<void> {
  return dungGithub() ? ghWrite(file, body, message) : localWrite(file, body);
}

async function listFiles(dir: string): Promise<string[]> {
  return dungGithub() ? ghList(dir) : localList(dir);
}

export async function layWo(id: string): Promise<WorkOrder | null> {
  const raw = await readFile(`${WO_DIR}/${id}.json`);
  return raw ? (JSON.parse(raw) as WorkOrder) : null;
}

export async function luuWo(wo: WorkOrder, ghiChu: string): Promise<void> {
  await writeFile(`${WO_DIR}/${wo.id}.json`, JSON.stringify(wo, null, 2), `${wo.id}: ${ghiChu}`);
}

export async function danhSachWo(): Promise<WorkOrder[]> {
  const files = (await listFiles(WO_DIR)).filter((f) => f.endsWith('.json'));
  const all = await Promise.all(files.map((f) => layWo(f.replace(/\.json$/, ''))));
  return all
    .filter((w): w is WorkOrder => w !== null)
    .sort((a, b) => b.taoLuc.localeCompare(a.taoLuc));
}

/* ---- lời nhắn bằng giọng nói: file nhị phân, để riêng khỏi JSON của việc ---- */

function duongDanVoice(woId: string, duoi: string): string {
  return `voice/${woId}.${duoi}`;
}

export async function luuVoice(woId: string, duoi: string, data: Buffer): Promise<void> {
  const file = duongDanVoice(woId, duoi);
  if (dungGithub()) {
    await ensureBranch();
    const cur = await ghRead(file);
    const res = await fetch(`${API}/contents/${file}`, {
      method: 'PUT',
      headers: ghHeaders(true),
      body: JSON.stringify({
        message: `${woId}: lời nhắn bằng giọng nói của khách`,
        content: data.toString('base64'),
        branch: BRANCH,
        ...(cur ? { sha: cur.sha } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Ghi ${file} lỗi: ${res.status}`);
    return;
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  const full = path.join(await localDir(), file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
}

export async function docVoice(woId: string, duoi: string): Promise<Buffer | null> {
  const file = duongDanVoice(woId, duoi);
  if (dungGithub()) {
    const cur = await ghReadRaw(file);
    return cur ? cur.buf : null;
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  try {
    return await fs.readFile(path.join(await localDir(), file));
  } catch {
    return null;
  }
}

/**
 * Thử ghi một file nhỏ để biết chắc máy chủ có quyền lưu dữ liệu hay không,
 * và nếu hỏng thì hỏng ở đâu. Chỉ trang quản trị gọi được (xem /api/health).
 */
export async function thuGhi(): Promise<{ ok: boolean; ghiChu: string; buoc?: string[] }> {
  const file = '.kiem-tra-ghi.json';
  const noiDung = JSON.stringify({ luc: new Date().toISOString() }, null, 2);
  const buoc: string[] = [];

  if (dungGithub()) {
    // Đi từng bước để biết hỏng ở đâu, vì "không ghi được" có cả chục lý do khác nhau.
    const tk = (process.env.GITHUB_TOKEN || '').trim();
    buoc.push(`token: dài ${tk.length}, bắt đầu bằng ${tk.slice(0, 11)}…`);
    try {
      const khongToken = await fetch('https://api.github.com/zen', {
        headers: { 'User-Agent': 'nhadat-bao-tri' },
        cache: 'no-store',
      });
      buoc.push(`gọi GitHub không kèm token: ${khongToken.status}`);
    } catch (err) {
      buoc.push(`gọi GitHub không kèm token hỏng: ${String(err).slice(0, 120)}`);
    }
    try {
      const repo = await fetch(API, { headers: ghHeaders(), cache: 'no-store' });
      const repoBody = await repo.text().catch(() => '');
      const reqId = repo.headers.get('x-github-request-id');
      const server = repo.headers.get('server');
      // x-ratelimit-limit là 60 khi GitHub coi ta là khách lạ, 5000 khi token được chấp nhận.
      const hanMuc = repo.headers.get('x-ratelimit-limit');
      buoc.push(
        `đọc repo: ${repo.status} · server=${server ?? 'không có'} · hạn mức=${hanMuc ?? 'không có'} · github-request-id=${reqId ?? 'không có'} · ${repoBody.slice(0, 100)}`,
      );
    } catch (err) {
      buoc.push(`đọc repo hỏng: ${String(err).slice(0, 120)}`);
    }

    // Thử kiểu header cũ (token ...) và một endpoint không cần quyền gì,
    // để tách bạch: hỏng vì cách gửi token, hay vì chính repo này.
    try {
      const kieuCu = await fetch(API, {
        headers: {
          Authorization: `token ${tk}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'nhadat-bao-tri',
        },
        cache: 'no-store',
      });
      buoc.push(`đọc repo kiểu "token": ${kieuCu.status}`);
    } catch (err) {
      buoc.push(`đọc repo kiểu "token" hỏng: ${String(err).slice(0, 100)}`);
    }
    // /rate_limit nhận mọi token hợp lệ và không đòi quyền nào.
    // 200 ở đây = token còn sống; hỏng ở đây = chính token có vấn đề.
    try {
      const hm = await fetch('https://api.github.com/rate_limit', { headers: ghHeaders(), cache: 'no-store' });
      const hmBody = await hm.text().catch(() => '');
      buoc.push(
        `token còn sống không: ${hm.status} · hạn mức=${hm.headers.get('x-ratelimit-limit') ?? 'không có'} · ${hmBody.slice(0, 80)}`,
      );
    } catch (err) {
      buoc.push(`hỏi hạn mức hỏng: ${String(err).slice(0, 100)}`);
    }
    try {
      const me = await fetch('https://api.github.com/user', { headers: ghHeaders(), cache: 'no-store' });
      const meBody = await me.text().catch(() => '');
      buoc.push(`hỏi token của ai: ${me.status} ${meBody.slice(0, 100)}`);
    } catch (err) {
      buoc.push(`hỏi token của ai hỏng: ${String(err).slice(0, 100)}`);
    }
  }

  try {
    await writeFile(file, noiDung, 'kiểm tra quyền ghi');
    return { ok: true, ghiChu: dungGithub() ? `Ghi được lên nhánh ${BRANCH}` : 'Ghi được vào thư mục tạm', buoc };
  } catch (err) {
    return { ok: false, ghiChu: String(err instanceof Error ? err.message : err), buoc };
  }
}

export async function layInbox(): Promise<ZaloInboxItem[]> {
  const raw = await readFile(INBOX_FILE);
  return raw ? (JSON.parse(raw) as ZaloInboxItem[]) : [];
}

export async function luuInbox(items: ZaloInboxItem[]): Promise<void> {
  // giữ 50 tin gần nhất là quá đủ cho 50 căn
  await writeFile(INBOX_FILE, JSON.stringify(items.slice(0, 50), null, 2), 'cập nhật hộp thư Zalo');
}
