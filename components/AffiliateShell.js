"use client";
import { LogOut } from "lucide-react";

// Kerangka halaman affiliate: top bar + kontainer. Terpisah dari DashboardLayout
// (yang khusus seller) karena affiliate punya sesi & menu sendiri.
export default function AffiliateShell({ children, onKeluar, judul, lebar = "max-w-3xl" }) {
  return (
    <main className="min-h-screen bg-[#FAFAF7] font-[family-name:var(--font-baloo)] text-[#1C1C1A]">
      <header className="bg-white border-b border-[#E5E2D9] px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <a href="/affiliate" className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight">
            tok<span className="text-[#D85A30]">k</span>u<span className="text-[#8B8D85] font-normal">.id</span>
          </span>
          <span className="text-xs font-semibold text-[#D85A30] bg-[#FAECE7] px-2 py-0.5 rounded-md">Affiliate</span>
        </a>
        <div className="flex items-center gap-3">
          {judul && <span className="hidden sm:block text-sm text-[#5B6472]">{judul}</span>}
          {onKeluar && (
            <button onClick={onKeluar} className="flex items-center gap-1.5 text-sm text-[#5B6472] hover:bg-[#F1EFE8] px-3 py-2 rounded-xl">
              <LogOut size={16} strokeWidth={1.75} /> Keluar
            </button>
          )}
        </div>
      </header>
      <div className={`${lebar} mx-auto px-4 py-6 lg:py-10`}>{children}</div>
    </main>
  );
}
