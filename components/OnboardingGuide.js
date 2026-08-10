"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Package, MapPin, Share2, CheckCircle2, Circle, Sparkles } from "lucide-react";

// Definisi tiap langkah guide. `check` nentuin otomatis udah selesai atau belum
// berdasarkan data yang ada, jadi user gak perlu centang manual.
function buildSteps({ store, hasProduct }) {
  return [
    {
      key: "buat_toko",
      icon: Sparkles,
      title: "Toko kamu udah aktif",
      desc: "Selamat! Toko kamu udah jadi dan siap dipakai.",
      done: true,
      href: null,
    },
    {
      key: "tambah_produk",
      icon: Package,
      title: "Tambah produk pertama",
      desc: "Upload foto, harga, dan stok produk yang mau kamu jual.",
      done: hasProduct,
      href: "/dashboard/tambah-produk",
    },
    {
      key: "atur_alamat",
      icon: MapPin,
      title: "Atur alamat asal toko",
      desc: "Wajib diisi biar ongkir bisa dihitung otomatis ke pembeli.",
      done: !!store?.origin_id,
      href: "/dashboard/toko",
    },
    {
      key: "share_link",
      icon: Share2,
      title: "Bagikan link toko kamu",
      desc: `Sebar tokku.id/${store?.slug || ""} ke bio Instagram atau chat WhatsApp.`,
      done: false,
      href: null,
      isShare: true,
    },
  ];
}

export default function OnboardingGuide({ store }) {
  const [hasProduct, setHasProduct] = useState(false);
  const [dismissed, setDismissed] = useState(store?.onboarding_steps?.dismissed || false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function check() {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id);
      setHasProduct((count || 0) > 0);
    }
    if (store?.id) check();
  }, [store?.id]);

  if (dismissed) return null;

  const steps = buildSteps({ store, hasProduct });
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  async function handleDismiss() {
    setDismissed(true);
    await supabase
      .from("stores")
      .update({ onboarding_steps: { ...(store.onboarding_steps || {}), dismissed: true } })
      .eq("id", store.id);
  }

  function handleShare() {
    navigator.clipboard.writeText(`https://tokku.id/${store.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-[#8B8D85] hover:text-[#1C1C1A]"
        aria-label="Tutup panduan"
      >
        <X size={16} />
      </button>

      <div className="mb-4 pr-6">
        <h2 className="font-bold text-[#1C1C1A] mb-1">
          {allDone ? "Toko kamu siap jualan! 🎉" : "Panduan mulai jualan"}
        </h2>
        <p className="text-xs text-[#8B8D85]">
          {allDone
            ? "Semua langkah dasar udah kamu selesaikan."
            : `${doneCount} dari ${steps.length} langkah selesai — yuk lengkapi biar toko kamu makin siap.`}
        </p>
        <div className="w-full h-1.5 bg-[#F1EFE8] rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-[#D85A30] transition-all duration-300"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        {steps.map((s) => (
          <div key={s.key} className="flex items-center gap-3 py-2">
            {s.done ? (
              <CheckCircle2 size={18} className="text-[#3B6D11] flex-shrink-0" />
            ) : (
              <Circle size={18} className="text-[#D3D1C7] flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.done ? "text-[#8B8D85] line-through" : "text-[#1C1C1A]"}`}>
                {s.title}
              </p>
              <p className="text-xs text-[#8B8D85]">{s.desc}</p>
            </div>
            {!s.done && s.href && (
              <a
                href={s.href}
                className="text-xs font-medium text-[#D85A30] bg-[#FAECE7] px-3 py-1.5 rounded-lg hover:bg-[#F5D9CC] transition-colors flex-shrink-0"
              >
                Isi
              </a>
            )}
            {!s.done && s.isShare && (
              <button
                onClick={handleShare}
                className="text-xs font-medium text-[#D85A30] bg-[#FAECE7] px-3 py-1.5 rounded-lg hover:bg-[#F5D9CC] transition-colors flex-shrink-0"
              >
                {copied ? "Tersalin!" : "Salin link"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
