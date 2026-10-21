import dns from "dns/promises";
import net from "net";

// KHUSUS SERVER (pakai modul Node `dns` & `net`) — jangan diimpor dari komponen client.
// Dipisah dari bulk-import-server.js karena file itu juga dipakai halaman import di browser.

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB, samain sama batas upload manual
const IMAGE_FETCH_TIMEOUT_MS = 8000;

// ── Anti-SSRF: URL gambar dari CSV diisi seller, jadi server TIDAK boleh mau mengambil dari alamat
//    internal (localhost, jaringan privat, metadata cloud 169.254.x.x). Tiap hop redirect dicek ulang.
function ipv4Privat(ip) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||   // CGNAT
    (a === 169 && b === 254) ||             // link-local + metadata cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
function ipPrivat(ip) {
  const v = net.isIP(ip);
  if (v === 4) return ipv4Privat(ip);
  if (v === 6) {
    // Hanya izinkan IPv6 unicast global (2000::/3). Sisanya (loopback, ULA, link-local, IPv4-mapped
    // seperti ::ffff:7f00:1, NAT64, dll) ditolak. 6to4 (2002::/16) & Teredo (2001:0::/32) juga ditolak
    // karena bisa menyelundupkan alamat IPv4 internal.
    const l = ip.toLowerCase();
    const hextet = parseInt(l.split(":")[0] || "0", 16);
    if (hextet < 0x2000 || hextet > 0x3fff) return true;
    if (l.startsWith("2002:") || l.startsWith("2001:0:") || l.startsWith("2001:0000:")) return true;
    return false;
  }
  return true; // bukan IP valid -> tolak
}
async function urlAman(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  if (u.port && !["80", "443"].includes(u.port)) return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return !ipPrivat(host);
  try {
    const alamat = await dns.lookup(host, { all: true });
    return alamat.length > 0 && alamat.every((a) => !ipPrivat(a.address));
  } catch { return false; }
}

const FORMAT_GAMBAR = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
function deteksiFormat(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.toString("hex", 0, 8) === "89504e470d0a1a0a") return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length > 6 && buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}

// Gagal ambil 1 gambar TIDAK menggagalkan seluruh baris — cuma gambar itu
// yang di-skip, biar 1 link mati gak bikin produk gagal total.
export async function unduhDanUploadGambar(supabaseAdmin, storeId, imageUrl) {
  try {
    let url = String(imageUrl || "").trim();
    let res = null;

    for (let hop = 0; hop <= 3; hop++) {
      if (!(await urlAman(url))) return { success: false, message: "URL gambar tidak diizinkan." };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
      try {
        res = await fetch(url, { signal: controller.signal, redirect: "manual" });
      } finally {
        clearTimeout(timeout);
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location"), url).toString(); // ikuti redirect, tapi dicek ulang
        res = null;
        continue;
      }
      break;
    }
    if (!res) return { success: false, message: "Terlalu banyak redirect." };
    if (!res.ok) return { success: false, message: `Gagal ambil gambar (HTTP ${res.status}).` };

    // Baca bertahap & berhenti begitu lewat batas (jangan tarik file raksasa ke memori dulu).
    const potongan = [];
    let total = 0;
    for await (const chunk of res.body) {
      total += chunk.length;
      if (total > MAX_IMAGE_BYTES) return { success: false, message: "Gambar kegedean (maks 5MB)." };
      potongan.push(chunk);
    }
    const buffer = Buffer.concat(potongan);

    // Percaya isi file, bukan header Content-Type. SVG sengaja ditolak (bisa memuat script).
    const contentType = deteksiFormat(buffer);
    if (!contentType) return { success: false, message: "URL bukan file gambar (JPG/PNG/WEBP/GIF)." };

    const path = `${storeId}/import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${FORMAT_GAMBAR[contentType]}`;
    const { error: uploadError } = await supabaseAdmin.storage.from("Produk").upload(path, buffer, { contentType });
    if (uploadError) return { success: false, message: uploadError.message };

    const { data } = supabaseAdmin.storage.from("Produk").getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (err) {
    const message = err.name === "AbortError" ? "Timeout ambil gambar." : "Gagal mengambil gambar.";
    return { success: false, message };
  }
}
