"use client";

import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { simpanSesi } from "@/lib/buyer-session";

// Verifikasi pembeli: masukkan email yang dipakai saat checkout -> terima kode 6 digit -> masuk.
// Dipakai di /portal dan /lacak. onBerhasil({ token, expiresAt, email }) dipanggil setelah sukses.
export default function BuyerVerifikasi({ onBerhasil, aksen = "#D85A30" }) {
  const [tahap, setTahap] = useState("email"); // email -> kode
  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function mintaKode(e) {
    e?.preventDefault();
    setLoading(true); setError(""); setInfo("");
    try {
      const res = await fetch("/api/buyer/kirim-kode", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (d.success) { setTahap("kode"); setInfo(d.message); }
      else setError(d.message || "Gagal mengirim kode.");
    } catch { setError("Koneksi bermasalah, coba lagi."); }
    setLoading(false);
  }

  async function verifikasi(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/buyer/verifikasi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: kode }),
      });
      const d = await res.json();
      if (d.success) { simpanSesi(d); onBerhasil?.(d); }
      else setError(d.message || "Kode salah.");
    } catch { setError("Koneksi bermasalah, coba lagi."); }
    setLoading(false);
  }

  const tombol = "w-full py-3.5 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50";
  const input = "w-full px-4 py-3.5 border-2 border-[#E5E2D9] rounded-2xl text-sm text-[#1C1C1A] focus:outline-none transition-all";

  return tahap === "email" ? (
    <form onSubmit={mintaKode} className="space-y-4">
      <div>
        <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block mb-2">Email saat checkout</label>
        <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="email@kamu.com" autoComplete="email" className={input} />
      </div>
      {error && <p className="text-sm text-[#A32D2D] bg-[#FBEAEA] px-4 py-2.5 rounded-xl">{error}</p>}
      <button type="submit" disabled={loading} className={tombol} style={{ background: aksen }}>
        <Mail size={16} /> {loading ? "Mengirim kode..." : "Kirim kode verifikasi"}
      </button>
      <p className="text-xs text-[#8B8D85] text-center">
        Pesanan yang dibuat sebelum verifikasi email diwajibkan belum bisa dilacak di sini — hubungi penjual.
      </p>
    </form>
  ) : (
    <form onSubmit={verifikasi} className="space-y-4">
      {info && <p className="text-sm text-[#3B6D11] bg-[#EAF3DE] px-4 py-2.5 rounded-xl">{info}</p>}
      <div>
        <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block mb-2">Kode 6 digit</label>
        <input type="text" required value={kode} maxLength={6} inputMode="numeric" autoComplete="one-time-code"
          onChange={(e) => { setKode(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="••••••" className={`${input} text-center text-xl font-mono tracking-[0.4em]`} />
      </div>
      {error && <p className="text-sm text-[#A32D2D] bg-[#FBEAEA] px-4 py-2.5 rounded-xl">{error}</p>}
      <button type="submit" disabled={loading || kode.length !== 6} className={tombol} style={{ background: aksen }}>
        <ShieldCheck size={16} /> {loading ? "Memverifikasi..." : "Verifikasi & lanjut"}
      </button>
      <div className="flex justify-between text-xs text-[#8B8D85]">
        <button type="button" onClick={() => { setTahap("email"); setKode(""); setError(""); }} className="hover:text-[#D85A30]">Ganti email</button>
        <button type="button" onClick={mintaKode} disabled={loading} className="hover:text-[#D85A30]">Kirim ulang kode</button>
      </div>
    </form>
  );
}