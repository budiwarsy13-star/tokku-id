"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react";

function sapaanWaktu() {
  const jam = new Date().getHours();
  if (jam < 11) return "Selamat pagi!";
  if (jam < 15) return "Selamat siang!";
  if (jam < 19) return "Selamat sore!";
  return "Selamat malam!";
}

function tanggalHariIni() {
  return new Date().toISOString().slice(0, 10); // "2026-09-24"
}

function masihSegar(createdAt, maksHari) {
  const umurJam = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  return umurJam <= maksHari * 24;
}

export default function InsightPopup({ store }) {
  const [slides, setSlides] = useState([]);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [janganTampilkanLagi, setJanganTampilkanLagi] = useState(false);

  useEffect(() => {
    if (!store?.id) return;

    const dismissKey = `tokku_insight_dismiss_${store.id}_${tanggalHariIni()}`;
    if (localStorage.getItem(dismissKey)) return; // udah di-dismiss hari ini, jangan tampil lagi

    async function muatInsight() {
      const [{ data: harian }, { data: mingguan }] = await Promise.all([
        supabase.from("ai_insights").select("*").eq("store_id", store.id).eq("period_type", "harian")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("ai_insights").select("*").eq("store_id", store.id).eq("period_type", "mingguan")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const daftarSlide = [];

      if (harian && masihSegar(harian.created_at, 1)) {
        daftarSlide.push({ tipe: "headline", periodType: "harian", teks: harian.ringkasan_singkat });
        (harian.insights || []).forEach((ins) => daftarSlide.push({ tipe: "insight", ...ins }));
      }
      if (mingguan && masihSegar(mingguan.created_at, 2)) {
        daftarSlide.push({ tipe: "headline", periodType: "mingguan", teks: mingguan.ringkasan_singkat });
        (mingguan.insights || []).forEach((ins) => daftarSlide.push({ tipe: "insight", ...ins }));
      }

      if (daftarSlide.length > 0) {
        setSlides(daftarSlide);
        setVisible(true);
      }
    }

    muatInsight();
  }, [store?.id]);

  function tutup() {
    if (janganTampilkanLagi) {
      localStorage.setItem(`tokku_insight_dismiss_${store.id}_${tanggalHariIni()}`, "1");
    }
    setVisible(false);
  }

  if (!visible || slides.length === 0) return null;

  const slide = slides[current];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#D85A30] to-[#B84A25] text-white p-5 relative">
          <button onClick={tutup} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={20} />
          </button>
          <p className="text-xs opacity-90 mb-1">{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p className="font-semibold text-lg">{sapaanWaktu()} Ini ringkasan bisnismu 👋</p>
        </div>

        {/* Isi slide */}
        <div className="p-5 min-h-[140px]">
          {slide.tipe === "headline" ? (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FAECE7] text-[#D85A30] flex items-center justify-center shrink-0">
                <TrendingUp size={18} />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#8B8D85] uppercase tracking-wide">
                  {slide.periodType === "harian" ? "Rekap Harian" : "Rekap Mingguan"}
                </span>
                <p className="text-[#1C1C1A] font-medium mt-1">{slide.teks}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FDF8F5] text-[#D85A30] flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="font-semibold text-[#1C1C1A] text-sm mb-1">{slide.judul}</p>
                <p className="text-sm text-[#5B6472] mb-2">{slide.penjelasan}</p>
                {slide.aksi_disarankan && (
                  <p className="text-sm text-[#1C1C1A] bg-[#FDF8F5] border border-[#F0D9CC] rounded-lg px-3 py-2">
                    💡 {slide.aksi_disarankan}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigasi carousel */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-4 pb-3">
            <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
              className="text-[#8B8D85] disabled:opacity-30">
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-[#D85A30]" : "w-1.5 bg-[#E5E2D9]"}`} />
              ))}
            </div>
            <button onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))} disabled={current === slides.length - 1}
              className="text-[#8B8D85] disabled:opacity-30">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
        <p className="text-center text-xs text-[#8B8D85] pb-3">{current + 1} / {slides.length} · wawasan AI</p>

        {/* Footer */}
        <div className="border-t border-[#F1EFE8] p-4 space-y-3">
          <div className="flex gap-3">
            <a href="/dashboard/insight" className="flex-1 text-center text-sm bg-[#1C1C1A] text-white px-4 py-2.5 rounded-lg hover:bg-black transition-colors">
              Lihat analisis lengkap
            </a>
            <button onClick={tutup} className="text-sm text-[#8B8D85] hover:text-[#1C1C1A] px-4 transition-colors">
              Nanti
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#8B8D85] cursor-pointer">
            <input type="checkbox" checked={janganTampilkanLagi} onChange={(e) => setJanganTampilkanLagi(e.target.checked)} />
            Jangan tampilkan lagi hari ini
          </label>
        </div>
      </div>
    </div>
  );
}
