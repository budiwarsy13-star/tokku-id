import crypto from "crypto";
import { kirimEmailOtp } from "@/lib/email-server";

// ======================================================================
// Verifikasi identitas pembeli TANPA akun: buktikan kepemilikan EMAIL yang
// dipakai saat checkout lewat kode OTP 6 digit, lalu dapat token sesi.
// Nomor WA & Order ID BUKAN rahasia, jadi tidak lagi dianggap bukti identitas.
//
// Tabel buyer_otps & buyer_sessions tanpa policy RLS -> hanya service role.
// ======================================================================

const OTP_MENIT = 10;
const SESI_JAM = 6;
const JEDA_KIRIM_ULANG_MS = 60 * 1000;

export const normalisasiEmail = (e) => String(e || "").trim().toLowerCase();
export const emailValid = (e) => e.length <= 254 && /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e);

const rahasia = () => process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hashKode = (email, kode) => crypto.createHmac("sha256", rahasia()).update(`${email}:${kode}`).digest("hex");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const samaAman = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Selalu "sukses" ke pemanggil, baik email terdaftar atau tidak (cegah orang
// mengecek email siapa saja yang pernah belanja).
export async function mintaKode(admin, emailMentah) {
  const email = normalisasiEmail(emailMentah);
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("buyer_email", email);
  if (!count) return;

  const { data: terakhir } = await admin.from("buyer_otps").select("created_at")
    .eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (terakhir && Date.now() - new Date(terakhir.created_at).getTime() < JEDA_KIRIM_ULANG_MS) return;

  const kode = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const { data: row, error } = await admin.from("buyer_otps").insert({
    email, code_hash: hashKode(email, kode),
    expires_at: new Date(Date.now() + OTP_MENIT * 60 * 1000).toISOString(),
  }).select("id").single();
  if (error) { console.error("OTP insert gagal:", error.message); return; }

  try {
    await kirimEmailOtp(email, kode);
  } catch (e) {
    console.error("Kirim email OTP gagal:", e.message);
    await admin.from("buyer_otps").delete().eq("id", row.id);
  }
}

export async function verifikasiKode(admin, emailMentah, kodeMentah) {
  const email = normalisasiEmail(emailMentah);
  const kode = String(kodeMentah || "").trim();
  const gagal = { success: false, message: "Kode salah atau sudah kedaluwarsa. Minta kode baru kalau perlu." };
  if (!emailValid(email) || !/^\d{6}$/.test(kode)) return gagal;

  const { data: row } = await admin.from("buyer_otps").select("*")
    .eq("email", email).is("consumed_at", null).gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!row || row.attempts >= row.max_attempts) return gagal;

  if (!samaAman(hashKode(email, kode), row.code_hash)) {
    await admin.from("buyer_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id).eq("attempts", row.attempts);
    return gagal;
  }

  // Kode hanya bisa dipakai sekali (update bersyarat = aman dari request paralel).
  const { data: dipakai } = await admin.from("buyer_otps")
    .update({ consumed_at: new Date().toISOString() }).eq("id", row.id).is("consumed_at", null).select("id");
  if (!dipakai || dipakai.length === 0) return gagal;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESI_JAM * 3600 * 1000).toISOString();
  const { error } = await admin.from("buyer_sessions").insert({ token_hash: hashToken(token), email, expires_at: expiresAt });
  if (error) return { success: false, message: "Gagal membuat sesi, coba lagi." };
  return { success: true, token, expiresAt, email };
}

// Dipakai SEMUA endpoint portal pembeli. Mengembalikan { email } atau { error: Response }.
export async function autentikasiBuyer(admin, request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const tolak = () => ({ error: Response.json({ error: "Sesi verifikasi habis. Silakan verifikasi email lagi.", butuhLogin: true }, { status: 401 }) });
  if (!token) return tolak();

  const { data: sesi } = await admin.from("buyer_sessions").select("email, expires_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (!sesi || new Date(sesi.expires_at) < new Date()) return tolak();
  return { email: sesi.email };
}

export async function hapusSesi(admin, request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (token) await admin.from("buyer_sessions").delete().eq("token_hash", hashToken(token));
}

// Ambil 1 baris order milik buyer (cocok email sesi). null kalau bukan miliknya.
export async function ambilOrderMilik(admin, email, orderId, select = "*") {
  if (!orderId) return null;
  const { data } = await admin.from("orders").select(select).eq("id", orderId).eq("buyer_email", email).maybeSingle();
  return data || null;
}
