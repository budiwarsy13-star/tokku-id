"use client";

import { useState, useEffect, useRef } from "react";
import { Link2, TrendingUp, Wallet, ShieldCheck, ArrowRight } from "lucide-react";
import AffiliateShell from "@/components/AffiliateShell";

const MANFAAT = [
  { icon: Link2, judul: "Link per channel", teks: "Tiap akun sosmed kamu punya link sendiri, jadi ketahuan channel mana yang paling cuan." },
  { icon: TrendingUp, judul: "Dashboard lengkap", teks: "Klik, order, konversi, dan komisi tiap transaksi. Semua kelihatan." },
  { icon: Wallet, judul: "Cair tiap minggu", teks: "Komisi yang sudah terkunci dibayar per batch mingguan ke rekening kamu." },
  { icon: ShieldCheck, judul: "Tanpa password", teks: "Masuk pakai kode WhatsApp. Data identitas kamu disimpan terenkripsi." },
];

async function panggil(url, opsi) {
  const res = await fetch(url, { ...opsi, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, data };
}

export default function AffiliateMasuk() {
  const [tahap, setTahap] = useState("cek"); // cek | nomor | kode
  const [phone, setPhone] = useState("");
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState("");
  const [jeda, setJeda] = useState(0);
  const kodeRef = useRef(null);

  // Sudah punya sesi? langsung arahkan sesuai status.
  useEffect(() => {
    (async () => {
      const { ok, data } = await panggil("/api/affiliate/me");
      if (ok) {
        window.location.href = data.affiliate.status === "aktif" ? "/affiliate/dashboard" : "/affiliate/daftar";
      } else setTahap("nomor");
    })();
  }, []);

  useEffect(() => {
    if (jeda <= 0) return;
    const t = setTimeout(() => setJeda(jeda - 1), 1000);
    return () => clearTimeout(t);
  }, [jeda]);

  async function kirimKode(e) {
    e?.preventDefault();
    setLoading(true); setPesan("");
    const { ok, data } = await panggil("/api/affiliate/otp/kirim", { method: "POST", body: JSON.stringify({ phone }) });
    setLoading(false);
    if (!ok) { setPesan(data.message || "Gagal kirim kode."); if (data.sisaDetik) { setJeda(data.sisaDetik); setTahap("kode"); } return; }
    setTahap("kode"); setJeda(data.sisaDetik || 60); setKode("");
    setTimeout(() => kodeRef.current?.focus(), 50);
  }

  async function verifikasi(e) {
    e.preventDefault();
    setLoading(true); setPesan("");
    const { ok, data } = await panggil("/api/affiliate/otp/verifikasi", { method: "POST", body: JSON.stringify({ phone, code: kode }) });
    if (!ok) { setLoading(false); setPesan(data.message || "Kode salah."); return; }
    window.location.href = data.status === "aktif" ? "/affiliate/dashboard" : "/affiliate/daftar";
  }

  return (
    <AffiliateShell lebar="max-w-5xl">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
        <div>
          <p className="text-xs font-semibold text-[#D85A30] uppercase tracking-wider mb-3">Tokku Affiliate</p>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Promosiin produk, dapet komisi, tahu persis dari mana cuannya.
          </h1>
          <p className="text-[#5B6472] mb-8">
            Daftarkan sosmed kamu, dapat link khusus per channel, dan pantau performanya satu per satu.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {MANFAAT.map((m) => (
              <div key={m.judul} className="bg-white border border-[#E5E2D9] rounded-2xl p-4">
                <m.icon size={20} className="text-[#D85A30] mb-2" strokeWidth={1.75} />
                <p className="font-semibold text-sm mb-1">{m.judul}</p>
                <p className="text-xs text-[#5B6472] leading-relaxed">{m.teks}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 lg:p-8 shadow-sm">
          {tahap === "cek" && <p className="text-sm text-[#8B8D85]">Memuat...</p>}

          {tahap === "nomor" && (
            <form onSubmit={kirimKode}>
              <h2 className="text-xl font-bold mb-1">Daftar atau masuk</h2>
              <p className="text-sm text-[#5B6472] mb-5">Kami kirim kode verifikasi ke WhatsApp kamu.</p>
              <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Nomor WhatsApp</label>
              <input type="tel" inputMode="numeric" required autoFocus value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full border border-[#E5E2D9] rounded-xl px-4 py-3 text-base mb-4 focus:outline-none focus:border-[#D85A30]" />
              {pesan && <p className="text-sm text-[#A32D2D] mb-3">{pesan}</p>}
              <button disabled={loading || jeda > 0} className="w-full bg-[#D85A30] text-white font-semibold py-3 rounded-xl hover:bg-[#C14E27] disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? "Mengirim..." : <>Kirim kode <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {tahap === "kode" && (
            <form onSubmit={verifikasi}>
              <h2 className="text-xl font-bold mb-1">Masukkan kode</h2>
              <p className="text-sm text-[#5B6472] mb-5">Kode 6 digit dikirim ke WhatsApp <strong>{phone}</strong>.</p>
              <input ref={kodeRef} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
                value={kode} onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))}
                placeholder="______"
                className="w-full border border-[#E5E2D9] rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center mb-4 focus:outline-none focus:border-[#D85A30]" />
              {pesan && <p className="text-sm text-[#A32D2D] mb-3">{pesan}</p>}
              <button disabled={loading || kode.length !== 6} className="w-full bg-[#D85A30] text-white font-semibold py-3 rounded-xl hover:bg-[#C14E27] disabled:opacity-60">
                {loading ? "Memeriksa..." : "Verifikasi"}
              </button>
              <div className="flex items-center justify-between mt-4 text-sm">
                <button type="button" onClick={() => { setTahap("nomor"); setPesan(""); }} className="text-[#5B6472] hover:underline">Ganti nomor</button>
                <button type="button" disabled={jeda > 0 || loading} onClick={kirimKode} className="text-[#D85A30] disabled:text-[#8B8D85] hover:underline">
                  {jeda > 0 ? `Kirim ulang (${jeda}s)` : "Kirim ulang kode"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AffiliateShell>
  );
}
