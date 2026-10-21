// Sesi pembeli di browser (hasil verifikasi OTP email). Token disimpan di localStorage dan
// dikirim sebagai header Authorization ke semua API portal pembeli.
const KUNCI = "tokku_buyer_session";

export function ambilSesi() {
  try {
    const s = JSON.parse(localStorage.getItem(KUNCI) || "null");
    if (!s?.token || !s?.expiresAt || new Date(s.expiresAt) < new Date()) {
      localStorage.removeItem(KUNCI);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function simpanSesi({ token, expiresAt, email }) {
  try { localStorage.setItem(KUNCI, JSON.stringify({ token, expiresAt, email })); } catch {}
}

export function hapusSesiLokal() {
  try { localStorage.removeItem(KUNCI); } catch {}
}

export async function keluar() {
  const s = ambilSesi();
  hapusSesiLokal();
  if (s) {
    try { await fetch("/api/buyer/keluar", { method: "POST", headers: { Authorization: `Bearer ${s.token}` } }); } catch {}
  }
}

// fetch yang otomatis membawa token. Kalau server bilang sesi habis (401), sesi lokal dihapus.
export async function buyerFetch(url, options = {}) {
  const s = ambilSesi();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...(s ? { Authorization: `Bearer ${s.token}` } : {}) },
  });
  if (res.status === 401) hapusSesiLokal();
  return res;
}
