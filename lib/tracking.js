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

export function trackInitiateCheckout(store, { totalPrice, productName, productId, quantity }) {
  const params = {
    content_name: productName,
    content_ids: [productId],
    content_type: "product",
    value: totalPrice,
    currency: "IDR",
    num_items: quantity,
  };
  fireFbq(store, "InitiateCheckout", params);
  fireGa4(store, "begin_checkout", { currency: "IDR", value: totalPrice, items: [{ item_id: productId, item_name: productName, quantity }] });
}

export function trackPurchase(store, { orderId, totalPrice, productName, productId, quantity }) {
  const params = {
    content_name: productName,
    content_ids: [productId],
    content_type: "product",
    value: totalPrice,
    currency: "IDR",
  };
  fireFbq(store, "Purchase", params);
  fireGa4(store, "purchase", {
    transaction_id: orderId,
    currency: "IDR",
    value: totalPrice,
    items: [{ item_id: productId, item_name: productName, quantity }],
  });
}
