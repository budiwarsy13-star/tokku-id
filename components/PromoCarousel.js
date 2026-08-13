"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Carousel banner promosi yang bisa diklik ke produk. Auto-geser tiap 4 detik,
// berhenti sementara kalau pointer lagi di atasnya, dan bisa digeser manual
// lewat panah atau titik indikator di bawah.
export default function PromoCarousel({ banners, onBannerClick, accent }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!hoverRef.current) setIndex((i) => (i + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden mb-6 group"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((b) => (
          <button
            key={b.id}
            onClick={() => onBannerClick(b)}
            className={`w-full flex-shrink-0 aspect-[16/6] md:aspect-[16/5] relative ${b.link_product_id ? "cursor-pointer" : "cursor-default"}`}
          >
            <img src={b.image_url} alt="Banner promosi" className="w-full h-full object-cover" />
            {b.link_product_id && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            )}
          </button>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <ChevronLeft size={16} className="text-[#1C1C1A]" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <ChevronRight size={16} className="text-[#1C1C1A]" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setIndex(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? "18px" : "6px",
                  background: i === index ? accent : "rgba(255,255,255,0.7)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
