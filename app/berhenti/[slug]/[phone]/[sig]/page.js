"use client";

import { useState, use } from "react";

export default function BerhentiPage({ params }) {
  const { slug, phone, sig } = use(params);
  const [status, setStatus] = useState("tanya"); // tanya | proses | selesai | gagal
  const [pesan, setPesan] = useState("");

  async function konfirmasi() {
    setStatus("proses");
    try {
      const res = await fetch("/api/wa/optout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, phone, sig }),
      });
      const data = await res.json();
      if (data.success) setStatus("selesai");
      else { setPesan(data.message || "Gagal."); setStatus("gagal"); }
    } catch {
      setPesan("Koneksi bermasalah, coba lagi."); setStatus("gagal");
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-[#E5E2D9] p-6 max-w-sm w-full text-center">
        {status === "selesai" ? (
          <>
            <p className="text-3xl mb-2">✅</p>
            <h1 className="font-bold text-[#1C1C1A] mb-1">Sudah berhenti</h1>
            <p className="text-sm text-[#5B6472]">Kamu tidak akan menerima pesan promo dari toko ini lagi. Info pesanan yang sedang berjalan tetap dikirim.</p>
          </>
        ) : (
          <>
            <h1 className="font-bold text-[#1C1C1A] mb-2">Berhenti terima promo?</h1>
            <p className="text-sm text-[#5B6472] mb-5">Kamu tidak akan dikirimi pesan promo WhatsApp lagi dari toko ini.</p>
            {status === "gagal" && <p className="text-sm text-[#A32D2D] mb-3">{pesan}</p>}
            <button onClick={konfirmasi} disabled={status === "proses"}
              className="w-full py-3 rounded-xl bg-[#D85A30] text-white font-medium hover:bg-[#B84A25] disabled:opacity-50">
              {status === "proses" ? "Memproses..." : "Ya, berhenti"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
