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

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

let branchReady = false;

/** Tạo nhánh dữ liệu nếu chưa có (tách khỏi nhánh code để không deploy lại). */
async function ensureBranch(): Promise<void> {
  if (branchReady) return;
  const check = await fetch(`${API}/git/refs/heads/${BRANCH}`, { headers: ghHeaders(), cache: 'no-store' });
  if (check.ok) {
    branchReady = true;
    return;
  }
  const main = await fetch(`${API}/git/refs/heads/main`, { headers: ghHeaders(), cache: 'no-store' });
  if (!main.ok) throw new Error('Không đọc được nhánh main để tạo nhánh dữ liệu');
  const sha = (await main.json())?.object?.sha;
  const created = await fetch(`${API}/git/refs`, {
    method: 'POST',
    headers: ghHeaders(),
    body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha }),
  });
  if (!created.ok && created.status !== 422) throw new Error('Không tạo được nhánh dữ liệu');
  branchReady = true;
}

async function ghRead(file: string): Promise<{ body: string; sha: string } | null> {
  const res = await fetch(`${API}/contents/${file}?ref=${BRANCH}`, { headers: ghHeaders(), cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Đọc ${file} lỗi: ${res.status}`);
  const json = await res.json();
  return { body: Buffer.from(json.content, 'base64').toString('utf8'), sha: json.sha };
}

async function ghWrite(file: string, body: string, message: string): Promise<void> {
  await ensureBranch();
  const cur = await ghRead(file);
  const res = await fetch(`${API}/contents/${file}`, {
    method: 'PUT',
    headers: ghHeaders(),
    body: JSON.stringify({
      message,
      content: Buffer.from(body, 'utf8').toString('base64'),
      branch: BRANCH,
      ...(cur ? { sha: cur.sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Ghi ${file} lỗi: ${res.status}`);
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

export async function layInbox(): Promise<ZaloInboxItem[]> {
  const raw = await readFile(INBOX_FILE);
  return raw ? (JSON.parse(raw) as ZaloInboxItem[]) : [];
}

export async function luuInbox(items: ZaloInboxItem[]): Promise<void> {
  // giữ 50 tin gần nhất là quá đủ cho 50 căn
  await writeFile(INBOX_FILE, JSON.stringify(items.slice(0, 50), null, 2), 'cập nhật hộp thư Zalo');
}
