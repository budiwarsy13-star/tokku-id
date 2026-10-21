// Helper WhatsApp (Fonnte) buat WA Blast. Server-only.
import { createHmac, timingSafeEqual } from "crypto";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tokku-id.vercel.app";

// Token device Fonnte. Sebelumnya modul blast/cart-recovery pakai WA_API_KEY sedangkan
// notifikasi pesanan pakai FONNTE_TOKEN -> salah satunya selalu mati. Sekarang satu pintu.
export const tokenWA = () => process.env.WA_API_KEY || process.env.FONNTE_TOKEN || "";

// 0813xxx / 813xxx / +62813xxx -> 62813xxx
export function normalisasiTelepon(nomor) {
  let n = String(nomor || "").replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return n;
}
export function teleponValid(n) {
  return /^62\d{8,13}$/.test(n);
}

// Tanda tangan link berhenti: cuma server yang bisa bikin, jadi orang gak bisa
// mendaftarkan nomor orang lain ke daftar berhenti dengan nebak URL.
function kunciOptout() {
  return process.env.WA_OPTOUT_SECRET || process.env.CRON_SECRET || "";
}
export function buatSigOptout(storeId, phone) {
  return createHmac("sha256", kunciOptout()).update(`optout:${storeId}:${phone}`).digest("hex").slice(0, 24);
}
export function sigOptoutValid(storeId, phone, sig) {
  if (!kunciOptout()) return false;
  const benar = Buffer.from(buatSigOptout(storeId, phone));
  const dikirim = Buffer.from(String(sig || ""));
  return benar.length === dikirim.length && timingSafeEqual(benar, dikirim);
}

// Format target Fonnte = nomor|nama|var1 -> karakter pemisah di nama harus dibuang
export function bersihkanNama(nama) {
  const depan = String(nama || "").replace(/[|,{}\r\n]/g, " ").trim().split(/\s+/)[0] || "Kak";
  return depan.slice(0, 20);
}

// Template seller -> pesan final untuk Fonnte.
// {nama} -> {name} (diisi Fonnte per penerima), {toko}/{link} diisi di sini.
// Kurung kurawal lain dibuang biar seller gak nyasar ke variabel Fonnte lain.
export function susunPesan(template, store) {
  const toko = String(store.name || "").replace(/[{}]/g, "");
  const link = `${SITE_URL}/${store.slug}?ref=wablast`;
  let t = String(template || "")
    .replace(/\{nama\}/gi, "\u0001")
    .replace(/\{toko\}/gi, toko)
    .replace(/\{link\}/gi, link)
    .replace(/[{}]/g, "")
    .replace(/\u0001/g, "{name}");
  t += `\n\nTidak mau menerima promo dari ${toko} lagi? Klik:\n${SITE_URL}/berhenti/{var1}`;
  return t;
}

export async function kirimFonnte({ targets, message, delay = "15-40" }) {
  if (!tokenWA()) return { ok: false, detail: "Token WhatsApp (WA_API_KEY) belum diset." };
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { Authorization: tokenWA() },
    body: new URLSearchParams({ target: targets.join(","), message, delay, countryCode: "62" }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.status === true, detail: data.reason || data.detail || "" };
}

// Kirim 1 pesan ke 1 nomor (notifikasi transaksional). Nomor dinormalisasi & divalidasi dulu.
export async function kirimPesanWA(nomor, pesan) {
  const target = normalisasiTelepon(nomor);
  if (!teleponValid(target)) return { ok: false, detail: "Nomor WA tidak valid." };
  return kirimFonnte({ targets: [target], message: pesan, delay: "1" });
}
