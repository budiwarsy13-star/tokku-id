// Inti keamanan admin panel — HANYA dipakai di server.
// Filosofi: gagal-TERTUTUP (kalau ragu / ada yang error -> tolak), pesan penolakan seragam
// (tidak membocorkan apakah sebuah email itu admin), dan semua perubahan WAJIB tercatat di log audit.
import { createClient } from "@supabase/supabase-js";
import { punya } from "@/lib/admin-permissions";

const PESAN = {
  TIDAK_TERSEDIA: [503, "Layanan tidak tersedia."],
  AKSES_DITOLAK: [403, "Akses ditolak."],
  BELUM_LOGIN: [401, "Belum login."],
  SESI_TIDAK_VALID: [401, "Sesi tidak valid."],
  MFA_DIPERLUKAN: [403, "Verifikasi 2 langkah (MFA) diperlukan."],
  MFA_KEDALUWARSA: [403, "Sesi MFA kedaluwarsa, verifikasi ulang."],
  TIDAK_PUNYA_IZIN: [403, "Peranmu tidak punya izin untuk aksi ini."],
  TERLALU_BANYAK: [429, "Terlalu banyak permintaan. Coba lagi sebentar."],
};
const tolak = (kode, catat) => ({ ok: false, status: PESAN[kode][0], kode, pesan: PESAN[kode][1], catat });

