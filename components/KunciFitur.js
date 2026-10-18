import Link from "next/link";
import { Lock } from "lucide-react";

// Kartu "fitur ini khusus Pro" — dipakai di semua tempat yang dikunci, supaya pesan & CTA seragam.
export default function KunciFitur({ judul, deskripsi, className = "" }) {
  return (
    <div className={`rounded-xl border border-dashed border-[#D85A30]/40 bg-[#FAECE7]/60 p-6 text-center ${className}`}>
      <div className="w-10 h-10 rounded-full bg-white border border-[#D85A30]/30 flex items-center justify-center mx-auto mb-3">
        <Lock size={18} className="text-[#D85A30]" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#D85A30] mb-1">Fitur Pro</p>
      <h3 className="font-bold text-[#1C1C1A] mb-1">{judul}</h3>
      {deskripsi && <p className="text-sm text-[#5B6472] max-w-md mx-auto mb-4">{deskripsi}</p>}
      <Link href="/dashboard/langganan"
        className="inline-block px-5 py-2.5 rounded-lg bg-[#D85A30] text-white text-sm font-medium hover:bg-[#B84A25] transition-colors">
        Upgrade ke Pro
      </Link>
    </div>
  );
}
