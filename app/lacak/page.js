"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Package, CheckCircle2, Circle, Truck, PackageCheck, Clock } from "lucide-react";

const TAHAPAN = [
  { key: "pending", label: "Pesanan dibuat", icon: Clock },
  { key: "paid", label: "Pembayaran diterima", icon: CheckCircle2 },
  { key: "shipped", label: "Dikirim", icon: Truck },
  { key: "selesai", label: "Selesai diterima", icon: PackageCheck },
];

const URUTAN_STATUS = ["pending", "paid", "shipped", "selesai"];

export default function LacakPesananPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <p className="text-[#8B8D85] text-sm">Memuat...</p>
      </main>
    }>
      <LacakPesananContent />
    </Suspense>
  );
}

function LacakPesananContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("order") || "");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");

  async function handleKonfirmasiDiterima() {
    if (!confirm("Pastikan barang udah kamu terima dalam kondisi baik. Konfirmasi sekarang?")) return;
    setConfirming(true);
    setConfirmMsg("");
    const res = await fetch("/api/lacak/konfirmasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: result.orderId, buyerPhone }),
    });
    const data = await res.json();
    setConfirming(false);
    if (data.success) {
      setResult({ ...result, status: "selesai", completedAt: data.completedAt });
      setConfirmMsg("Makasih! Pesanan udah ditandai selesai.");
    } else {
      setConfirmMsg(data.message || "Gagal konfirmasi, coba lagi.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/lacak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, buyerPhone }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.found) {
      setResult(data.order);
    } else {
      setError(data.message || "Pesanan gak ketemu.");
    }
  }

  const stepAktif = result ? URUTAN_STATUS.indexOf(result.status === "gagal" ? "pending" : result.status) : -1;

  return (
    <main className="min-h-screen bg-[#FAFAF7] px-6 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <a href="/" className="font-bold text-2xl tracking-tight text-[#1C1C1A]">
            tok<span className="text-[#D85A30]">k</span>u<span className="text-[#8B8D85] font-normal">.id</span>
          </a>
          <h1 className="text-xl font-bold text-[#1C1C1A] mt-4 mb-1">Lacak pesanan kamu</h1>
          <p className="text-sm text-[#8B8D85]">Masukin Order ID dan nomor WA yang kamu pakai pas checkout.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E2D9] p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Order ID</label>
            <input type="text" required value={orderId} onChange={(e) => setOrderId(e.target.value)}
              placeholder="Contoh: TOKKU-1786359228358"
              className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm font-mono focus:outline-none focus:border-[#D85A30]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Nomor WhatsApp</label>
            <input type="tel" required value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]" />
          </div>
          {error && <p className="text-sm text-[#A32D2D] bg-[#FBEAEA] px-4 py-2.5 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#D85A30] text-white rounded-xl font-medium hover:bg-[#B84A25] transition-colors disabled:opacity-50">
            <Search size={16} /> {loading ? "Mencari..." : "Cari pesanan"}
          </button>
        </form>

        {result && (
          <div className="bg-white rounded-2xl border border-[#E5E2D9] p-6 mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[#8B8D85] font-mono">{result.orderId}</p>
              {result.status === "gagal" && (
                <span className="text-xs bg-[#FBEAEA] text-[#A32D2D] px-2 py-0.5 rounded-full font-medium">Pembayaran gagal</span>
              )}
            </div>
            <h2 className="font-bold text-[#1C1C1A] mb-0.5">{result.productName}</h2>
            <p className="text-sm text-[#8B8D85] mb-5">
              {result.quantity}x · Dari toko {result.storeName}
              {result.storeSlug && (
                <> · <a href={`/${result.storeSlug}`} className="underline">Kunjungi toko</a></>
              )}
            </p>

            {/* TIMELINE STATUS */}
            {result.status !== "gagal" && (
              <div className="mb-6">
                {TAHAPAN.map((tahap, i) => {
                  const sudahLewat = i <= stepAktif;
                  const waktuLabel =
                    tahap.key === "pending" ? result.createdAt :
                    tahap.key === "paid" ? result.paidAt :
                    tahap.key === "shipped" ? result.shippedAt :
                    result.completedAt;
                  return (
                    <div key={tahap.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {sudahLewat ? (
                          <CheckCircle2 size={20} className="text-[#D85A30]" fill="#FAECE7" />
                        ) : (
                          <Circle size={20} className="text-[#D1CFC5]" />
                        )}
                        {i < TAHAPAN.length - 1 && (
                          <div className={`w-0.5 flex-1 my-1 ${i < stepAktif ? "bg-[#D85A30]" : "bg-[#E5E2D9]"}`} style={{ minHeight: 24 }} />
                        )}
                      </div>
                      <div className="pb-5">
                        <p className={`text-sm font-medium ${sudahLewat ? "text-[#1C1C1A]" : "text-[#8B8D85]"}`}>{tahap.label}</p>
                        {waktuLabel && sudahLewat && (
                          <p className="text-xs text-[#8B8D85]">
                            {new Date(waktuLabel).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* KONFIRMASI DITERIMA (cuma muncul kalau status "shipped") */}
            {result.status === "shipped" && (
              <div className="mb-6">
                <button
                  onClick={handleKonfirmasiDiterima}
                  disabled={confirming}
                  className="w-full py-3 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: result.accentColor }}
                >
                  {confirming ? "Memproses..." : "Pesanan sudah saya terima"}
                </button>
                <p className="text-xs text-[#8B8D85] text-center mt-2">
                  Klik ini kalau barang udah sampai dan kondisinya sesuai pesanan.
                </p>
              </div>
            )}
            {confirmMsg && (
              <p className={`text-sm px-4 py-2.5 rounded-lg mb-4 ${result.status === "selesai" ? "bg-[#EAF1E8] text-[#3B6D11]" : "bg-[#FBEAEA] text-[#A32D2D]"}`}>
                {confirmMsg}
              </p>
            )}

            {/* DETAIL PENGIRIMAN */}
            {result.destinationLabel && (
              <div className="border-t border-[#E5E2D9] pt-4 mb-4">
                <p className="text-xs font-medium text-[#5B6472] uppercase tracking-wider mb-1.5">Alamat pengiriman</p>
                <p className="text-sm text-[#1C1C1A]">{result.fullAddress}</p>
                <p className="text-sm text-[#8B8D85]">{result.destinationLabel}</p>
                {result.courier && <p className="text-sm text-[#8B8D85] mt-1">Kurir: {result.courier}</p>}
              </div>
            )}

            {/* TOTAL */}
            <div className="border-t border-[#E5E2D9] pt-4 space-y-1">
              {result.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-[#3B6D11]">
                  <span>Diskon ({result.discountCode})</span>
                  <span>-Rp{Number(result.discountAmount).toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold text-[#1C1C1A]">Total</span>
                <span className="text-lg font-black text-[#1C1C1A]">Rp{Number(result.totalPrice).toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}