export function parseDaftar(str) {
  return String(str || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

// Dekode payload JWT. Dipanggil HANYA setelah token divalidasi Supabase (auth.getUser),
// jadi isinya (aal, amr) bisa dipercaya.
export function dekodeJwt(token) {
  try {
    const bagian = String(token).split(".")[1];
    return JSON.parse(Buffer.from(bagian.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

// IP asli klien. Prioritas header yang diisi Vercel sendiri (tidak bisa dipalsukan klien).
export function ambilIpAdmin(headers) {
  const h = (k) => headers.get(k)?.split(",")[0]?.trim();
  return h("x-vercel-forwarded-for") || h("x-real-ip") || h("x-forwarded-for") || "unknown";
}

// Cek akses. `deps` disuntikkan supaya bisa diuji tanpa Supabase asli.
export async function periksaAkses({ token, ip, izin, tulis = false, wajibMfa = true }, deps) {
  const { env, getUser, cariAdmin, batasi, now = () => Date.now() } = deps;

  const diizinkan = parseDaftar(env.ADMIN_ALLOWED_EMAILS);
  if (diizinkan.length === 0) return tolak("TIDAK_TERSEDIA"); // belum dikonfigurasi = ditutup total

  const daftarIp = parseDaftar(env.ADMIN_IP_ALLOWLIST);
  if (daftarIp.length > 0 && !daftarIp.includes(String(ip).toLowerCase())) return tolak("AKSES_DITOLAK");

  if (!(await batasi(`admin-ip:${ip}`, 180))) return tolak("TERLALU_BANYAK");

  if (!token) return tolak("BELUM_LOGIN");
  let user;
  try { user = (await getUser(token)).user; } catch { user = null; }
  if (!user?.id || !user.email) return tolak("SESI_TIDAK_VALID");

  // Kunci 1: email harus ada di env (ranah kepercayaan berbeda dari database).
  // Kunci 2: harus ada di tabel admins & tidak dinonaktifkan.
  // Orang dalam yang hanya bisa menulis ke database TIDAK bisa menjadikan dirinya admin.
  const email = user.email.toLowerCase();
  const lolosEnv = diizinkan.includes(email);
  const admin = lolosEnv ? await cariAdmin(user.id) : null;
  if (!user.email_confirmed_at || !lolosEnv || !admin || admin.disabled) {
    return tolak("AKSES_DITOLAK", { userId: user.id, email, alasan: !lolosEnv ? "email_tidak_di_allowlist" : !admin ? "bukan_admin" : admin.disabled ? "admin_nonaktif" : "email_belum_terverifikasi" });
  }

  const payload = dekodeJwt(token) || {};
  const aal2 = payload.aal === "aal2";
  const batasUmur = Math.min(Math.max(parseFloat(env.ADMIN_TOTP_MAX_AGE_HOURS) || 8, 0.25), 24) * 3600; // detik, maks 24 jam
  const totp = (Array.isArray(payload.amr) ? payload.amr : []).filter((a) => a?.method === "totp").map((a) => Number(a.timestamp) || 0);
  const umurTotp = totp.length ? now() / 1000 - Math.max(...totp) : Infinity;
  const mfaSegar = aal2 && umurTotp <= batasUmur;

  if (wajibMfa) {
    if (!aal2) return tolak("MFA_DIPERLUKAN");
    if (!mfaSegar) return tolak("MFA_KEDALUWARSA");
  }
  if (!punya(admin.role, izin)) return tolak("TIDAK_PUNYA_IZIN", { userId: user.id, email, alasan: `izin_${izin}` });

  if (!(await batasi(`admin-u:${user.id}:${tulis ? "w" : "r"}`, tulis ? 30 : 150))) return tolak("TERLALU_BANYAK");

  return { ok: true, admin: { id: user.id, email, role: admin.role }, ip, info: { aal: payload.aal || "aal1", mfaSegar } };
}

// ---------- validasi input (semua allowlist / batas ketat) ----------
export function validasiId(x) {
  const s = String(x ?? "");
  return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : null;
}
export function validasiAlasan(x, min = 8) {
  const s = String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return s.length >= min && s.length <= 500 ? s : null;
}
export function validasiInt(x, { min = 1, max = 10_000_000_000 } = {}) {
  const n = typeof x === "number" ? x : /^-?\d+$/.test(String(x ?? "")) ? Number(x) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}
export function pilihan(x, daftar, bawaan = "") {
  return daftar.includes(x) ? x : bawaan;
}

// ---------- penyamaran data pribadi (nilai asli hanya lewat /api/admin/pii + alasan + log) ----------
export function maskTelepon(t) {
  const d = String(t ?? "").replace(/\D/g, "");
  if (d.length < 8) return d ? "****" : "";
  return d.slice(0, 4) + "*".repeat(Math.max(d.length - 8, 2)) + d.slice(-4);
}
export function maskNama(n) {
  const k = String(n ?? "").trim().split(/\s+/).filter(Boolean);
  if (k.length === 0) return "";
  return [k[0], ...k.slice(1).map((x) => x[0] + "***")].join(" ");
}
export function maskEmail(e) {
  const [u, d] = String(e ?? "").split("@");
  if (!d) return "";
  return u.slice(0, 2) + "***@" + d;
}

// Admin tidak boleh bertindak atas tokonya sendiri (cegah menyetujui/mencairkan dana untuk diri sendiri).
export function bentrokKepentingan(admin, store) {
  return !!store?.user_id && store.user_id === admin.id;
}

// ---------- koneksi produksi ----------
let _db;
export function dbAdmin() {
  if (!_db) {
    _db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _db;
}

export function depsProduksi() {
  const db = dbAdmin();
  return {
    env: process.env,
    getUser: async (token) => {
      const { data } = await db.auth.getUser(token);
      return { user: data?.user || null };
    },
    cariAdmin: async (id) => {
      const { data } = await db.from("admins").select("user_id, email, role, disabled").eq("user_id", id).maybeSingle();
      return data || null;
    },
    // Berbeda dari cekRateLimit publik (yang gagal-terbuka), untuk admin GAGAL-TERTUTUP.
    batasi: async (key, maks) => {
      const awal = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
      const { data, error } = await db.rpc("increment_rate_limit", { p_key: key, p_window: awal });
      if (error) { console.error("admin rate limit error:", error.message); return false; }
      return Number(data) <= maks;
    },
  };
}

// ---------- log audit ----------
// Melempar error kalau gagal mencatat -> pemanggil WAJIB membatalkan aksinya (tidak ada perubahan tanpa jejak).
export async function catatAudit(db, { admin, aksi, targetType = null, targetId = null, alasan = null, detail = null, ip = null, ua = null }) {
  let isi = detail;
  try {
    if (isi && JSON.stringify(isi).length > 8000) isi = { terpotong: true, ringkas: JSON.stringify(isi).slice(0, 2000) };
  } catch { isi = { tidak_bisa_diserialisasi: true }; }
  const { error } = await db.from("admin_audit_log").insert({
    admin_id: admin?.id || null, admin_email: admin?.email || null, role: admin?.role || null,
    action: aksi, target_type: targetType, target_id: targetId ? String(targetId) : null,
    reason: alasan, detail: isi, ip, user_agent: ua ? String(ua).slice(0, 300) : null,
    seq: 0, prev_hash: "", row_hash: "", // diisi/ditimpa trigger database
  });
  if (error) throw new Error("Gagal mencatat log audit: " + error.message);
}
