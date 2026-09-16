// app/portal/page.js
"use client";
import { useState } from "react";
import { Package, Search, ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";

export default function PortalLanding() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleCari(e) {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setNotFound(false);

    const raw = phone.replace(/\D/g, "");
    const res = await fetch(`/api/portal/orders?phone=${raw}`);
    const data = await res.json();
    setLoading(false);

    if (!data.orders || data.orders.length === 0) {
      setNotFound(true);
      return;
    }
    window.location.href = `/portal/${raw}`;
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <a href="/" className="font-bold text-2xl tracking-tight text-[#1C1C1A] mb-10 block">
        tok<span className="text-[#D85A30]">k</span>u
        <span className="text-[#8B8D85] font-normal">.id</span>
      </a>

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#FAECE7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={26} className="text-[#D85A30]" />
          </div>
          <h1 className="text-2xl font-black text-[#1C1C1A] mb-2">Lacak pesananmu</h1>
          <p className="text-sm text-[#8B8D85]">Masukkan nomor WhatsApp yang kamu pakai saat checkout.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleCari} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block mb-2">
              Nomor WhatsApp
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setNotFound(false); }}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-3.5 border-2 border-[#E5E2D9] rounded-2xl text-sm focus:outline-none focus:border-[#D85A30] transition-all"
              required
            />
          </div>

          {notFound && (
            <div className="bg-[#FBEAEA] border border-[#F0BEBE] rounded-xl px-4 py-3 text-sm text-[#A32D2D]">
              Belum ada pesanan yang ditemukan untuk nomor ini.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#D85A30] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#B84A25] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>Mencari...</>
            ) : <><Search size={16} />Cari Pesanan</>}
          </button>
        </form>

        {/* Features */}
        <div className="mt-8 space-y-3">
          {[
            { icon: Package,       text: "Lacak status pengiriman real-time" },
            { icon: MessageCircle, text: "Chat langsung dengan penjual" },
            { icon: ShieldCheck,   text: "Ajukan komplain & return dengan mudah" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 text-sm text-[#8B8D85]">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#E5E2D9] flex items-center justify-center flex-shrink-0">
                <f.icon size={14} className="text-[#D85A30]" />
              </div>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
