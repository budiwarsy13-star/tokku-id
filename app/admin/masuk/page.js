"use client";

import { useState, useSyncExternalStore } from "react";
import { ShieldCheck } from "lucide-react";
import { adminSupabase } from "@/lib/admin-client";

const PESAN_E = {
  MFA_KEDALUWARSA: "Sesi verifikasi berakhir. Silakan masuk lagi.",
  MFA_DIPERLUKAN: "Verifikasi 2 langkah diperlukan.",
  AKSES_DITOLAK: "Akses ditolak.",
  idle: "Sesi ditutup karena tidak ada aktivitas.",
  BELUM_LOGIN: "Silakan masuk.",
  SESI_TIDAK_VALID: "Sesi tidak valid. Silakan masuk lagi.",
};

export default function MasukAdmin() {
  const [langkah, setLangkah] = useState("kredensial"); // kredensial | verifikasi | daftar
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [kode, setKode] = useState("");
  const [factorId, setFactorId] = useState(null);
  const [qr, setQr] = useState(null); // { gambar, rahasia }
  const [galat, setGalat] = useState("");
  const [sembunyiInfo, setSembunyiInfo] = useState(false);
  const [proses, setProses] = useState(false);
  // Kode alasan dari URL (?e=...). Server merender null, klien membaca URL: tanpa mismatch hydration.
  const kodeE = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get("e"), () => null);
  const info = sembunyiInfo ? "" : PESAN_E[kodeE] || "";

  async function periksa() {
    const { data: { session } } = await adminSupabase().auth.getSession();
    if (!session) return { status: 401, data: {} };
    const res = await fetch("/api/admin/me", { cache: "no-store", headers: { Authorization: `Bearer ${session.access_token}` } });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  }
  async function batalkan(teks) {
    await adminSupabase().auth.signOut();
    setLangkah("kredensial"); setSandi(""); setKode(""); setGalat(teks);
  }

  async function lanjutSetelahLogin() {
    const r = await periksa();
    if (r.status === 403 || r.status === 503 || r.status === 401) return batalkan("Akses ditolak.");
    if (r.status === 429) return batalkan("Terlalu banyak percobaan. Coba lagi sebentar.");
    if (r.data.mfaOk) { window.location.replace("/admin"); return; }
    const sb = adminSupabase();
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) return batalkan("Gagal memuat verifikasi 2 langkah.");
    const aktif = data?.totp?.[0];
    if (aktif) { setFactorId(aktif.id); setLangkah("verifikasi"); return; }
    // Belum punya authenticator: bersihkan sisa pendaftaran yang tidak selesai, lalu daftar baru.
    for (const f of (data?.all || []).filter((x) => x.factor_type === "totp" && x.status === "unverified")) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data: d, error: e2 } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `tokku-admin-${Date.now()}` });
    if (e2 || !d) return batalkan("Gagal menyiapkan verifikasi 2 langkah.");
    setFactorId(d.id); setQr({ gambar: d.totp.qr_code, rahasia: d.totp.secret }); setLangkah("daftar");
  }

  async function masuk(ev) {
    ev.preventDefault(); setGalat(""); setSembunyiInfo(true); setProses(true);
    const { error } = await adminSupabase().auth.signInWithPassword({ email: email.trim(), password: sandi });
    if (error) { setProses(false); setGalat("Email atau kata sandi salah."); return; } // pesan sama utk semua kegagalan
    await lanjutSetelahLogin();
    setProses(false);
  }

  async function verifikasi(ev) {
    ev.preventDefault(); setGalat(""); setProses(true);
    const sb = adminSupabase();
    const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId });
    const { error: e2 } = e1 ? { error: e1 } : await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code: kode.trim() });
    if (e2) { setProses(false); setKode(""); setGalat("Kode salah atau sudah kedaluwarsa."); return; }
    await lanjutSetelahLogin();
    setProses(false);
  }

  const kelas = "w-full px-3 py-2.5 border border-white/15 bg-white/5 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D85A30]";
  return (
    <main className="min-h-screen bg-[#1C1C1A] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6 text-white">
          <ShieldCheck size={22} className="text-[#D85A30]" /> <span className="font-bold text-lg">tokku.id admin</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          {info && <p className="text-sm text-[#F5C16C] mb-4">{info}</p>}
          {galat && <p className="text-sm text-[#F28B82] mb-4">{galat}</p>}

          {langkah === "kredensial" && (
            <form onSubmit={masuk} className="space-y-3" autoComplete="off">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email admin" className={kelas} autoComplete="username" />
              <input type="password" required value={sandi} onChange={(e) => setSandi(e.target.value)} placeholder="Kata sandi" className={kelas} autoComplete="current-password" />
              <button disabled={proses} className="w-full py-2.5 rounded-lg bg-[#D85A30] text-white font-medium disabled:opacity-50">{proses ? "Memeriksa..." : "Masuk"}</button>
            </form>
          )}

          {langkah === "daftar" && qr && (
            <form onSubmit={verifikasi} className="space-y-3">
              <p className="text-sm text-white/80">Pasang verifikasi 2 langkah (wajib). Scan QR dengan Google Authenticator / Authy / 1Password, lalu masukkan kode 6 digit.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.gambar} alt="QR verifikasi 2 langkah" className="w-44 h-44 mx-auto bg-white rounded-lg p-2" />
              <p className="text-[11px] text-white/50 break-all">Tidak bisa scan? Kunci manual: <span className="font-mono text-white/80">{qr.rahasia}</span></p>
              <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={kode} onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))} placeholder="Kode 6 digit" className={`${kelas} text-center tracking-widest`} autoComplete="one-time-code" />
              <button disabled={proses || kode.length !== 6} className="w-full py-2.5 rounded-lg bg-[#D85A30] text-white font-medium disabled:opacity-50">{proses ? "Memeriksa..." : "Aktifkan & masuk"}</button>
            </form>
          )}

          {langkah === "verifikasi" && (
            <form onSubmit={verifikasi} className="space-y-3">
              <p className="text-sm text-white/80">Masukkan kode 6 digit dari aplikasi authenticator.</p>
              <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus value={kode} onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))} placeholder="Kode 6 digit" className={`${kelas} text-center tracking-widest`} autoComplete="one-time-code" />
              <button disabled={proses || kode.length !== 6} className="w-full py-2.5 rounded-lg bg-[#D85A30] text-white font-medium disabled:opacity-50">{proses ? "Memeriksa..." : "Verifikasi"}</button>
            </form>
          )}

          {langkah !== "kredensial" && (
            <button onClick={() => batalkan("")} className="w-full mt-3 text-xs text-white/50 hover:text-white">Batal & keluar</button>
          )}
        </div>
        <p className="text-center text-[11px] text-white/30 mt-4">Akses terbatas. Semua aktivitas dicatat.</p>
      </div>
    </main>
  );
}
