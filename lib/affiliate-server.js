// Helper server buat affiliate: sesi (cookie httpOnly), OTP WA, enkripsi data
// sensitif, validasi pendaftaran. Cuma boleh diimport dari API route.
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  PLATFORM_KEYS, NICHES, PAYOUT_PROVIDERS, PROVINSI, MAX_CHANNELS, UMUR_MINIMAL, buatRefCode,
} from "@/lib/affiliate-config";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const COOKIE_SESI = "tokku_aff";
export const SESI_HARI = 30;
export const OTP_MENIT = 10;
export const OTP_MAKS_SALAH = 5;

// ── util kriptografi ───────────────────────────────────────────────────────
export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function kunciOtp() {
  return process.env.AFFILIATE_OTP_SECRET || process.env.CRON_SECRET || "";
}
export function hashOtp(phone, code) {
  return crypto.createHmac("sha256", kunciOtp()).update(`${phone}:${code}`).digest("hex");
}
export function samaAman(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export const buatOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

// Enkripsi AES-256-GCM buat NIK / NPWP / no. rekening. Kunci 32 byte (64 karakter
// hex) di env AFFILIATE_PII_KEY. Bikin pakai: openssl rand -hex 32
function kunciPii() {
  const hex = process.env.AFFILIATE_PII_KEY || "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return Buffer.from(hex, "hex");
}
export const piiSiap = () => !!kunciPii();
export function enkripsi(teks) {
  const key = kunciPii();
  if (!key) throw new Error("AFFILIATE_PII_KEY belum diatur");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(teks), "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}
export function dekripsi(payload) {
  const key = kunciPii();
  if (!key) throw new Error("AFFILIATE_PII_KEY belum diatur");
  const [v, iv, tag, enc] = String(payload).split(":");
  if (v !== "v1") throw new Error("Format data gak dikenal");
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}

// ── cookie & sesi ──────────────────────────────────────────────────────────
function bacaCookie(request, nama) {
  const raw = request.headers.get("cookie") || "";
  for (const bagian of raw.split(";")) {
    const [k, ...v] = bagian.trim().split("=");
    if (k === nama) return decodeURIComponent(v.join("="));
  }
  return null;
}
function cookieString(nama, nilai, maxAgeDetik) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${nama}=${encodeURIComponent(nilai)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeDetik}${secure}`;
}
export const cookieSesiBaru = (token) => cookieString(COOKIE_SESI, token, SESI_HARI * 86400);
export const cookieSesiHapus = () => cookieString(COOKIE_SESI, "", 0);

export async function buatSesi(affiliateId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin.from("affiliate_sessions").insert({
    affiliate_id: affiliateId,
    token_hash: sha256(token),
    expires_at: new Date(Date.now() + SESI_HARI * 86400 * 1000).toISOString(),
  });
  if (error) throw new Error("Gagal bikin sesi: " + error.message);
  return token;
}

// Balikin { affiliate } kalau sesi valid, atau { error: Response } kalau gak.
export async function autentikasiAffiliate(request, { harusAktif = false } = {}) {
  const token = bacaCookie(request, COOKIE_SESI);
  const tolak = (message, status = 401) => ({ error: Response.json({ success: false, message }, { status }) });
  if (!token) return tolak("Belum masuk. Masuk dulu pakai nomor WhatsApp kamu.");

  const { data: sesi } = await supabaseAdmin.from("affiliate_sessions")
    .select("id, affiliate_id, expires_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!sesi || new Date(sesi.expires_at).getTime() < Date.now()) {
    return tolak("Sesi habis, silakan masuk lagi.");
  }
  const { data: affiliate } = await supabaseAdmin.from("affiliates").select("*").eq("id", sesi.affiliate_id).maybeSingle();
  if (!affiliate) return tolak("Akun gak ditemukan.");
  if (affiliate.status === "ditangguhkan") return tolak("Akun affiliate kamu sedang ditangguhkan.", 403);
  if (harusAktif && affiliate.status !== "aktif") return tolak("Selesaikan pendaftaran affiliate dulu.", 403);
  return { affiliate, token };
}

export async function hapusSesi(request) {
  const token = bacaCookie(request, COOKIE_SESI);
  if (token) await supabaseAdmin.from("affiliate_sessions").delete().eq("token_hash", sha256(token));
}

// ── validasi ───────────────────────────────────────────────────────────────
const teks = (v, maks) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, maks);
const angka = (v) => String(v ?? "").replace(/\D/g, "");

export function kodeVerifikasiChannel() {
  const abjad = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa karakter yang mirip (0/O, 1/I)
  let s = "";
  for (let i = 0; i < 6; i++) s += abjad[crypto.randomInt(0, abjad.length)];
  return `TOKKU-${s}`;
}

// Validasi + bersihin 1 channel. `urutan` = nomor channel platform yang sama
// (buat bedain ref_code kalau punya 2 akun TikTok, dst).
export function validasiChannel(c, username, urutan) {
  const platform = String(c?.platform || "");
  if (!PLATFORM_KEYS.includes(platform)) return { error: "Platform sosmed gak dikenal." };
  const handle = teks(c?.handle, 60).replace(/^@/, "");
  if (!/^[A-Za-z0-9._\- ]{2,60}$/.test(handle)) return { error: "Nama/username channel gak valid (2-60 karakter, huruf/angka/titik/strip)." };

  let url = teks(c?.url, 200);
  if (url) {
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { new URL(url); } catch { return { error: "Link channel gak valid." }; }
  } else if (platform === "website") {
    return { error: "Link website wajib diisi." };
  }

  const followers = Math.min(Math.max(parseInt(c?.followers, 10) || 0, 0), 1_000_000_000);
  return {
    data: {
      platform, handle, url: url || null, followers,
      ref_code: buatRefCode(username, platform, urutan),
      verify_code: kodeVerifikasiChannel(),
    },
  };
}

export function validasiPendaftaran(body) {
  const err = (message) => ({ error: message });
  const p = body?.profil || {};
  const k = body?.pembayaran || {};

  if (body?.setuju !== true) return err("Kamu harus menyetujui Syarat & Ketentuan affiliate.");

  const full_name = teks(p.namaLengkap, 80);
  if (!/^[\p{L}][\p{L} .,'\-]{2,79}$/u.test(full_name)) return err("Nama lengkap harus sesuai KTP (huruf, minimal 3 karakter).");

  const username = teks(p.username, 20).toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return err("Username 3-20 karakter: huruf kecil, angka, atau underscore.");

  const email = teks(p.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return err("Format email gak valid.");

  const lahir = new Date(String(p.tanggalLahir || ""));
  if (Number.isNaN(lahir.getTime())) return err("Tanggal lahir gak valid.");
  const batas = new Date(); batas.setFullYear(batas.getFullYear() - UMUR_MINIMAL);
  if (lahir > batas) return err(`Umur minimal affiliate ${UMUR_MINIMAL} tahun.`);
  if (lahir.getFullYear() < 1930) return err("Tanggal lahir gak valid.");
  const birth_date = lahir.toISOString().slice(0, 10);

  const province = String(p.provinsi || "");
  if (!PROVINSI.includes(province)) return err("Pilih provinsi dari daftar.");
  const city = teks(p.kota, 60);
  if (city.length < 2) return err("Kota/kabupaten wajib diisi.");

  const niche = [...new Set((Array.isArray(p.niche) ? p.niche : []).map(String))].filter((n) => NICHES.includes(n));
  if (niche.length < 1 || niche.length > 5) return err("Pilih 1-5 kategori konten.");
  const bio = teks(p.bio, 200);

  // identitas & pembayaran
  const nik = angka(k.nik);
  if (nik.length !== 16) return err("NIK harus 16 digit.");
  const npwp = angka(k.npwp);
  if (npwp && ![15, 16].includes(npwp.length)) return err("NPWP harus 15 atau 16 digit (boleh dikosongkan).");

  const payout_type = String(k.jenis || "");
  if (!["bank", "ewallet"].includes(payout_type)) return err("Pilih jenis rekening pencairan.");
  const payout_provider = String(k.penyedia || "");
  if (!PAYOUT_PROVIDERS[payout_type].includes(payout_provider)) return err("Pilih bank / e-wallet dari daftar.");
  const nomor = angka(k.nomor);
  const panjangOk = payout_type === "bank" ? nomor.length >= 6 && nomor.length <= 20 : nomor.length >= 9 && nomor.length <= 15;
  if (!panjangOk) return err("Nomor rekening / e-wallet gak valid.");
  const account_name = teks(k.namaPemilik, 80).toUpperCase();
  if (account_name.length < 3) return err("Nama pemilik rekening wajib diisi (sesuai buku tabungan / akun e-wallet).");

  // channel
  const daftarChannel = Array.isArray(body?.channels) ? body.channels : [];
  if (daftarChannel.length < 1) return err("Tambahkan minimal 1 channel sosmed.");
  if (daftarChannel.length > MAX_CHANNELS) return err(`Maksimal ${MAX_CHANNELS} channel.`);
  const channels = [];
  const hitung = {}; const dilihat = new Set();
  for (const c of daftarChannel) {
    const platform = String(c?.platform || "");
    hitung[platform] = (hitung[platform] || 0) + 1;
    const hasil = validasiChannel(c, username, hitung[platform]);
    if (hasil.error) return err(hasil.error);
    const kunci = `${hasil.data.platform}:${hasil.data.handle.toLowerCase()}`;
    if (dilihat.has(kunci)) return err(`Channel ${hasil.data.handle} dobel.`);
    dilihat.add(kunci);
    channels.push(hasil.data);
  }

  return {
    data: {
      profile: { full_name, username, email, birth_date, province, city, niche, bio, terms_version: null },
      kyc: { nik, npwp, payout_type, payout_provider, nomor, account_name },
      channels,
    },
  };
}

// Tampilan aman buat client: data sensitif cuma 4 digit terakhir.
export function topengAffiliate(affiliate, kyc, channels) {
  return {
    id: affiliate.id,
    status: affiliate.status,
    phone: affiliate.phone,
    namaLengkap: affiliate.full_name,
    username: affiliate.username,
    email: affiliate.email,
    provinsi: affiliate.province,
    kota: affiliate.city,
    niche: affiliate.niche || [],
    bio: affiliate.bio,
    terdaftarPada: affiliate.registered_at,
    pembayaran: kyc ? {
      jenis: kyc.payout_type, penyedia: kyc.payout_provider,
      nomorAkhir: kyc.account_last4, namaPemilik: kyc.account_name, nikAkhir: kyc.nik_last4,
      adaNpwp: !!kyc.npwp_enc,
    } : null,
    channels: (channels || []).map((c) => ({
      id: c.id, platform: c.platform, handle: c.handle, url: c.url, followers: c.followers,
      refCode: c.ref_code, kodeVerifikasi: c.verify_code, terverifikasi: !!c.verified_at,
      tipe: c.connection_type, aktif: c.is_active,
    })),
  };
}
