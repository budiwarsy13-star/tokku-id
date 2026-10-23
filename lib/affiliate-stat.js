// Agregasi statistik affiliate (fungsi murni, gampang dites).

// events: [{ ref_source, type, jumlah }]   (dari rpc affiliate_event_counts)
// orders: [{ midtrans_order_id, status, total_price, shipping_cost, ref_source }]  (dalam periode)
// komisi: [{ ref_code, status, amount }]  (dalam periode)
export function ringkasPerChannel(channels, events, orders, komisi) {
  const peta = new Map();
  for (const c of channels) {
    peta.set(c.refCode, { channelId: c.id, refCode: c.refCode, platform: c.platform, handle: c.handle, aktif: c.aktif,
      views: 0, klikProduk: 0, order: 0, omzet: 0, komisi: 0, _trx: new Set() });
  }
  for (const e of events || []) {
    const p = peta.get(e.ref_source); if (!p) continue;
    if (e.type === "view_toko") p.views += Number(e.jumlah);
    else if (e.type === "klik_produk") p.klikProduk += Number(e.jumlah);
  }
  for (const o of orders || []) {
    const p = peta.get(o.ref_source); if (!p || o.status === "gagal") continue;
    p._trx.add(o.midtrans_order_id);
    p.omzet += Math.max(Number(o.total_price || 0) - Number(o.shipping_cost || 0), 0);
  }
  for (const k of komisi || []) {
    const p = peta.get(k.ref_code); if (!p || k.status === "batal") continue;
    p.komisi += Number(k.amount || 0);
  }
  return [...peta.values()].map((p) => {
    const { _trx, ...sisa } = p;
    const order = _trx.size;
    return {
      ...sisa, order,
      konversi: p.views > 0 ? Math.round((order / p.views) * 10000) / 100 : 0, // persen, 2 desimal
      epc: p.views > 0 ? Math.round(p.komisi / p.views) : 0,                    // komisi per kunjungan
    };
  }).sort((a, b) => b.komisi - a.komisi || b.views - a.views);
}

// Total komisi per status (semua waktu). Saldo siap cair = terkunci yang belum masuk batch.
export function ringkasSaldo(komisi) {
  const s = { pending: 0, terkunci: 0, dibayar: 0, batal: 0, siapCair: 0 };
  for (const k of komisi || []) {
    const a = Number(k.amount || 0);
    if (k.status in s) s[k.status] += a;
    if (k.status === "terkunci" && !k.payout_id) s.siapCair += a;
  }
  return s;
}
