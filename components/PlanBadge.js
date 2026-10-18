import Link from "next/link";
import { isPro, sisaHariPro } from "@/lib/plans";
import { Crown } from "lucide-react";

// Lencana paket di header dashboard. Pro = lencana; Gratis = tautan ke halaman upgrade.
export default function PlanBadge({ store }) {
  if (isPro(store)) {
    const sisa = sisaHariPro(store);
    return (
      <Link href="/dashboard/langganan" title={`Paket Pro aktif, sisa ${sisa} hari`}
        className="inline-flex items-center gap-1 rounded-full bg-[#1C1C1A] text-white text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
        <Crown size={10} /> PRO{sisa <= 7 ? ` · ${sisa}h` : ""}
      </Link>
    );
  }
  return (
    <Link href="/dashboard/langganan"
      className="inline-flex items-center rounded-full border border-[#D85A30]/40 text-[#D85A30] text-[10px] font-bold px-2 py-0.5 whitespace-nowrap hover:bg-[#FAECE7]">
      Gratis · Upgrade
    </Link>
  );
}
