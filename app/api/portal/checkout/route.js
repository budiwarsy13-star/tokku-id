// app/api/portal/checkout/route.js
// Handles both ONLINE (Midtrans) and COD orders
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import Midtrans from "midtrans-client";

const snap = new Midtrans.Snap({
  isProduction: process.env.MIDTRANS_MODE === "production",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
});

export async function POST(req) {
  const body = await req.json();
  const {
    store_id, product_id, variant_id,
    buyer_name, buyer_phone, buyer_email,
    buyer_address, buyer_city, buyer_province,
    quantity, discount_code_id, courierId, courierName, shippingCost,
    payment_method, // "online" | "cod"
  } = body;

  const isCOD = payment_method === "cod";

  // Fetch product + store
  const { data: product } = await supabase
    .from("products").select("*, stores(*)").eq("id", product_id).single();
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });

  const store = product.stores;

  // Resolve variant price
  let unitPrice = Number(product.price);
  if (variant_id) {
    const { data: variant } = await supabase.from("product_variants").select("*").eq("id", variant_id).single();
    if (variant?.price) unitPrice = Number(variant.price);
  }

  const subtotal = unitPrice * (quantity || 1);
  const shipping = Number(shippingCost || 0);
  let discount = 0;

  // Apply discount code
  if (discount_code_id) {
    const { data: dc } = await supabase.from("discount_codes").select("*").eq("id", discount_code_id).single();
    if (dc && dc.is_active) {
      const minOk = !dc.min_purchase || subtotal >= dc.min_purchase;
      const limitOk = !dc.usage_limit || dc.used_count < dc.usage_limit;
      const expOk = !dc.expires_at || new Date(dc.expires_at) > new Date();
      if (minOk && limitOk && expOk) {
        discount = dc.type === "percentage" ? Math.round(subtotal * dc.value / 100) : dc.value;
        await supabase.from("discount_codes").update({ used_count: dc.used_count + 1 }).eq("id", dc.id);
      }
    }
  }

  const totalPrice = Math.max(0, subtotal + shipping - discount);

  // Reduce stock
  if (variant_id) {
    await supabase.rpc("decrement_variant_stock", { variant_id, qty: quantity || 1 });
  } else if (product.stock !== null) {
    await supabase.from("products").update({ stock: Math.max(0, product.stock - (quantity || 1)) }).eq("id", product_id);
  }

  // Create order
  const orderPayload = {
    store_id,
    product_id,
    variant_id: variant_id || null,
    buyer_name,
    buyer_phone,
    buyer_email,
    buyer_address,
    buyer_city,
    buyer_province,
    quantity: quantity || 1,
    unit_price: unitPrice,
    shipping_cost: shipping,
    discount_amount: discount,
    total_price: totalPrice,
    courier_id: courierId || null,
    courier_name: courierName || null,
    discount_code_id: discount_code_id || null,
    payment_method: isCOD ? "cod" : "online",
    status: isCOD ? "paid" : "pending", // COD = langsung diproses, online = tunggu bayar
  };

  const { data: order, error: orderErr } = await supabase.from("orders").insert(orderPayload).select().single();
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  // Insert seller notification
  await supabase.from("notifications").insert({
    store_id,
    type: "order_masuk",
    title: "Pesanan baru",
    message: `${buyer_name} memesan ${product.name}${isCOD ? " (COD)" : ""} — Rp${totalPrice.toLocaleString("id-ID")}`,
    metadata: { order_id: order.id },
  });

  // Send WA notification
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tokku.id";
  await fetch(`${baseUrl}/api/wa/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "order_masuk", orderId: order.id }),
  }).catch(() => {}); // non-blocking

  // Send WA to buyer
  await fetch(`${baseUrl}/api/wa/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "order_created_buyer", orderId: order.id }),
  }).catch(() => {});

  // For COD: return order directly (no Midtrans)
  if (isCOD) {
    return NextResponse.json({ order_id: order.id, payment_method: "cod" });
  }

  // For online: create Midtrans Snap token
  try {
    const snapRes = await snap.createTransaction({
      transaction_details: {
        order_id: order.id,
        gross_amount: totalPrice,
      },
      customer_details: {
        first_name: buyer_name,
        phone: buyer_phone,
        email: buyer_email || undefined,
      },
      item_details: [
        {
          id: product_id,
          price: unitPrice,
          quantity: quantity || 1,
          name: product.name.slice(0, 50),
        },
        ...(shipping > 0
          ? [{ id: "shipping", price: shipping, quantity: 1, name: "Ongkos kirim" }]
          : []),
        ...(discount > 0
          ? [{ id: "discount", price: -discount, quantity: 1, name: "Diskon" }]
          : []),
      ],
    });
    return NextResponse.json({
      order_id: order.id,
      snap_token: snapRes.token,
      payment_method: "online",
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
