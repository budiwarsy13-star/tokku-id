// Helper tracking client-side. Dipakai di halaman storefront publik (app/[slug]/page.js)
// buat load Meta Pixel & Google Analytics 4 punya masing-masing toko, dan nembak event
// standar (ViewContent, InitiateCheckout, Purchase) yang dipakai algoritma iklan buat
// optimasi & ngitung conversion rate.
//
// Catatan penting: event Purchase di sini cuma sinyal TAMBAHAN (client-side, bisa gagal
// kalau pembeli nutup browser). Sinyal utama & lebih reliable dikirim server-side lewat
// webhook Midtrans (lihat app/api/midtrans/notification/route.js), pakai Conversions API
// (Meta) & Measurement Protocol (GA4).

let pixelLoaded = false;
let ga4Loaded = false;

export function initTracking(store) {
  if (typeof window === "undefined") return;

  if (store.meta_pixel_id && !pixelLoaded) {
    pixelLoaded = true;
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", store.meta_pixel_id);
  }

  if (store.ga4_measurement_id && !ga4Loaded) {
    ga4Loaded = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${store.ga4_measurement_id}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", store.ga4_measurement_id);
  }
}

function fireFbq(store, event, params) {
  if (store.meta_pixel_id && typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, params);
  }
}

function fireGa4(store, event, params) {
  if (store.ga4_measurement_id && typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, params);
  }
}

export function trackViewContent(store, product) {
  const params = {
    content_name: product.name,
    content_ids: [product.id],
    content_type: "product",
    value: Number(product.price),
    currency: "IDR",
  };
  fireFbq(store, "ViewContent", params);
  fireGa4(store, "view_item", { currency: "IDR", value: Number(product.price), items: [{ item_id: product.id, item_name: product.name }] });
}

export function trackInitiateCheckout(store, { totalPrice, items }) {
  // items: [{ productId, name, quantity }]
  const params = {
    content_ids: items.map((i) => i.productId),
    content_type: "product",
    value: totalPrice,
    currency: "IDR",
    num_items: items.reduce((s, i) => s + i.quantity, 0),
  };
  fireFbq(store, "InitiateCheckout", params);
  fireGa4(store, "begin_checkout", {
    currency: "IDR",
    value: totalPrice,
    items: items.map((i) => ({ item_id: i.productId, item_name: i.name, quantity: i.quantity })),
  });
}

export function trackPurchase(store, { orderId, totalPrice, items }) {
  // items: [{ productId, name, quantity }]
  const params = {
    content_ids: items.map((i) => i.productId),
    content_type: "product",
    value: totalPrice,
    currency: "IDR",
  };
  fireFbq(store, "Purchase", params);
  fireGa4(store, "purchase", {
    transaction_id: orderId,
    currency: "IDR",
    value: totalPrice,
    items: items.map((i) => ({ item_id: i.productId, item_name: i.name, quantity: i.quantity })),
  });
}

// ---------- UTM / Ref tracking ----------
// Seller bagiin link kayak tokku.id/toko-slug?ref=igstory. Ref disimpen di
// localStorage (7 hari) biar tetap kebawa walau buyer pindah halaman / balik lagi
// nanti, lalu ikut ke tiap event & ke order pas checkout.
const REF_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let activeRef = null;

export function bersihkanRef(raw) {
  const r = String(raw || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
  return r || null;
}

// Panggil sekali pas halaman toko kebuka. Baca ?ref= dari URL; kalau gak ada,
// pakai yang tersimpan sebelumnya (kalau belum kadaluarsa).
export function inisialisasiRef(slug) {
  if (typeof window === "undefined") return null;
  const key = `tokku_ref_${slug}`;
  try {
    const dariUrl = bersihkanRef(new URLSearchParams(window.location.search).get("ref"));
    if (dariUrl) {
      localStorage.setItem(key, JSON.stringify({ ref: dariUrl, ts: Date.now() }));
      activeRef = dariUrl;
      return dariUrl;
    }
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved?.ref && Date.now() - saved.ts < REF_TTL_MS) {
      activeRef = saved.ref;
      return saved.ref;
    }
  } catch (e) {
    // localStorage bisa diblokir (mode privat dll) — abaikan, tracking ref sekadar hilang
  }
  activeRef = null;
  return null;
}

export function getRefAktif() {
  return activeRef;
}

// Catat event ringan ke database sendiri (bukan ke Meta/GA4) buat ngisi
// widget "Performa Toko" di dashboard. Fire-and-forget — gak nunggu hasilnya
// dan gak nge-block interaksi pembeli kalau gagal/lambat.
export function catatEvent(supabase, storeId, type, productId = null) {
  supabase
    .from("store_events")
    .insert({ store_id: storeId, type, product_id: productId, ref_source: activeRef })
    .then(() => {});
}