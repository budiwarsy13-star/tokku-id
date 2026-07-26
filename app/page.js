"use client";

import { useState, useEffect } from "react";
import {
  Link2, Package, Target, ArrowRight, Star,
  ClipboardList, Zap, PieChart, Link, DollarSign, Receipt,
  MessageCircle, Bell, Wallet2, Users, Percent, MailWarning, Sheet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ====== PENGATURAN TAMPILAN — UBAH DI SINI ======
const THEME = {
  logo: {
    size: "36px",
  },
  badge: {
    size: "18px",
    color: "#D85A30",
    marginBottom: "20px",   // jarak badge ke judul di bawahnya
  },
  heroTitle: {
    size: "60px",
    marginBottom: "40px",   // jarak judul hero ke paragraf di bawahnya
  },
  sectionTitle: {
    size: "34px",
    marginBottom: "24px",   // jarak judul section ke deskripsi di bawahnya
  },
  section: {
    paddingY: "96px",       // jarak atas-bawah tiap section (fitur, harga, dll)
  },
  paragraph: {
    marginBottom: "48px",   // jarak paragraf deskripsi ke konten di bawahnya
  },
  nav: {
    gapMenuTombol: "32px",   // jarak antara menu Fitur/Harga/FAQ ke tombol Keluar/Dashboard
  },
};
// =================================================

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return (
    <main className="min-h-screen bg-[#FAFAF7] font-[family-name:var(--font-baloo)]">

      {/* ANNOUNCEMENT BAR */}
      <div className="bg-[#1C1C1A] text-white text-center text-sm py-2.5 px-4">
        <span className="font-medium">Fitur import produk pakai AI udah bisa dicoba!</span>{" "}
        <a href="/daftar" className="underline underline-offset-2 hover:text-[#F0997B]">
          Cobain sekarang →
        </a>
      </div>

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2D9] bg-white">
        <span className="font-bold tracking-tight text-[#1C1C1A]" style={{ fontSize: THEME.logo.size }}>
  tok<span className="text-[#D85A30]">k</span>u<span className="text-[#8B8D85] font-normal">.id</span>
</span>
        <div className="flex items-center" style={{ gap: THEME.nav.gapMenuTombol }}>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#5B6472] font-medium">
            <a href="#fitur" className="hover:text-[#1C1C1A]">Fitur</a>
            <a href="#harga" className="hover:text-[#1C1C1A]">Harga</a>
            <a href="#faq" className="hover:text-[#1C1C1A]">FAQ</a>
          </div>
          <div className="flex gap-2 items-center">
          {user ? (
            <>
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
                className="px-4 py-2 text-sm bg-[#F1EFE8] text-[#1C1C1A] rounded-full hover:bg-[#E5E2D9] transition-colors font-medium"
              >
                Keluar
              </button>
              <a href="/dashboard" className="px-4 py-2 text-sm bg-[#D85A30] text-white rounded-full hover:bg-[#B84A25] transition-colors font-medium">
                Dashboard
              </a>
            </>
          ) : (
            <>
              <a href="/masuk" className="px-4 py-2 text-sm bg-[#F1EFE8] text-[#1C1C1A] rounded-full hover:bg-[#E5E2D9] transition-colors font-medium">
                Masuk
              </a>
              <a href="/daftar" className="px-4 py-2 text-sm bg-[#D85A30] text-white rounded-full hover:bg-[#B84A25] transition-colors font-medium">
                Daftar Gratis
              </a>
            </>
          )}
        </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 text-center" style={{ paddingTop: THEME.section.paddingY, paddingBottom: THEME.section.paddingY }}>
        <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-[#FAECE7] text-[#D85A30] rounded-full mb-6 font-bold border border-[#F0997B]/30">
  GRATIS TIAP BULAN! Sampai order ke-15 — GAK PAKE LAMA!
</span>

        <h1 className="font-bold leading-tight tracking-tight" style={{ fontSize: THEME.heroTitle.size, marginBottom: THEME.heroTitle.marginBottom }}>
          <span className="text-[#1C1C1A]">Jualan Langsung, </span>
          <span className="text-[#D85A30]">Tanpa Potongan</span>
          <span className="text-[#1C1C1A]"> Marketplace</span>
        </h1>

        <p className="text-[#5B6472] text-lg mb-10 max-w-2xl mx-auto">
          tokku.id bantu kamu bikin halaman checkout brand sendiri dalam menit.
          Ongkir otomatis, pixel iklan siap, dan margin kamu tetap utuh — tanpa bayar komisi ke siapapun.
        </p>

        <div className="flex flex-col items-center gap-4">
          <a
            href="/daftar"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#D85A30] text-white rounded-full text-lg font-semibold hover:bg-[#B84A25] transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            Mulai Gratis Sekarang
            <ArrowRight size={20} />
          </a>
          <p className="text-xs text-[#8B8D85] flex items-center gap-1">
  <span className="text-[#3B6D11]">✓</span> Gak perlu kartu kredit · Upgrade kalau udah siap
</p>
        </div>

        {/* SOCIAL PROOF */}
        <div className="flex items-center justify-center gap-3 mt-10">
          <div className="flex -space-x-2">
            {["#5085e7", "#1C1C1A", "#F0997B", "#8B8D85"].map((c, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: c }}
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <div className="text-left">
            <div className="flex text-[#F5B93F]">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" strokeWidth={0} />)}
            </div>
            <p className="text-xs text-[#8B8D85]">Dipercaya seller di seluruh Indonesia</p>
          </div>
        </div>
      </section>
      {/* TRUST STATS */}
      <section className="bg-[#F1EFE8] py-12">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold text-[#1C1C1A]">2 Menit</p>
            <p className="text-xs text-[#8B8D85] font-medium mt-1">SETUP TOKO SELESAI</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-[#1C1C1A]">Rp0</p>
            <p className="text-xs text-[#8B8D85] font-medium mt-1">BIAYA UNTUK MULAI</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-[#1C1C1A]">0%</p>
            <p className="text-xs text-[#8B8D85] font-medium mt-1">KOMISI KE TOKKU.ID</p>
          </div>
        </div>
      </section>

      {/* FITUR ALL-IN-ONE */}
      <section id="fitur" className="max-w-3xl mx-auto px-6 text-center" style={{ paddingTop: THEME.section.paddingY, paddingBottom: THEME.section.paddingY }}>
        <span
  className="inline-block px-4 py-2 bg-[#FAECE7] rounded-full font-bold"
  style={{ fontSize: THEME.badge.size, color: THEME.badge.color, marginBottom: THEME.badge.marginBottom }}
>
  OTOMATISASI JUALAN TANPA KHAWATIR BIAYA ADMIN!
</span>
        <h2 className="font-bold text-[#1C1C1A]" style={{ fontSize: THEME.sectionTitle.size, marginBottom: THEME.sectionTitle.marginBottom }}>
          Fitur Lengkap dalam Satu Link
        </h2>
        <p className="text-[#8B8D85] max-w-xl mx-auto" style={{ marginBottom: THEME.paragraph.marginBottom }}>
          Dari halaman checkout, ongkir otomatis, sampai pixel iklan — semua siap pakai tanpa perlu integrasi manual.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { icon: Link2, label: "1 Link Semua Produk", live: true },
            { icon: Package, label: "Ongkir Otomatis", live: true },
            { icon: Target, label: "Pixel Meta & Google Ads", live: true },
            { icon: ClipboardList, label: "Order Management", live: false },
            { icon: Zap, label: "1-Click Checkout", live: false },
            { icon: PieChart, label: "Analytics", live: false },
            { icon: Link, label: "Payment Link", live: false },
            { icon: DollarSign, label: "Online Payments", live: false },
            { icon: Receipt, label: "Billing System", live: false },
            { icon: MessageCircle, label: "WA & Telegram Integration", live: false },
            { icon: Bell, label: "Notification", live: false },
            { icon: Wallet2, label: "Finance Tools", live: false },
            { icon: Users, label: "Customer Portal", live: false },
            { icon: Percent, label: "Discount Code", live: false },
            { icon: MailWarning, label: "Payment Reminder", live: false },
            { icon: Sheet, label: "Google Sheet Integration", live: false },
          ].map((f) => (
            <div
              key={f.label}
              className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all cursor-default ${
                f.live
                  ? "border border-[#E5E2D9] bg-white hover:shadow-md hover:border-[#D85A30]"
                  : "border border-dashed border-[#D3D1C7] bg-[#F1EFE8]/50"
              }`}
            >
              <f.icon size={18} className={f.live ? "text-[#D85A30]" : "text-[#B4B2A9]"} strokeWidth={1.75} />
              <span className={`text-sm font-medium ${f.live ? "text-[#1C1C1A]" : "text-[#8B8D85]"}`}>{f.label}</span>
              {!f.live && (
                <span className="text-[10px] font-bold text-[#B4B2A9] bg-white px-1.5 py-0.5 rounded-full border border-[#E5E2D9]">
                  SEGERA
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {[
            { icon: Link2, title: "1 Link, Semua Produk", desc: "Pasang di bio IG atau iklan. Pembeli langsung bisa pesan dan bayar." },
            { icon: Package, title: "Ongkir Otomatis", desc: "Harga ongkir muncul sendiri sesuai alamat pembeli. Gak perlu hitung manual." },
            { icon: Target, title: "Pixel Iklan Siap", desc: "Meta & Google Ads langsung terhubung. Algoritma iklan makin pintar otomatis." },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-5 border border-[#E5E2D9] transition-shadow hover:shadow-md">
              <f.icon className="w-6 h-6 mb-3 text-[#D85A30]" strokeWidth={1.75} />
              <h3 className="font-semibold text-[#1C1C1A] mb-1">{f.title}</h3>
              <p className="text-sm text-[#8B8D85]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HARGA */}
      <section id="harga" className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl font-bold text-[#1C1C1A] mb-2">Harga yang masuk akal</h2>
        <p className="text-[#8B8D85] mb-8">Bayar potongan 10%-30% per transaksi di E-Commerce, atau Rp99rb flat ke tokku.id?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-6 border border-[#E5E2D9] text-left">
            <p className="text-sm text-[#8B8D85] mb-1">Gratis</p>
            <p className="text-3xl font-bold text-[#1C1C1A] mb-4">Rp0</p>
            <ul className="text-sm text-[#5B6472] space-y-2">
              <li>✓ Sampai 15 order/bulan</li>
              <li>✓ Semua fitur aktif</li>
              <li>✓ Ongkir otomatis</li>
              <li>✓ Pixel iklan</li>
            </ul>
          </div>
          <div className="bg-[#1C1C1A] rounded-xl p-6 border border-[#1C1C1A] text-left relative overflow-hidden">
            <span className="absolute top-0 right-0 bg-[#F5B93F] text-[10px] font-bold text-[#1C1C1A] px-2 py-1 rounded-bl-lg">
              PALING LARIS
            </span>
            <p className="text-sm text-[#B4B2A9] mb-1">Akses penuh</p>
            <p className="text-3xl font-bold text-white mb-4">
              Rp99rb<span className="text-base font-normal text-[#B4B2A9]">/bulan</span>
            </p>
            <ul className="text-sm text-[#D3D1C7] space-y-2">
              <li>✓ Order tidak terbatas</li>
              <li>✓ COD & voucher</li>
              <li>✓ Reminder WA otomatis</li>
              <li>✓ Dashboard lengkap</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}