"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, X, Search, Truck } from "lucide-react";

export default function TokoPublik() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    async function fetchStore() {
      const { data: storeData } = await supabase
        .from("stores").select("*").eq("slug", slug).maybeSingle();
      if (!storeData) { setNotFound(true); setLoading(false); return; }
      setStore(storeData);
      const { data: productsData } = await supabase
        .from("products").select("*").eq("store_id", storeData.id)
        .order("created_at", { ascending: false });
      setProducts(productsData || []);
      setLoading(false);
    }
    fetchStore();
  }, [slug]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  if (loading) return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <p className="text-[#8B8D85]">Memuat toko...</p>
    </main>
  );

  if (notFound) return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-xl font-bold text-[#1C1C1A] mb-2">Toko tidak ditemukan</h1>
        <p className="text-sm text-[#8B8D85]">Link ini gak valid atau tokonya udah gak aktif.</p>
      </div>
    </main>
  );

  const accent = store.accent_color || "#D85A30";
  const accentDark = accent + "CC";

  return (
    <main className="min-h-screen bg-[#FAFAF7]">

      {/* BANNER */}
      {store.banner_url ? (
        <div className="w-full h-48 md:h-64 overflow-hidden relative">
          <img src={store.banner_url} alt="Banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
        </div>
      ) : (
        <div className="w-full h-32 md:h-48" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}44)` }} />
      )}

      {/* HEADER TOKO */}
      <div className="max-w-2xl mx-auto px-6">
        <div className={`flex items-end gap-4 ${store.banner_url ? "-mt-12" : "-mt-8"} mb-4 relative z-10`}>
          {/* LOGO */}
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white overflow-hidden flex-shrink-0 shadow-md flex items-center justify-center"
            style={{ background: store.logo_url ? "white" : `${accent}22` }}
          >
            {store.logo_url ? (
              <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black" style={{ color: accent }}>
                {store.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-xl md:text-2xl font-black text-[#1C1C1A] leading-tight">{store.name}</h1>
            <p className="text-xs text-[#8B8D85]">tokku.id/{store.slug}</p>
          </div>
        </div>

        {store.description && (
          <p className="text-sm text-[#5B6472] mb-6 leading-relaxed">{store.description}</p>
        )}

        {/* DIVIDER */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[#E5E2D9]" />
          <span className="text-xs text-[#8B8D85] font-medium uppercase tracking-wider">Produk</span>
          <div className="flex-1 h-px bg-[#E5E2D9]" />
        </div>

        {/* PRODUK GRID */}
        {products.length === 0 ? (
          <p className="text-center text-sm text-[#8B8D85] py-12">Belum ada produk di toko ini.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {products.map((p) => (
              <button key={p.id} onClick={() => setSelectedProduct(p)}
                className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="aspect-square overflow-hidden" style={{ background: `${accent}11` }}>
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl opacity-20">👕</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-[#1C1C1A] line-clamp-2 mb-1">{p.name}</p>
                  <p className="text-sm font-black" style={{ color: accent }}>
                    Rp{Number(p.price).toLocaleString("id-ID")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <CheckoutModal
          product={selectedProduct}
          store={store}
          accent={accent}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* FOOTER */}
      <footer className="text-center py-8 text-xs text-[#8B8D85] border-t border-[#E5E2D9]">
        Dibuat dengan{" "}
        <a href="/" className="font-medium hover:underline" style={{ color: accent }}>tokku.id</a>
        {" "}· Jualan langsung tanpa potongan marketplace
      </footer>
    </main>
  );
}

function CheckoutModal({ product, store, accent, onClose }) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants?.length > 0 ? product.variants[0] : null
  );
  const [alamatKeyword, setAlamatKeyword] = useState("");
  const [alamatResults, setAlamatResults] = useState([]);
  const [searchingAlamat, setSearchingAlamat] = useState(false);
  const [destinasi, setDestinasi] = useState(null);
  const [alamatLengkap, setAlamatLengkap] = useState("");
  const [ongkirOptions, setOngkirOptions] = useState([]);
  const [loadingOngkir, setLoadingOngkir] = useState(false);
  const [selectedOngkir, setSelectedOngkir] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const unitPrice = selectedVariant ? selectedVariant.price : product.price;
  const subtotal = unitPrice * quantity;
  const totalPrice = subtotal + (selectedOngkir?.cost || 0);

  async function handleCariAlamat(e) {
    e.preventDefault();
    if (!alamatKeyword) return;
    setSearchingAlamat(true);
    const res = await fetch(`/api/rajaongkir/search?keyword=${encodeURIComponent(alamatKeyword)}`);
    const data = await res.json();
    setAlamatResults(data.data || []);
    setSearchingAlamat(false);
  }

  async function pilihAlamat(lokasi) {
    setDestinasi(lokasi);
    setAlamatResults([]);
    setAlamatKeyword(lokasi.label);
    setSelectedOngkir(null);
    if (!store.origin_id) return;
    setLoadingOngkir(true);
    const beratTotal = (product.weight || 1000) * quantity;
    const res = await fetch("/api/rajaongkir/cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: store.origin_id, destination: String(lokasi.id), weight: beratTotal }),
    });
    const data = await res.json();
    setOngkirOptions(data.data || []);
    setLoadingOngkir(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!destinasi) return alert("Pilih dulu alamat tujuan pengiriman.");
    if (!alamatLengkap.trim()) return alert("Isi dulu alamat lengkap (jalan, nomor rumah, dll).");
    if (!selectedOngkir) return alert("Pilih dulu kurir pengiriman.");
    setSaving(true);

    const orderId = `TOKKU-${Date.now()}`;
const productName = selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name;

const { error: orderError } = await supabase
  .from("orders").insert({
    store_id: store.id,
    product_id: product.id,
    product_name: productName,
    buyer_name: buyerName,
    buyer_phone: buyerPhone,
    quantity,
    total_price: totalPrice,
    status: "pending",
    destination_id: String(destinasi.id),
    destination_label: destinasi.label,
    full_address: alamatLengkap,
    shipping_cost: selectedOngkir.cost,
    courier: `${selectedOngkir.name} - ${selectedOngkir.service}`,
    midtrans_order_id: orderId,
  });

if (orderError) { setSaving(false); return alert("Gagal membuat pesanan: " + orderError.message); }

    const payRes = await fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        amount: totalPrice,
        customerName: buyerName,
        customerEmail: buyerEmail || `${buyerPhone}@tokku.id`,
        customerPhone: buyerPhone,
        items: [
          { id: product.id, name: productName, price: unitPrice, quantity },
          ...(selectedOngkir.cost > 0 ? [{ id: "ongkir", name: `Ongkir ${selectedOngkir.name}`, price: selectedOngkir.cost, quantity: 1 }] : []),
        ],
      }),
    });

    const payData = await payRes.json();
    setSaving(false);
    if (payData.error) return alert("Gagal membuat pembayaran: " + payData.error);

    window.snap.pay(payData.token, {
      onSuccess: async () => {
        await supabase.from("orders").update({ status: "paid" }).eq("midtrans_order_id", orderId);
        setSuccess(true);
      },
      onPending: () => setSuccess(true),
      onError: () => alert("Pembayaran gagal. Silakan coba lagi."),
      onClose: () => {},
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-6">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#E5E2D9] sticky top-0 bg-white z-10">
          <h2 className="font-bold text-[#1C1C1A]">{success ? "Pesanan berhasil" : "Pesan produk"}</h2>
          <button onClick={onClose} className="text-[#8B8D85] hover:text-[#1C1C1A]"><X size={20} /></button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${accent}22` }}>
              <ShoppingCart size={24} style={{ color: accent }} />
            </div>
            <p className="text-sm text-[#5B6472] mb-1">Terima kasih, {buyerName}!</p>
            <p className="text-sm text-[#8B8D85] mb-6">Pembayaran berhasil. Pesananmu udah masuk ke toko.</p>
            <button onClick={onClose}
              className="w-full py-3 text-white rounded-lg font-medium transition-colors"
              style={{ background: accent }}>
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="flex gap-3 p-3 rounded-xl" style={{ background: `${accent}0D` }}>
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                style={{ background: `${accent}22` }}>
                {product.images?.[0] && (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1C1C1A]">{product.name}</p>
                <p className="text-sm font-black mt-0.5" style={{ color: accent }}>
                  Rp{Number(unitPrice).toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {product.variants?.length > 0 && (
              <div>
                <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Varian</label>
                <select value={selectedVariant?.name}
                  onChange={(e) => setSelectedVariant(product.variants.find((v) => v.name === e.target.value))}
                  className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: "var(--focus-color)" }}
                  onFocus={(e) => e.target.style.borderColor = accent}
                  onBlur={(e) => e.target.style.borderColor = "#E5E2D9"}>
                  {product.variants.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} — Rp{Number(v.price).toLocaleString("id-ID")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Jumlah</label>
              <input type="number" min={1} required value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value || 1))}
                className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none"
                onFocus={(e) => e.target.style.borderColor = accent}
                onBlur={(e) => e.target.style.borderColor = "#E5E2D9"} />
            </div>

            <div>
              <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Nama lengkap</label>
              <input type="text" required value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nama penerima"
                className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none"
                onFocus={(e) => e.target.style.borderColor = accent}
                onBlur={(e) => e.target.style.borderColor = "#E5E2D9"} />
            </div>

            <div>
              <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">No. WhatsApp</label>
              <input type="tel" required value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none"
                onFocus={(e) => e.target.style.borderColor = accent}
                onBlur={(e) => e.target.style.borderColor = "#E5E2D9"} />
            </div>

            <div>
              <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">
                Email <span className="text-[#8B8D85] normal-case font-normal">(opsional)</span>
              </label>
              <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="email@kamu.com"
                className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none"
                onFocus={(e) => e.target.style.borderColor = accent}
                onBlur={(e) => e.target.style.borderColor = "#E5E2D9"} />
            </div>

            <div>
              <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Alamat pengiriman</label>
              {!store.origin_id ? (
                <p className="text-xs text-[#A32D2D] bg-[#FBEAEA] px-3 py-2 rounded-lg">
                  Toko ini belum atur alamat asal, ongkir belum bisa dihitung.
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input type="text" value={alamatKeyword}
                      onChange={(e) => { setAlamatKeyword(e.target.value); setDestinasi(null); }}
                      placeholder="Cari kecamatan/kota kamu"
                      className="flex-1 px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none"
                      onFocus={(e) => e.target.style.borderColor = accent}
                      onBlur={(e) => e.target.style.borderColor = "#E5E2D9"} />
                    <button type="button" onClick={handleCariAlamat} disabled={searchingAlamat}
                      className="px-3 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                      style={{ background: accent }}>
                      <Search size={16} />
                    </button>
                  </div>
                  {alamatResults.length > 0 && (
                    <div className="border border-[#E5E2D9] rounded-lg divide-y divide-[#F1EFE8] max-h-40 overflow-y-auto mt-2">
                      {alamatResults.map((r) => (
                        <button key={r.id} type="button" onClick={() => pilihAlamat(r)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[#FAFAF7]">{r.label}</button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {destinasi && (
              <div>
                <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">
                  Alamat lengkap
                </label>
                <textarea
                  required
                  value={alamatLengkap}
                  onChange={(e) => setAlamatLengkap(e.target.value)}
                  rows={3}
                  placeholder="Nama jalan, nomor rumah, RT/RW, patokan (misal: dekat minimarket, warna pagar rumah, dll)"
                  className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none resize-none"
                  onFocus={(e) => e.target.style.borderColor = accent}
                  onBlur={(e) => e.target.style.borderColor = "#E5E2D9"}
                />
                <p className="text-xs text-[#8B8D85] mt-1">
                  Detail ini penting biar kurir gak salah antar paket kamu.
                </p>
              </div>
            )}

            {destinasi && (
              <div>
                <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Truck size={12} /> Pilih kurir
                </label>
                {loadingOngkir ? (
                  <p className="text-xs text-[#8B8D85]">Menghitung ongkir...</p>
                ) : ongkirOptions.length === 0 ? (
                  <p className="text-xs text-[#8B8D85]">Tidak ada layanan kurir untuk rute ini.</p>
                ) : (
                  <div className="space-y-2">
                    {ongkirOptions.map((o, i) => (
                      <label key={i}
                        className="flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm cursor-pointer transition-all"
                        style={{
                          borderColor: selectedOngkir === o ? accent : "#E5E2D9",
                          background: selectedOngkir === o ? `${accent}0D` : "white",
                        }}>
                        <div className="flex items-center gap-2">
                          <input type="radio" checked={selectedOngkir === o} onChange={() => setSelectedOngkir(o)}
                            style={{ accentColor: accent }} />
                          <div>
                            <p className="font-medium text-[#1C1C1A]">{o.name} - {o.service}</p>
                            <p className="text-xs text-[#8B8D85]">{o.etd} hari</p>
                          </div>
                        </div>
                        <span className="font-bold text-[#1C1C1A]">Rp{Number(o.cost).toLocaleString("id-ID")}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-[#E5E2D9] space-y-1.5">
              <div className="flex justify-between text-sm text-[#5B6472]">
                <span>Subtotal</span><span>Rp{subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm text-[#5B6472]">
                <span>Ongkir</span><span>Rp{(selectedOngkir?.cost || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="font-semibold text-[#1C1C1A]">Total</span>
                <span className="text-lg font-black text-[#1C1C1A]">Rp{totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full py-3.5 text-white rounded-xl font-bold transition-opacity disabled:opacity-50"
              style={{ background: accent }}>
              {saving ? "Memproses..." : "Bayar Sekarang"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}