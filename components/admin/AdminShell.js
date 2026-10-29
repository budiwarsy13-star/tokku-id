"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { LayoutDashboard, Store, Crown, MessageSquareWarning, Wallet, ScrollText, LogOut, ShieldCheck } from "lucide-react";
import { useAdminMe, keluar } from "@/lib/admin-client";
import { punya } from "@/lib/admin-permissions";
import { Memuat } from "@/components/admin/ui";

const MENU = [
  { href: "/admin", label: "Dashboard", ikon: LayoutDashboard, izin: "ringkasan.baca" },
  { href: "/admin/seller", label: "Seller", ikon: Store, izin: "seller.baca" },
  { href: "/admin/langganan", label: "Langganan", ikon: Crown, izin: "langganan.baca" },
  { href: "/admin/komplain", label: "Komplain & Retur", ikon: MessageSquareWarning, izin: "komplain.baca" },
  { href: "/admin/keuangan", label: "Keuangan", ikon: Wallet, izin: "keuangan.baca" },
  { href: "/admin/log", label: "Log audit", ikon: ScrollText, izin: "audit.baca" },
];
const IDLE_MS = 15 * 60 * 1000; // 15 menit tanpa aktivitas -> keluar otomatis

export default function AdminShell({ aktif, judul, children, me: meDariHalaman }) {
  const meSendiri = useAdminMe();
  const me = meDariHalaman || meSendiri;
  const terakhir = useRef(0); // diisi saat mount (Date.now() tidak boleh dipanggil saat render)

  useEffect(() => {
    const tandai = () => { terakhir.current = Date.now(); };
    tandai();
    const ev = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    ev.forEach((e) => window.addEventListener(e, tandai, { passive: true }));
    const timer = setInterval(() => { if (Date.now() - terakhir.current > IDLE_MS) keluar("idle"); }, 30_000);
    return () => { ev.forEach((e) => window.removeEventListener(e, tandai)); clearInterval(timer); };
  }, []);

  if (!me) return <Memuat penuh />;
  return (
    <div className="min-h-screen bg-[#FAFAF7] md:flex">
      <aside className="md:w-60 md:min-h-screen bg-[#1C1C1A] text-white flex md:flex-col">
        <div className="px-5 py-4 flex items-center gap-2 border-b border-white/10">
          <ShieldCheck size={18} className="text-[#D85A30]" />
          <span className="font-bold">tokku.id <span className="text-white/50 font-normal">admin</span></span>
        </div>
        <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto md:flex-1">
          {MENU.filter((m) => punya(me.role, m.izin)).map((m) => (
            <Link key={m.href} href={m.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${aktif === m.href ? "bg-[#D85A30] text-white" : "text-white/70 hover:bg-white/10"}`}>
              <m.ikon size={16} /> {m.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block p-4 border-t border-white/10 text-xs">
          <p className="text-white/50 truncate">{me.email}</p>
          <p className="text-white/70 mb-2 capitalize">Peran: {me.role}</p>
          <button onClick={() => keluar()} className="flex items-center gap-1.5 text-white/70 hover:text-white"><LogOut size={13} /> Keluar</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black text-[#1C1C1A]">{judul}</h1>
          <button onClick={() => keluar()} className="md:hidden text-xs text-[#5B6472] flex items-center gap-1"><LogOut size={13} /> Keluar</button>
        </div>
        {children}
      </main>
    </div>
  );
}
