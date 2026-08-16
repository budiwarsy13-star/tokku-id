"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { buatNotifikasi } from "@/lib/notifications";
import { initTracking, trackViewContent, trackInitiateCheckout, trackPurchase, catatEvent } from "@/lib/tracking";
import { getCart, addToCart, updateCartQty, removeFromCart, clearCart, cartTotalItems, cartSubtotal, cartTotalWeight } from "@/lib/cart";
import PromoCarousel from "@/components/PromoCarousel";
import { ShoppingCart, X, Search, Truck, Plus, Minus, Trash2 } from "lucide-react";

export default function TokoPublik() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [banners, setBanners] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  function refreshCart() {
    setCart(getCart(slug));
  }

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
      const { data: bannersData } = await supabase
        .from("store_banners").select("*").eq("store_id", storeData.id)
        .eq("is_active", true).order("sort_order", { ascending: true });
      setBanners(bannersData || []);
      setLoading(false);
      initTracking(storeData);
      catatEvent(supabase, storeData.id, "view_toko");
    }
    fetchStore();
    setCart(getCart(slug));
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

  function handleBannerClick(banner) {
    if (!banner.link_product_id) return;
    const produk = products.find((p) => p.id === banner.link_product_id);
    if (!produk) return;
    setSelectedProduct(produk);
    trackViewContent(store, produk);
    catatEvent(supabase, store.id, "klik_produk", produk.id);
  }

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

        {banners.length > 0 && (
          <PromoCarousel banners={banners} onBannerClick={handleBannerClick} accent={accent} />
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
              <button key={p.id} onClick={() => { setSelectedProduct(p); trackViewContent(store, p); catatEvent(supabase, store.id, "klik_produk", p.id); }}
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
        <ProductModal
          product={selectedProduct}
          store={store}
          accent={accent}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(variant, qty) => {
            addToCart(slug, selectedProduct, variant, qty);
            refreshCart();
            setSelectedProduct(null);
            setCartOpen(true);
          }}
          onBuyNow={(variant, qty) => {
            addToCart(slug, selectedProduct, variant, qty);
            refreshCart();
            setSelectedProduct(null);
            setCheckoutOpen(true);
          }}
        />
      )}

      {/* TOMBOL CART MELAYANG */}
      {cart.length > 0 && !cartOpen && !checkoutOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full text-white font-medium shadow-lg hover:opacity-90 transition-opacity"
          style={{ background: accent }}
        >
          <ShoppingCart size={18} />
          Keranjang
          <span className="bg-white/25 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {cartTotalItems(cart)}
          </span>
        </button>
      )}

      {cartOpen && (
        <CartDrawer
          cart={cart}
          accent={accent}
          onClose={() => setCartOpen(false)}
          onUpdateQty={(key, qty) => { updateCartQty(slug, key, qty); refreshCart(); }}
          onRemove={(key) => { removeFromCart(slug, key); refreshCart(); }}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}

      {checkoutOpen && cart.length > 0 && (
        <CartCheckoutModal
          items={cart}
          store={store}
          accent={accent}
          onClose={() => setCheckoutOpen(false)}
          onOrderComplete={() => { clearCart(slug); refreshCart(); }}
        />
      )}

      {/* FOOTER */}
      <footer className="text-center py-8 text-xs text-[#8B8D85] border-t border-[#E5E2D9]">
        Dibuat dengan{" "}
        <a href="/" className="font-medium hover:underline" style={{ color: accent }}>tokku.id</a>
        {" "}· Jualan langsung tanpa potongan marketplace
        <br />
        <a href="/lacak" className="hover:underline mt-1 inline-block">Lacak pesanan kamu</a>
      </footer>
    </main>
  );
}

