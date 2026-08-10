"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Link2, Package, Target, CreditCard, CheckCircle2, ArrowRight, Zap, TrendingUp, ShieldCheck } from "lucide-react";

const STATS = [
  { value: "Rp0", label: "Biaya mulai" },
  { value: "2 mnt", label: "Setup selesai" },
  { value: "0%", label: "Komisi kami" },
];

const FEATURES = [
  { icon: Link2, text: "1 link untuk semua produk" },
  { icon: Package, text: "Ongkir otomatis seluruh Indonesia" },
  { icon: Target, text: "Pixel Meta & Google Ads siap" },
  { icon: CreditCard, text: "Margin 100% ke kantong kamu" },
];

const TESTIMONIALS = [
  { name: "Rizky A.", store: "Rizky Streetwear", text: "Orderan langsung masuk tanpa drama WA panjang. Gila efisien banget." },
  { name: "Sinta D.", store: "Sinta Studio", text: "Gak nyangka setup-nya secepet ini. 10 menit udah live!" },
  { name: "Budi W.", store: "MOREAL Apparel", text: "Akhirnya bisa jualan tanpa bayar komisi ke marketplace. Margin naik jauh." },
];

const FLOATING_TAGS = [
  "Ongkir Otomatis", "Pixel Meta Ads", "COD Ready", "WA Reminder",
  "Dashboard Seller", "Multi Produk", "Voucher", "Google Ads",
  "RajaOngkir", "Midtrans", "Checkout Instan", "0% Komisi",
];

