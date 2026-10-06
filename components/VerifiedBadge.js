import { BadgeCheck } from "lucide-react";

// Badge "Verified Seller" — muncul kalau stores.is_verified = true
// (di-set otomatis oleh trigger update_store_trust setelah >= 5 order paid).
export default function VerifiedBadge({ size = "md", className = "" }) {
  const kecil = size === "sm";
  return (
    <span
      title="Penjual terverifikasi: sudah menyelesaikan 5+ transaksi sukses di tokku.id"
      className={`inline-flex items-center gap-1 rounded-full bg-[#EAF3DE] text-[#3B6D11] font-semibold whitespace-nowrap ${
        kecil ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      } ${className}`}
    >
      <BadgeCheck size={kecil ? 11 : 14} strokeWidth={2.25} />
      Verified Seller
    </span>
  );
}