function ProductModal({ product, store, accent, onClose, onAddToCart, onBuyNow }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants?.length > 0 ? product.variants[0] : null
  );
  const unitPrice = selectedVariant ? selectedVariant.price : product.price;
  const stok = selectedVariant ? selectedVariant.stock : product.stock;
  const habis = stok !== undefined && stok !== null && stok <= 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-6">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#E5E2D9] sticky top-0 bg-white z-10">
          <h2 className="font-bold text-[#1C1C1A]">Detail produk</h2>
          <button onClick={onClose} className="text-[#8B8D85] hover:text-[#1C1C1A]"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="aspect-square rounded-xl overflow-hidden" style={{ background: `${accent}11` }}>
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">👕</div>
            )}
          </div>

          <div>
            <p className="font-bold text-[#1C1C1A] text-lg">{product.name}</p>
            <p className="text-lg font-black mt-0.5" style={{ color: accent }}>
              Rp{Number(unitPrice).toLocaleString("id-ID")}
            </p>
            {product.description && (
              <p className="text-sm text-[#5B6472] mt-2 leading-relaxed">{product.description}</p>
            )}
          </div>

          {product.variants?.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Varian</label>
              <select value={selectedVariant?.name}
                onChange={(e) => { setSelectedVariant(product.variants.find((v) => v.name === e.target.value)); setQuantity(1); }}
                className="w-full px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none">
                {product.variants.map((v) => (
                  <option key={v.name} value={v.name} disabled={v.stock <= 0}>
                    {v.name} — Rp{Number(v.price).toLocaleString("id-ID")} {v.stock <= 0 ? "(Habis)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {habis ? (
            <p className="text-sm text-[#A32D2D] bg-[#FBEAEA] px-3 py-2.5 rounded-lg text-center">Stok varian ini lagi habis.</p>
          ) : (
            <div>
              <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">Jumlah</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg border border-[#E5E2D9] flex items-center justify-center hover:bg-[#FAFAF7]">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(stok ?? 999, q + 1))}
                  className="w-9 h-9 rounded-lg border border-[#E5E2D9] flex items-center justify-center hover:bg-[#FAFAF7]">
                  <Plus size={14} />
                </button>
                {stok !== undefined && stok !== null && (
                  <span className="text-xs text-[#8B8D85] ml-1">Stok {stok}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" disabled={habis} onClick={() => onAddToCart(selectedVariant, quantity)}
              className="flex-1 py-3 rounded-xl font-medium border-2 disabled:opacity-40 transition-colors"
              style={{ borderColor: accent, color: accent }}>
              + Keranjang
            </button>
            <button type="button" disabled={habis} onClick={() => onBuyNow(selectedVariant, quantity)}
              className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-40 transition-opacity"
              style={{ background: accent }}>
              Beli Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cart, accent, onClose, onUpdateQty, onRemove, onCheckout }) {
  const subtotal = cartSubtotal(cart);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-6">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#E5E2D9] sticky top-0 bg-white z-10">
          <h2 className="font-bold text-[#1C1C1A]">Keranjang kamu</h2>
          <button onClick={onClose} className="text-[#8B8D85] hover:text-[#1C1C1A]"><X size={20} /></button>
        </div>

        {cart.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingCart size={28} className="mx-auto mb-3 text-[#8B8D85]" />
            <p className="text-sm text-[#8B8D85]">Keranjang kamu masih kosong.</p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3 flex-1">
              {cart.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: `${accent}22` }}>
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1C1A] line-clamp-1">{item.name}</p>
                    <p className="text-sm font-black" style={{ color: accent }}>
                      Rp{Number(item.price).toLocaleString("id-ID")}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => onUpdateQty(item.key, item.quantity - 1)}
                        className="w-6 h-6 rounded border border-[#E5E2D9] flex items-center justify-center hover:bg-[#FAFAF7]">
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => onUpdateQty(item.key, item.quantity + 1)}
                        className="w-6 h-6 rounded border border-[#E5E2D9] flex items-center justify-center hover:bg-[#FAFAF7]">
                        <Plus size={12} />
                      </button>
                      <button onClick={() => onRemove(item.key)} className="ml-auto text-[#A32D2D] p-1 hover:bg-[#FBEAEA] rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#E5E2D9] sticky bottom-0 bg-white">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-[#5B6472]">Subtotal</span>
                <span className="font-bold text-[#1C1C1A]">Rp{subtotal.toLocaleString("id-ID")}</span>
              </div>
              <button onClick={onCheckout}
                className="w-full py-3.5 text-white rounded-xl font-bold transition-opacity"
                style={{ background: accent }}>
                Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CartCheckoutModal({ items, store, accent, onClose, onOrderComplete }) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
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
  const [paymentStatus, setPaymentStatus] = useState(null); // "paid" | "pending"
  const [kodeDiskon, setKodeDiskon] = useState("");
  const [diskonTerpakai, setDiskonTerpakai] = useState(null); // { code, discountAmount, message }
  const [cekingDiskon, setCekingDiskon] = useState(false);
  const [diskonError, setDiskonError] = useState("");
  const [lastOrderId, setLastOrderId] = useState("");

  const subtotal = cartSubtotal(items);
  const totalBerat = cartTotalWeight(items);
  const totalSebelumDiskon = subtotal + (selectedOngkir?.cost || 0);
  const totalPrice = Math.max(totalSebelumDiskon - (diskonTerpakai?.discountAmount || 0), 0);

  async function handleTerapkanDiskon(e) {
    e.preventDefault();
    if (!kodeDiskon.trim()) return;
    setCekingDiskon(true);
    setDiskonError("");
    const res = await fetch("/api/discount/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: kodeDiskon, storeId: store.id, subtotal: totalSebelumDiskon }),
    });
    const data = await res.json();
    setCekingDiskon(false);
    if (data.valid) {
      setDiskonTerpakai({ code: data.code, discountAmount: data.discountAmount, message: data.message });
    } else {
      setDiskonTerpakai(null);
      setDiskonError(data.message || "Kode diskon gak valid.");
    }
  }

  function hapusDiskon() {
    setDiskonTerpakai(null);
    setKodeDiskon("");
    setDiskonError("");
  }

  useEffect(() => {
    if (diskonTerpakai) {
      setDiskonTerpakai(null);
      setDiskonError("Kode diskon direset karena ongkir berubah, terapkan lagi ya.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOngkir]);

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
    const res = await fetch("/api/rajaongkir/cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: store.origin_id, destination: String(lokasi.id), weight: totalBerat }),
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

    trackInitiateCheckout(store, {
      totalPrice,
      items: items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
    });

    const orderId = `TOKKU-${Date.now()}`;
    setLastOrderId(orderId);

    const discountAmount = diskonTerpakai?.discountAmount || 0;

    // 1 baris order per item cart, semuanya share midtrans_order_id yang sama
    // (jadi "1 transaksi" secara logis walau kesebar di beberapa baris).
    // Ongkir & diskon ditotal ke baris PERTAMA aja, biar SUM(total_price)
    // semua baris tetap sama persis dengan totalPrice yang beneran ditagih.
    const rows = items.map((item, idx) => {
      const itemSubtotal = item.price * item.quantity;
      const isFirst = idx === 0;
      const rowTotal = isFirst
        ? Math.max(itemSubtotal + selectedOngkir.cost - discountAmount, 0)
        : itemSubtotal;
      return {
        store_id: store.id,
        product_id: item.productId,
        product_name: item.name,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        quantity: item.quantity,
        total_price: rowTotal,
        status: "pending",
        destination_id: String(destinasi.id),
        destination_label: destinasi.label,
        full_address: alamatLengkap,
        shipping_cost: isFirst ? selectedOngkir.cost : 0,
        courier: `${selectedOngkir.name} - ${selectedOngkir.service}`,
        midtrans_order_id: orderId,
        discount_code: isFirst ? (diskonTerpakai?.code || null) : null,
        discount_amount: isFirst ? discountAmount : 0,
      };
    });

    const { error: orderError } = await supabase.from("orders").insert(rows);

    if (orderError) { setSaving(false); return alert("Gagal membuat pesanan: " + orderError.message); }

    const ringkasanProduk = items.length === 1 ? items[0].name : `${items[0].name} + ${items.length - 1} produk lainnya`;
    await buatNotifikasi(supabase, {
      storeId: store.id,
      type: "order_masuk",
      title: "Pesanan baru masuk",
      message: `${buyerName} memesan ${ringkasanProduk}. Menunggu pembayaran.`,
    });

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
          ...items.map((item) => ({ id: item.productId, name: item.name, price: item.price, quantity: item.quantity })),
          ...(selectedOngkir.cost > 0 ? [{ id: "ongkir", name: `Ongkir ${selectedOngkir.name}`, price: selectedOngkir.cost, quantity: 1 }] : []),
          ...(discountAmount > 0 ? [{ id: "diskon", name: `Diskon (${diskonTerpakai.code})`, price: -discountAmount, quantity: 1 }] : []),
        ],
      }),
    });

    const payData = await payRes.json();
    setSaving(false);
    if (payData.error) return alert("Gagal membuat pembayaran: " + payData.error);

    window.snap.pay(payData.token, {
      onSuccess: async () => {
        await supabase.from("orders").update({ status: "paid" }).eq("midtrans_order_id", orderId);
        trackPurchase(store, {
          orderId,
          totalPrice,
          items: items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
        });
        onOrderComplete();
        setPaymentStatus("paid");
        setSuccess(true);
      },
      onPending: () => {
        onOrderComplete();
        setPaymentStatus("pending");
        setSuccess(true);
      },
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
            <p className="text-sm text-[#8B8D85] mb-6">
              {paymentStatus === "paid"
                ? "Pembayaran kamu sudah berhasil. Pesananmu udah masuk ke toko."
                : "Pesananmu tercatat! Selesaikan pembayaran sesuai instruksi, status bakal otomatis berubah begitu pembayaran dikonfirmasi."}
            </p>
            <div className="bg-[#FAFAF7] border border-[#E5E2D9] rounded-lg px-4 py-3 mb-4 text-left">
              <p className="text-xs text-[#8B8D85] mb-0.5">Order ID kamu (simpan buat lacak pesanan)</p>
              <p className="text-sm font-mono font-semibold text-[#1C1C1A]">{lastOrderId}</p>
            </div>
            <a href={`/lacak?order=${lastOrderId}`}
              className="block w-full py-2.5 mb-2 text-center text-sm font-medium rounded-lg border border-[#E5E2D9] text-[#5B6472] hover:bg-[#FAFAF7] transition-colors">
              Lacak status pesanan
            </a>
            <button onClick={onClose}
              className="w-full py-3 text-white rounded-lg font-medium transition-colors"
              style={{ background: accent }}>
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="space-y-2 p-3 rounded-xl" style={{ background: `${accent}0D` }}>
              {items.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ background: `${accent}22` }}>
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1C1C1A] line-clamp-1">{item.name}</p>
                    <p className="text-xs text-[#5B6472]">{item.quantity}x · Rp{Number(item.price).toLocaleString("id-ID")}</p>
                  </div>
                </div>
              ))}
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

            {destinasi && (
              <div>
                <label className="text-xs font-medium text-[#5B6472] uppercase tracking-wider block mb-1.5">
                  Kode diskon <span className="text-[#8B8D85] normal-case font-normal">(opsional)</span>
                </label>
                {diskonTerpakai ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm bg-[#EAF3DE] border border-[#C0DD97]">
                    <span className="text-[#27500A]">{diskonTerpakai.message}</span>
                    <button type="button" onClick={hapusDiskon} className="text-xs text-[#27500A] underline">Hapus</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={kodeDiskon}
                      onChange={(e) => { setKodeDiskon(e.target.value.toUpperCase()); setDiskonError(""); }}
                      placeholder="Masukin kode diskon"
                      className="flex-1 px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-sm font-mono focus:outline-none"
                      onFocus={(e) => e.target.style.borderColor = accent}
                      onBlur={(e) => e.target.style.borderColor = "#E5E2D9"} />
                    <button type="button" onClick={handleTerapkanDiskon} disabled={cekingDiskon || !kodeDiskon.trim()}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                      style={{ background: accent }}>
                      {cekingDiskon ? "..." : "Pakai"}
                    </button>
                  </div>
                )}
                {diskonError && <p className="text-xs text-[#A32D2D] mt-1.5">{diskonError}</p>}
              </div>
            )}

            <div className="pt-3 border-t border-[#E5E2D9] space-y-1.5">
              <div className="flex justify-between text-sm text-[#5B6472]">
                <span>Subtotal</span><span>Rp{subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm text-[#5B6472]">
                <span>Ongkir</span><span>Rp{(selectedOngkir?.cost || 0).toLocaleString("id-ID")}</span>
              </div>
              {diskonTerpakai && (
                <div className="flex justify-between text-sm text-[#3B6D11]">
                  <span>Diskon ({diskonTerpakai.code})</span><span>-Rp{diskonTerpakai.discountAmount.toLocaleString("id-ID")}</span>
                </div>
              )}
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