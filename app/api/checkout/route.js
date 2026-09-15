import { createClient } from "@supabase/supabase-js";
import midtransClient from "midtrans-client";
import { validasiDiskon } from "@/lib/discount-server";
import { ambilOpsiOngkir } from "@/lib/rajaongkir-server";
import { kurangiStokAtomic, kembalikanStok } from "@/lib/stock-server";

// ======================================================================
// SATU-SATUNYA JALAN buat bikin order + transaksi pembayaran.
//
// PRINSIP KEAMANAN: client (browser buyer) CUMA boleh ngirim ID & jumlah
// (product_id, variant, quantity, kode diskon, tujuan kirim). Client TIDAK
// PERNAH ngirim harga, ongkir, atau total — semua itu dihitung ulang dari
// database di sini. Ini nutup celah manipulasi harga lewat DevTools/console,
// karena berapapun angka yang coba dikirim client, DIABAIKAN total.
// ======================================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

export async function POST(request) {
  const stokYangUdahDikurangi = []; // buat rollback kalau ada langkah belakangan gagal

  try {
    const body = await request.json();
    const {
      storeId,
      buyerName,
      buyerPhone,
      buyerEmail,
      destinationId,
      destinationLabel,
      fullAddress,
      selectedCourier, // { name, service } — cost-nya diabaikan, dihitung ulang
      discountCode,
      items, // [{ productId, variantName, quantity }]
    } = body;

    if (!storeId || !buyerName?.trim() || !buyerPhone?.trim() || !destinationId || !fullAddress?.trim() || !Array.isArray(items) || items.length === 0) {
      return Response.json({ success: false, message: "Data pesanan gak lengkap." }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin.from("stores").select("*").eq("id", storeId).maybeSingle();
    if (!store) return Response.json({ success: false, message: "Toko gak ditemukan." }, { status: 404 });
    if (!store.origin_id) {
      return Response.json({ success: false, message: "Toko ini belum atur alamat asal pengiriman." }, { status: 400 });
    }

    // 1. Ambil harga, stok, & berat ASLI dari database buat tiap item —
    //    bukan dari apa yang diklaim client.
    const itemsTervalidasi = [];
    let subtotal = 0;
    let totalBerat = 0;

    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from("products").select("*").eq("id", item.productId).eq("store_id", storeId).maybeSingle();

      if (!product) {
        return Response.json({ success: false, message: "Ada produk yang gak ditemukan di keranjang. Coba refresh halaman." }, { status: 400 });
      }

      let unitPrice, stokTersedia, namaLengkap;
      if (item.variantName) {
        const variant = (product.variants || []).find((v) => v.name === item.variantName);
        if (!variant) {
          return Response.json({ success: false, message: `Varian "${item.variantName}" buat ${product.name} udah gak tersedia.` }, { status: 400 });
        }
        unitPrice = variant.price;
        stokTersedia = variant.stock;
        namaLengkap = `${product.name} - ${variant.name}`;
      } else {
        unitPrice = product.price;
        stokTersedia = product.stock;
        namaLengkap = product.name;
      }

      const qty = Math.max(1, parseInt(item.quantity) || 1);
      if (qty > stokTersedia) {
        return Response.json({ success: false, message: `Stok "${namaLengkap}" cuma tersisa ${stokTersedia}.` }, { status: 400 });
      }

      subtotal += unitPrice * qty;
      totalBerat += (product.weight || 500) * qty;
      itemsTervalidasi.push({
        productId: product.id,
        variantName: item.variantName || null,
        name: namaLengkap,
        unitPrice,
        quantity: qty,
      });
    }

    // 2. Hitung ULANG ongkir dari RajaOngkir, cocokin ke kurir yang dipilih buyer.
    //    Kalau opsi itu gak ketemu lagi (harga berubah/kurir gak tersedia), tolak.
    let shippingCost = 0;
    let shippingLabel = "";
    if (selectedCourier) {
      const opsiOngkir = await ambilOpsiOngkir(store.origin_id, String(destinationId), totalBerat);
      const cocok = opsiOngkir.find((o) => o.name === selectedCourier.name && o.service === selectedCourier.service);
      if (!cocok) {
        return Response.json({ success: false, message: "Opsi ongkir udah berubah, silakan pilih ulang kurir pengiriman." }, { status: 400 });
      }
      shippingCost = cocok.cost;
      shippingLabel = `${cocok.name} - ${cocok.service}`;
    }

    // 3. Validasi kode diskon (kalau ada) terhadap subtotal ASLI.
    let discountAmount = 0;
    let discountCodeFinal = null;
    if (discountCode) {
      const hasil = await validasiDiskon(supabaseAdmin, storeId, discountCode, subtotal);
      if (!hasil.valid) {
        return Response.json({ success: false, message: hasil.message }, { status: 400 });
      }
      discountAmount = hasil.discountAmount;
      discountCodeFinal = hasil.code;
    }

    const grandTotal = Math.max(subtotal + shippingCost - discountAmount, 0);

    // 4. Kurangi stok ATOMIC per item. Kalau ada yang gagal di tengah jalan
    //    (race condition sama buyer lain), kembalikan yang udah kepotong lalu batalkan.
    for (const item of itemsTervalidasi) {
      const hasil = await kurangiStokAtomic(supabaseAdmin, item.productId, item.variantName, item.quantity);
      if (!hasil.success) {
        for (const sukses of stokYangUdahDikurangi) {
          await kembalikanStok(supabaseAdmin, sukses.productId, sukses.variantName, sukses.quantity);
        }
        return Response.json({ success: false, message: hasil.message }, { status: 409 });
      }
      stokYangUdahDikurangi.push(item);
    }

    // 5. Insert baris order — SEMUA baris share midtrans_order_id yang sama
    //    (1 transaksi = banyak baris produk). Ongkir & diskon ditotal ke
    //    baris pertama aja biar SUM(total_price) = grandTotal persis.
    const midtransOrderId = `TOKKU-${Date.now()}`;
    const rows = itemsTervalidasi.map((item, idx) => {
      const isFirst = idx === 0;
      const itemSubtotal = item.unitPrice * item.quantity;
      const rowTotal = isFirst ? Math.max(itemSubtotal + shippingCost - discountAmount, 0) : itemSubtotal;
      return {
        store_id: storeId,
        product_id: item.productId,
        product_name: item.name,
        variant_name: item.variantName,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        quantity: item.quantity,
        total_price: rowTotal,
        status: "pending",
        destination_id: String(destinationId),
        destination_label: destinationLabel || "",
        full_address: fullAddress.trim(),
        shipping_cost: isFirst ? shippingCost : 0,
        courier: shippingLabel,
        midtrans_order_id: midtransOrderId,
        discount_code: isFirst ? discountCodeFinal : null,
        discount_amount: isFirst ? discountAmount : 0,
      };
    });

    const { error: insertError } = await supabaseAdmin.from("orders").insert(rows);
    if (insertError) {
      for (const item of stokYangUdahDikurangi) {
        await kembalikanStok(supabaseAdmin, item.productId, item.variantName, item.quantity);
      }
      console.error("Insert order error:", insertError);
      return Response.json({ success: false, message: "Gagal membuat pesanan, coba lagi." }, { status: 500 });
    }

    // 6. Notifikasi "order masuk" ke seller.
    const ringkasanProduk = itemsTervalidasi.length === 1
      ? itemsTervalidasi[0].name
      : `${itemsTervalidasi[0].name} + ${itemsTervalidasi.length - 1} produk lainnya`;
    await supabaseAdmin.from("notifications").insert({
      store_id: storeId,
      type: "order_masuk",
      title: "Pesanan baru masuk",
      message: `${buyerName} memesan ${ringkasanProduk}. Menunggu pembayaran.`,
    });

    // 7. Bikin transaksi Midtrans pakai grandTotal yang OTORITATIF dari server.
    const itemDetails = [
      ...itemsTervalidasi.map((item) => ({ id: item.productId, name: item.name, price: item.unitPrice, quantity: item.quantity })),
      ...(shippingCost > 0 ? [{ id: "ongkir", name: `Ongkir ${shippingLabel}`, price: shippingCost, quantity: 1 }] : []),
      ...(discountAmount > 0 ? [{ id: "diskon", name: `Diskon (${discountCodeFinal})`, price: -discountAmount, quantity: 1 }] : []),
    ];

    const transaction = await snap.createTransaction({
      transaction_details: { order_id: midtransOrderId, gross_amount: grandTotal },
      customer_details: {
        first_name: buyerName.trim(),
        email: buyerEmail || `${buyerPhone}@tokku.id`,
        phone: buyerPhone.trim(),
      },
      item_details: itemDetails,
    });

    return Response.json({
      success: true,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId: midtransOrderId,
      grandTotal,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    // Best-effort rollback stok kalau errornya kejadian setelah stok kepotong
    for (const item of stokYangUdahDikurangi) {
      await kembalikanStok(supabaseAdmin, item.productId, item.variantName, item.quantity);
    }
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