export default function Daftar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  async function handleDaftar(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message.includes("already")
        ? "Email ini udah terdaftar. Coba masuk aja."
        : error.message);
    } else {
      setSuccess(true);
    }
  }

  return (
    <main className="min-h-screen flex font-[family-name:var(--font-baloo)]">
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0px) rotate(var(--r, 0deg)); opacity: 0.7; }
          50% { transform: translateY(-12px) rotate(var(--r, 0deg)); opacity: 1; }
          100% { transform: translateY(0px) rotate(var(--r, 0deg)); opacity: 0.7; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(216,90,48,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(216,90,48,0); }
        }
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .float-tag { animation: floatUp 3s ease-in-out infinite; }
        .slide-left { animation: slideInLeft 0.6s ease-out forwards; }
        .slide-right { animation: slideInRight 0.6s ease-out forwards; }
        .fade-up { animation: fadeInUp 0.5s ease-out forwards; }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        .scroll-left { animation: scrollLeft 20s linear infinite; }
        .gradient-shift {
          background: linear-gradient(135deg, #D85A30, #E8834F, #D85A30, #B84A25);
          background-size: 300% 300%;
          animation: gradientShift 4s ease infinite;
        }
      `}</style>

      {/* KIRI — Branding */}
      <div className="hidden lg:flex flex-col w-[52%] bg-[#111110] relative overflow-hidden">

        {/* Animated grid background */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: "48px 48px"
          }}
        />

        {/* Glowing orbs */}
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #D85A30 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #D85A30 0%, transparent 70%)" }} />
        <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #E8834F 0%, transparent 70%)" }} />

        {/* Top nav */}
        <div className="relative z-10 px-10 pt-10">
          <a href="/" className="font-bold text-2xl tracking-tight text-white inline-block">
            tok<span className="text-[#D85A30]">k</span>u
            <span className="text-[#444] font-normal">.id</span>
          </a>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 py-8">

          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D85A30]/30 bg-[#D85A30]/10 mb-6 w-fit ${mounted ? 'slide-left' : 'opacity-0'}`}
            style={{ animationDelay: '0.1s' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#D85A30] pulse-glow" />
            <span className="text-xs font-bold text-[#D85A30] uppercase tracking-widest">Platform Jualan Langsung</span>
          </div>

          {/* Headline */}
          <div className={mounted ? 'slide-left' : 'opacity-0'} style={{ animationDelay: '0.2s' }}>
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.05] tracking-tight mb-5">
              Jualan<br />
              <span className="relative">
                <span className="text-[#D85A30]">langsung.</span>
                <svg className="absolute -bottom-1 left-0 w-full" height="4" viewBox="0 0 200 4">
                  <path d="M0 2 Q50 0 100 2 Q150 4 200 2" stroke="#D85A30" strokeWidth="2" fill="none" opacity="0.5" />
                </svg>
              </span><br />
              <span className="text-[#444]">Tanpa potongan.</span>
            </h1>
            <p className="text-[#666] text-sm leading-relaxed max-w-xs mb-8">
              Bikin halaman checkout brand kamu dalam menit. Ongkir otomatis, pixel iklan siap, dan margin 100% tetap di kantong kamu — bukan marketplace.
            </p>
          </div>

          {/* Stats */}
          <div className={`flex gap-6 mb-8 ${mounted ? 'fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-[#555] uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className={`space-y-2 mb-8 ${mounted ? 'fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            {FEATURES.map((f, i) => (
              <div key={f.text}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/15 transition-all cursor-default"
                style={{ animationDelay: `${0.4 + i * 0.08}s` }}>
                <div className="w-7 h-7 rounded-lg bg-[#D85A30]/15 border border-[#D85A30]/20 flex items-center justify-center flex-shrink-0">
                  <f.icon size={14} color="#D85A30" strokeWidth={2} />
                </div>
                <span className="text-sm text-[#B4B2A9]">{f.text}</span>
                <CheckCircle2 size={14} color="#3B6D11" className="ml-auto opacity-70" />
              </div>
            ))}
          </div>

          {/* Testimonial carousel */}
          <div className={`${mounted ? 'fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
            <div className="rounded-xl border border-white/10 bg-white/4 p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#D85A30] rounded-l-xl" />
              <div key={activeTestimonial} className="fade-up pl-3">
                <p className="text-sm text-[#C4C2BA] leading-relaxed mb-2 italic">
                  "{TESTIMONIALS[activeTestimonial].text}"
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#D85A30] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{TESTIMONIALS[activeTestimonial].name[0]}</span>
                  </div>
                  <span className="text-xs text-[#666]">
                    <strong className="text-[#888]">{TESTIMONIALS[activeTestimonial].name}</strong>
                    {" · "}{TESTIMONIALS[activeTestimonial].store}
                  </span>
                </div>
              </div>
              {/* Dot indicators */}
              <div className="flex gap-1.5 mt-3 pl-3">
                {TESTIMONIALS.map((_, i) => (
                  <div key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{ width: i === activeTestimonial ? 16 : 4, background: i === activeTestimonial ? '#D85A30' : '#333' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrolling tags */}
        <div className="relative z-10 pb-8 overflow-hidden">
          <div className="flex gap-2 scroll-left w-max">
            {[...FLOATING_TAGS, ...FLOATING_TAGS].map((tag, i) => (
              <span key={i}
                className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-[#555] whitespace-nowrap flex-shrink-0">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KANAN — Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-[#FAFAF7] relative overflow-hidden">

        {/* Subtle bg decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #FAECE7 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FAECE7 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 relative z-10">
          <a href="/" className="font-bold text-2xl tracking-tight text-[#1C1C1A]">
            tok<span className="text-[#D85A30]">k</span>u
            <span className="text-[#8B8D85] font-normal">.id</span>
          </a>
        </div>

        <div className={`w-full max-w-sm relative z-10 ${mounted ? 'slide-right' : 'opacity-0'}`}>

          {success ? (
            /* SUCCESS STATE */
            <div className="text-center fade-up">
              <div className="w-20 h-20 rounded-full bg-[#EAF1E8] flex items-center justify-center mx-auto mb-5 pulse-glow">
                <CheckCircle2 size={40} color="#3B6D11" />
              </div>
              <h2 className="text-2xl font-black text-[#1C1C1A] mb-2">Yeay, akun jadi! 🎉</h2>
              <p className="text-sm text-[#8B8D85] mb-6 leading-relaxed">
                Link konfirmasi udah gue kirim ke{" "}
                <strong className="text-[#1C1C1A]">{email}</strong>.
                Klik linknya, terus langsung bisa bikin toko pertama kamu.
              </p>
              <div className="bg-white rounded-2xl border border-[#E5E2D9] p-5 text-left mb-6 shadow-sm">
                <p className="text-xs font-bold text-[#5B6472] uppercase tracking-wider mb-4">Setelah konfirmasi:</p>
                {[
                  { icon: Zap, text: "Upload produk pertama kamu" },
                  { icon: Link2, text: "Dapat link toko yang siap share" },
                  { icon: TrendingUp, text: "Pasang di bio IG atau iklan" },
                  { icon: ShieldCheck, text: "Terima order & pembayaran" },
                ].map((s) => (
                  <div key={s.text} className="flex items-center gap-3 py-2 border-b border-[#F1EFE8] last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-[#FAECE7] flex items-center justify-center flex-shrink-0">
                      <s.icon size={14} color="#D85A30" strokeWidth={2} />
                    </div>
                    <span className="text-sm text-[#5B6472]">{s.text}</span>
                  </div>
                ))}
              </div>
              <a href="/masuk"
                className="w-full py-4 gradient-shift text-white rounded-2xl font-black text-sm transition-all hover:shadow-lg hover:-translate-y-0.5 block text-center">
                Masuk ke dashboard →
              </a>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF1E8] border border-[#BFE6C2] mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
                  <span className="text-xs font-bold text-[#3B6D11]">Gratis sampai 15 order/bulan</span>
                </div>
                <h2 className="text-3xl font-black text-[#1C1C1A] leading-tight mb-1">
                  Bikin toko<br />sekarang juga.
                </h2>
                <p className="text-sm text-[#8B8D85]">Gak perlu kartu kredit. Setup 2 menit.</p>
              </div>

              {/* Form */}
              <form onSubmit={handleDaftar} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block mb-2">
                    Email
                  </label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kamu@email.com"
                    className="w-full px-4 py-3.5 border-2 border-[#E5E2D9] rounded-2xl text-sm bg-white focus:outline-none focus:border-[#D85A30] transition-all placeholder:text-[#C4C2BA]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required minLength={6} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-4 py-3.5 border-2 border-[#E5E2D9] rounded-2xl text-sm bg-white focus:outline-none focus:border-[#D85A30] transition-all pr-12 placeholder:text-[#C4C2BA]"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C4C2BA] hover:text-[#8B8D85] transition-colors">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className="px-4 py-3 bg-[#FBEAEA] border border-[#F0BEBE] rounded-2xl text-sm text-[#A32D2D] flex items-start gap-2">
                    <span className="mt-0.5">⚠️</span>
                    <span>{message}</span>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-4 gradient-shift text-white rounded-2xl font-black text-base transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memproses...
                    </>
                  ) : (
                    <>Daftar Gratis Sekarang <ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              {/* Trust badges */}
              <div className="mt-5 flex items-center justify-center gap-4">
                {[
                  { icon: ShieldCheck, text: "Aman & terenkripsi" },
                  { icon: Zap, text: "Setup 2 menit" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-1.5">
                    <b.icon size={13} color="#8B8D85" strokeWidth={1.75} />
                    <span className="text-xs text-[#8B8D85]">{b.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-[#E5E2D9] text-center">
                <p className="text-sm text-[#8B8D85]">
                  Udah punya akun?{" "}
                  <a href="/masuk" className="text-[#D85A30] font-bold hover:underline">
                    Masuk di sini
                  </a>
                </p>
              </div>

              <p className="text-xs text-center text-[#C4C2BA] mt-4 leading-relaxed">
                Dengan daftar, kamu setuju sama{" "}
                <a href="#" className="underline hover:text-[#8B8D85]">Syarat & Ketentuan</a>
                {" "}dan{" "}
                <a href="#" className="underline hover:text-[#8B8D85]">Kebijakan Privasi</a>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}