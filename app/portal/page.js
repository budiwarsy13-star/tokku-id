// app/portal/page.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BuyerVerifikasi from "@/components/BuyerVerifikasi";
import { ambilSesi } from "@/lib/buyer-session";
import { Package, MessageCircle, ShieldCheck } from "lucide-react";

export default function PortalLanding() {
  const router = useRouter();
  const [cek, setCek] = useState(true);

  // Sudah punya sesi terverifikasi? Langsung ke daftar pesanan.
  useEffect(() => {
    if (ambilSesi()) router.replace("/portal/pesanan-saya");
    else setCek(false);
  }, [router]);

  if (cek) return <main className="min-h-screen bg-[#FAFAF7]" />;

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
          <p className="text-sm text-[#8B8D85]">Verifikasi dengan email yang kamu pakai saat checkout.</p>
        </div>

        <BuyerVerifikasi onBerhasil={() => router.replace("/portal/pesanan-saya")} />

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
