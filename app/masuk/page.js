"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

import { Link2, Package, Target, CreditCard } from "lucide-react";

const FEATURES = [
  { icon: Link2, text: "1 link checkout, langsung aktif" },
  { icon: Package, text: "Ongkir otomatis ke seluruh Indonesia" },
  { icon: Target, text: "Pixel Meta & Google Ads siap pakai" },
  { icon: CreditCard, text: "Pembayaran langsung masuk, tanpa potongan marketplace" },
];

export default function Masuk() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleMasuk(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMessage(error.message.includes("Invalid") ? "Email atau password salah." : error.message);
      return;
    }

    // Pastiin sesi beneran udah kesimpen sebelum redirect (fix khusus buat Safari iOS)
    let sesiSiap = false;
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        sesiSiap = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setLoading(false);

    if (sesiSiap) {
      window.location.href = "/dashboard";
    } else {
      setMessage("Login berhasil tapi ada kendala teknis, coba refresh halaman.");
    }
  }

  return (
    <main className="min-h-screen flex">

      {/* KIRI — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#1C1C1A] px-14 py-12 relative overflow-hidden">

        {/* Pattern background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: "32px 32px"
          }} />
        </div>

        {/* Accent blob */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D85A30, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D85A30, transparent)", transform: "translate(-30%, 30%)" }} />

        {/* Logo */}
        <span className="font-bold text-2xl tracking-tight text-white">
  tok<span className="text-[#D85A30]">k</span>u
  <span className="text-[#666] font-normal">.id</span>
</span>

        {/* Headline */}
        <div className="relative z-10">
          <p className="text-[#ffffff] text-xs font-medium uppercase tracking-widest mb-4">
            Platform jualan langsung
          </p>
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
            Margin penuh.<br />
            <span className="text-[#D85A30]">Tanpa</span> potongan<br />
            marketplace.
          </h1>
          <p className="text-[#8B8D85] text-sm leading-relaxed mb-10 max-w-xs">
            Bikin toko online kamu sendiri dalam menit — lengkap dengan checkout, ongkir otomatis, dan pixel iklan.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/8 border border-white/15">
  <f.icon size={16} color="#D85A30" strokeWidth={1.75} className="flex-shrink-0" />
  <span className="text-sm text-[#C4C2BA]">{f.text}</span>
</div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 border-t border-[#2C2C2A] pt-6">
          <p className="text-xs text-[#ffffff]">
            "Biaya admin marketplace 10%-30% itu besar. Tokku.id = flat Rp99rb/bulan."
          </p>
        </div>
      </div>

      {/* KANAN — Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-[#FAFAF7]">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <a href="/" className="font-bold text-2xl tracking-tight text-[#1C1C1A]">
            tok<span className="text-[#D85A30]">k</span>u
            <span className="text-[#8B8D85] font-normal">.id</span>
          </a>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#1C1C1A] mb-1">Selamat datang</h2>
            <p className="text-sm text-[#8B8D85]">Masuk buat kelola toko kamu.</p>
          </div>

          <form onSubmit={handleMasuk} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#5B6472] uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="w-full px-4 py-3 border border-[#E5E2D9] rounded-xl text-sm bg-white focus:outline-none focus:border-[#D85A30] focus:ring-2 focus:ring-[#D85A30]/10 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#5B6472] uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-[#E5E2D9] rounded-xl text-sm bg-white focus:outline-none focus:border-[#D85A30] focus:ring-2 focus:ring-[#D85A30]/10 transition-all pr-11"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8D85] hover:text-[#5B6472]">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {message && (
              <div className="px-4 py-3 bg-[#FBEAEA] border border-[#F0BEBE] rounded-xl text-sm text-[#A32D2D]">
                {message}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#D85A30] hover:bg-[#B84A25] text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </span>
              ) : "Masuk ke dashboard"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E5E2D9] text-center">
            <p className="text-sm text-[#8B8D85]">
              Belum punya akun?{" "}
              <a href="/daftar" className="text-[#D85A30] font-semibold hover:underline">
                Daftar gratis
              </a>
            </p>
          </div>

          {/* Social proof mini */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="flex -space-x-1.5">
              {["#D85A30", "#3B6D11", "#2C5F8A"].map((c) => (
                <div key={c} className="w-6 h-6 rounded-full border-2 border-[#FAFAF7]"
                  style={{ background: c }} />
              ))}
            </div>
            <p className="text-xs text-[#8B8D85]">Ribuan seller udah jualan di Tokku.id</p>
          </div>
        </div>
      </div>
    </main>
  );
}