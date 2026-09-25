// app/portal/pesanan/[orderId]/page.js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, CheckCircle2, Package, Truck, Clock, XCircle,
  MessageCircle, AlertTriangle, RotateCcw, Star, Send,
  ShoppingCart, Copy, Check, MapPin, User
} from "lucide-react";

function rupiah(n) { return "Rp" + Number(n).toLocaleString("id-ID"); }
function tglFormat(d) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TRACKING_STAGES = [
  { key: "order_created", label: "Pesanan Dibuat",            icon: Package,       color: "#6366F1" },
  { key: "packed",        label: "Dikemas / Menunggu Kurir",  icon: Package,       color: "#F59E0B" },
  { key: "picked_up",    label: "Kurir Menjemput Paket",     icon: Truck,         color: "#3B82F6" },
  { key: "in_transit",   label: "Sedang Dikirim",            icon: Truck,         color: "#3B82F6" },
  { key: "delivered",    label: "Paket Diterima",            icon: CheckCircle2,  color: "#10B981" },
  { key: "cancelled",    label: "Dibatalkan",                icon: XCircle,       color: "#EF4444" },
];

const COMPLAINT_TYPES = [
  { value: "barang_tidak_sesuai",    label: "Barang tidak sesuai deskripsi" },
  { value: "belum_diterima",         label: "Belum menerima barang" },
  { value: "barang_rusak",           label: "Barang rusak / cacat" },
  { value: "salah_produk",           label: "Produk yang dikirim salah" },
  { value: "lainnya",                label: "Lainnya" },
];

const RETURN_REASONS = [
  { value: "produk_cacat",              label: "Produk cacat / tidak berfungsi" },
  { value: "salah_kirim",              label: "Penjual salah kirim produk" },
  { value: "tidak_sesuai_deskripsi",   label: "Tidak sesuai deskripsi" },
  { value: "berubah_pikiran",          label: "Berubah pikiran" },
  { value: "lainnya",                  label: "Lainnya" },
];

export default function PortalOrderDetail() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("tracking");
  // Chat state
  const [chatMsg, setChatMsg] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [botSending, setBotSending] = useState(false);
  const chatEndRef = useRef(null);
  // Review state
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  // Complaint state
  const [complaintType, setComplaintType] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [involvesCs, setInvolvesCs] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  // Return state
  const [returnReason, setReturnReason] = useState("");
  const [returnDesc, setReturnDesc] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  // Copy
  const [copied, setCopied] = useState(false);

  async function loadData() {
    const res = await fetch(`/api/portal/orders?orderId=${orderId}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
    if (d.review) setReviewDone(true);

    // Fetch FAQ templates dari toko
    if (d?.order?.store_id) {
      const tmplRes = await fetch(`/api/portal/chat-templates?storeId=${d.order.store_id}`);
      const tmplData = await tmplRes.json();
      setTemplates(tmplData.templates || []);

      // Init welcome message jika chat masih kosong
      if (!d.chats || d.chats.length === 0) {
        await fetch("/api/portal/chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, storeId: d.order.store_id }),
        });
        // Reload supaya welcome message muncul
        const r2 = await fetch(`/api/portal/orders?orderId=${orderId}`);
        const d2 = await r2.json();
        setData(d2);
      }
    }
  }

  useEffect(() => { loadData(); }, [orderId]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.chats]);

  // Cek fragment #ulasan dari URL
  useEffect(() => {
    if (window.location.hash === "#ulasan") setActiveSection("ulasan");
  }, []);

  // ── Realtime: Broadcast channel buat live chat dua arah ─────
  // Broadcast lebih reliable dari postgres_changes untuk filter non-PK column
  const broadcastChannelRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`chat-order-${orderId}`, {
        config: { broadcast: { self: false } }, // jangan terima pesan dari diri sendiri
      })
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        // Terima pesan dari seller secara real-time
        if (payload?.sender_type === "seller") {
          setData((prev) => {
            if (!prev) return prev;
            // Cegah duplikat
            const sudahAda = prev.chats?.some((c) => c.id === payload.id);
            if (sudahAda) return prev;
            return { ...prev, chats: [...(prev.chats || []), payload] };
          });
          // Notif browser jika tab tidak difokus
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification("Pesan baru dari penjual", {
              body: payload.message?.slice(0, 80),
              icon: "/favicon.ico",
            });
          }
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          broadcastChannelRef.current = channel;
        }
      });

    return () => {
      broadcastChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Buyer klik FAQ → kirim question sebagai pesan buyer, lalu bot auto-reply
  async function handleFAQ(template) {
    if (!data?.order || botSending) return;
    setBotSending(true);

    // Kirim pertanyaan dari buyer
    const qRes = await fetch("/api/portal/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId, message: template.question,
        senderType: "buyer", senderName: data.order.buyer_name,
      }),
    });
    const qData = await qRes.json();
    if (qData.chat) {
      setData((prev) => ({ ...prev, chats: [...(prev?.chats || []), qData.chat] }));
      // Broadcast pertanyaan buyer ke seller
      if (broadcastChannelRef.current) {
        await broadcastChannelRef.current.send({
          type: "broadcast", event: "new_message", payload: qData.chat,
        });
      }
    }

    // Delay singkat supaya terasa natural, baru kirim auto-reply
    await new Promise((r) => setTimeout(r, 600));

    const aRes = await fetch("/api/portal/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId, message: template.answer,
        senderType: "bot", senderName: "Pesan Otomatis",
      }),
    });
    const aData = await aRes.json();
    if (aData.chat) {
      setData((prev) => ({ ...prev, chats: [...(prev?.chats || []), aData.chat] }));
    }
    setBotSending(false);
  }

  async function kirimChat(e) {
    e.preventDefault();
    if (!chatMsg.trim() || !data?.order) return;
    setSendingChat(true);
    const msgText = chatMsg.trim();
    setChatMsg("");

    // Optimistic update: tampilkan pesan langsung tanpa tunggu server
    const tempMsg = {
      id: `temp-${Date.now()}`,
      order_id: orderId,
      sender_type: "buyer",
      sender_name: data.order.buyer_name,
      message: msgText,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setData((prev) => ({ ...prev, chats: [...(prev?.chats || []), tempMsg] }));

    // Kirim ke server
    const res = await fetch("/api/portal/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId, message: msgText,
        senderType: "buyer",
        senderName: data.order.buyer_name,
      }),
    });

    // Broadcast ke seller secara real-time via channel
    if (res.ok && broadcastChannelRef.current) {
      const saved = await res.json();
      await broadcastChannelRef.current.send({
        type: "broadcast",
        event: "new_message",
        payload: saved.chat || tempMsg,
      });
    }
    setSendingChat(false);
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!rating) return alert("Pilih rating dulu ya.");
    setSubmittingReview(true);
    const o = data.order;
    await fetch("/api/portal/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "review", orderId, productId: o.product_id, storeId: o.store_id,
        buyerName: o.buyer_name, buyerPhone: o.buyer_phone,
        rating, reviewText,
      }),
    });
    setReviewDone(true);
    setSubmittingReview(false);
  }

  async function submitComplaint(e) {
    e.preventDefault();
    if (!complaintType || !complaintDesc) return;
    setSubmittingComplaint(true);
    const o = data.order;
    const res = await fetch("/api/portal/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complaint", orderId, storeId: o.store_id,
        buyerName: o.buyer_name, buyerPhone: o.buyer_phone,
        type: complaintType, description: complaintDesc, involvesCs,
      }),
    });
    setSubmittingComplaint(false);
    if (res.ok) { await loadData(); setActiveSection("tracking"); }
    else { const d = await res.json(); alert(d.error); }
  }

  async function submitReturn(e) {
    e.preventDefault();
    if (!returnReason) return;
    setSubmittingReturn(true);
    const o = data.order;
    const res = await fetch("/api/portal/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "return", orderId, storeId: o.store_id,
        buyerName: o.buyer_name, buyerPhone: o.buyer_phone,
        reason: returnReason, description: returnDesc,
      }),
    });
    setSubmittingReturn(false);
    if (res.ok) { await loadData(); setActiveSection("tracking"); }
    else { const d = await res.json(); alert(d.error); }
  }

  if (loading) return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <p className="text-[#8B8D85] text-sm">Memuat...</p>
    </main>
  );

  if (!data?.order) return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-xl font-bold text-[#1C1C1A] mb-2">Pesanan tidak ditemukan</h1>
        <a href="/portal" className="text-sm text-[#D85A30] underline">Kembali ke portal</a>
      </div>
    </main>
  );

  const { order, events, chats, complaint, return: ret, review } = data;
  const store = order.stores || {};
  const accentColor = store.accent_color || "#D85A30";

  // Build tracking timeline
  const doneTypes = new Set(events.map((e) => e.event_type));
  const isCancelled = order.status === "dibatalkan";
  const isDelivered = order.status === "selesai" || doneTypes.has("delivered");
  const deliveredEvent = events.find((e) => e.event_type === "delivered");

  const stagesShown = isCancelled
    ? TRACKING_STAGES.filter((s) => doneTypes.has(s.key) || s.key === "cancelled")
    : TRACKING_STAGES.filter((s) => s.key !== "cancelled");

  const unreadChat = chats.filter((c) => c.sender_type === "seller" && !c.is_read).length;

  const SECTIONS = [
    { key: "tracking", label: "Pelacakan" },
    { key: "chat",     label: `Chat${unreadChat ? ` (${unreadChat})` : ""}` },
    { key: "ulasan",   label: "Ulasan" },
    { key: "komplain", label: "Komplain" },
    { key: "return",   label: "Return" },
  ];

  return (
    <main className="min-h-screen bg-[#FAFAF7]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E2D9] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => history.back()} className="p-2 rounded-xl hover:bg-[#F1EFE8] text-[#5B6472]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[#1C1C1A] text-sm truncate">Detail Pesanan</h1>
          <p className="text-xs text-[#8B8D85] truncate">{store.name} · {orderId.slice(0, 8)}...</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="bg-white border-b border-[#E5E2D9] overflow-x-auto">
        <div className="flex px-4 min-w-max">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === s.key
                  ? "text-[#D85A30] border-b-2 border-[#D85A30]"
                  : "text-[#8B8D85]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* ── TRACKING ─────────────────────────────────────── */}
        {activeSection === "tracking" && (
          <div className="space-y-4">
            {/* Info produk */}
            <div className="bg-white rounded-2xl border border-[#E5E2D9] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-xl bg-[#F1EFE8] overflow-hidden flex-shrink-0">
                  {order.products?.images?.[0] && (
                    <img src={order.products.images[0]} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1C1C1A] truncate">{order.product_name}</p>
                  <p className="text-xs text-[#8B8D85]">{order.quantity}x · {rupiah(order.total_price)}</p>
                  <p className="text-xs text-[#8B8D85] mt-0.5">{order.courier}</p>
                </div>
              </div>

              {/* Nomor resi */}
              {order.waybill_number && (
                <div className="flex items-center justify-between bg-[#F1EFE8] rounded-xl px-3 py-2">
                  <div>
                    <p className="text-[10px] text-[#8B8D85] uppercase tracking-wider">Nomor Resi</p>
                    <p className="text-sm font-mono font-bold text-[#1C1C1A]">{order.waybill_number}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(order.waybill_number); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="p-1.5 rounded-lg text-[#D85A30]"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              )}

              {/* Alamat pengiriman */}
              {order.destination_label && (
                <div className="flex items-start gap-2 mt-3">
                  <MapPin size={14} className="text-[#8B8D85] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#8B8D85]">
                    {order.full_address ? `${order.full_address}, ` : ""}{order.destination_label}
                  </p>
                </div>
              )}
            </div>

            {/* Timeline tracking */}
            <div className="bg-white rounded-2xl border border-[#E5E2D9] p-5">
              <h2 className="text-sm font-bold text-[#1C1C1A] mb-4">Status Pengiriman</h2>
              <div className="relative">
                {stagesShown.map((stage, idx) => {
                  const done = doneTypes.has(stage.key);
                  const isLast = idx === stagesShown.length - 1;
                  const matchingEvents = events.filter((e) => e.event_type === stage.key);
                  const latestEvent = matchingEvents[matchingEvents.length - 1];

                  return (
                    <div key={stage.key} className="flex gap-4 relative">
                      {/* Line connector */}
                      {!isLast && (
                        <div className="absolute left-[13px] top-7 bottom-0 w-0.5"
                          style={{ background: done ? stage.color : "#E5E2D9" }} />
                      )}

                      {/* Icon dot */}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center z-10 relative"
                          style={{
                            background: done ? stage.color : "#F1EFE8",
                            opacity: done ? 1 : 0.4,
                          }}>
                          <stage.icon size={13} color={done ? "#fff" : "#8B8D85"} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className={`flex-1 pb-6 ${done ? "" : "opacity-40"}`}>
                        <p className="text-sm font-semibold" style={{ color: done ? "#1C1C1A" : "#8B8D85" }}>
                          {stage.label}
                        </p>
                        {latestEvent && (
                          <p className="text-xs text-[#8B8D85] mt-0.5">{latestEvent.description}</p>
                        )}
                        {latestEvent?.location && (
                          <p className="text-xs text-[#8B8D85] flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {latestEvent.location}
                          </p>
                        )}
                        {latestEvent && (
                          <p className="text-xs text-[#C4C2BA] mt-0.5">{tglFormat(latestEvent.occurred_at)}</p>
                        )}

                        {/* Bukti pengiriman (delivered stage) */}
                        {stage.key === "delivered" && done && (
                          <div className="mt-3 p-3 bg-[#F0FFF4] border border-[#BFE6C2] rounded-xl">
                            {order.delivery_recipient_name && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <User size={13} className="text-[#166534]" />
                                <span className="text-xs font-medium text-[#166534]">
                                  Diterima oleh: {order.delivery_recipient_name}
                                </span>
                              </div>
                            )}
                            {order.delivery_photo_url && (
                              <img
                                src={order.delivery_photo_url}
                                alt="Bukti penerimaan"
                                className="w-full rounded-lg object-cover max-h-48"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA setelah delivered */}
              {isDelivered && (
                <div className="flex gap-2 mt-2 pt-4 border-t border-[#F1EFE8]">
                  {!review && !reviewDone && (
                    <button
                      onClick={() => setActiveSection("ulasan")}
                      className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-[#F5B93F] text-[#92400E] bg-[#FEF9C3] flex items-center justify-center gap-1.5"
                    >
                      <Star size={13} /> Beri Ulasan
                    </button>
                  )}
                  <button
                    onClick={() => window.location.href = `/${store.slug}`}
                    className="flex-1 py-2.5 text-xs font-medium rounded-xl bg-[#D85A30] text-white flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart size={13} /> Beli Lagi
                  </button>
                </div>
              )}
            </div>

            {/* Complaint / Return status */}
            {complaint && (
              <div className="bg-[#FBEAEA] rounded-2xl border border-[#F0BEBE] p-4">
                <p className="text-sm font-bold text-[#A32D2D] mb-1 flex items-center gap-2">
                  <AlertTriangle size={15} /> Komplain Diajukan
                </p>
                <p className="text-xs text-[#A32D2D]">Status: <strong>{complaint.status}</strong></p>
                {complaint.resolution && <p className="text-xs text-[#A32D2D] mt-1">Resolusi: {complaint.resolution}</p>}
              </div>
            )}
            {ret && (
              <div className="bg-[#DBEAFE] rounded-2xl border border-[#93C5FD] p-4">
                <p className="text-sm font-bold text-[#1E40AF] mb-1 flex items-center gap-2">
                  <RotateCcw size={15} /> Return Diajukan
                </p>
                <p className="text-xs text-[#1E40AF]">Status: <strong>{ret.status}</strong></p>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT ─────────────────────────────────────────── */}
        {activeSection === "chat" && (
          <div className="flex flex-col h-[65vh]">
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {chats.length === 0 && !botSending ? (
                <div className="text-center py-10">
                  <MessageCircle size={28} className="mx-auto mb-2 text-[#E5E2D9]" />
                  <p className="text-sm text-[#8B8D85]">Memuat pesan...</p>
                </div>
              ) : chats.map((c) => (
                <div key={c.id} className={`flex ${c.sender_type === "buyer" ? "justify-end" : "justify-start"}`}>
                  {c.sender_type === "bot" ? (
                    // Pesan bot: desain khusus dengan ikon robot
                    <div className="max-w-[85%] bg-[#F1EFE8] border border-[#E5E2D9] rounded-2xl rounded-bl-sm px-4 py-2.5">
                      <p className="text-[10px] font-bold text-[#8B8D85] mb-1 flex items-center gap-1">
                        🤖 Pesan Otomatis
                      </p>
                      <p className="text-sm text-[#1C1C1A] whitespace-pre-line">{c.message}</p>
                      <p className="text-[10px] text-[#8B8D85] mt-1">
                        {new Date(c.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ) : (
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      c.sender_type === "buyer"
                        ? "bg-[#D85A30] text-white rounded-br-sm"
                        : "bg-white border border-[#E5E2D9] text-[#1C1C1A] rounded-bl-sm"
                    }`}>
                      {c.sender_type === "seller" && (
                        <p className="text-[10px] font-bold mb-1" style={{ color: accentColor }}>{store.name}</p>
                      )}
                      <p className="text-sm">{c.message}</p>
                      <p className={`text-[10px] mt-1 ${c.sender_type === "buyer" ? "text-white/60" : "text-[#8B8D85]"}`}>
                        {new Date(c.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* ── FAQ Quick Replies ─────────────────────────── */}
            {templates.filter((t) => t.type === "faq").length > 0 && (
              <div className="pt-3 border-t border-[#F1EFE8]">
                <p className="text-[10px] text-[#8B8D85] mb-2 font-medium uppercase tracking-wider">
                  Pertanyaan umum
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {templates.filter((t) => t.type === "faq").map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleFAQ(t)}
                      disabled={botSending}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#E5E2D9] bg-white hover:border-[#D85A30] hover:text-[#D85A30] transition-colors disabled:opacity-50 text-left"
                    >
                      {t.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {botSending && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex gap-1">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-[#8B8D85] rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-xs text-[#8B8D85]">Mengetik balasan...</span>
              </div>
            )}

            <form onSubmit={kirimChat} className="flex gap-2 pt-3 border-t border-[#E5E2D9]">
              <input
                type="text"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                placeholder="Ketik pesan..."
                className="flex-1 px-4 py-2.5 border border-[#E5E2D9] rounded-2xl text-sm focus:outline-none focus:border-[#D85A30]"
              />
              <button type="submit" disabled={sendingChat || !chatMsg.trim()}
                className="w-10 h-10 rounded-2xl bg-[#D85A30] flex items-center justify-center disabled:opacity-40">
                <Send size={16} color="white" />
              </button>
            </form>
          </div>
        )}

        {/* ── ULASAN ───────────────────────────────────────── */}
        {activeSection === "ulasan" && (
          <div className="bg-white rounded-2xl border border-[#E5E2D9] p-5">
            {reviewDone || review ? (
              <div className="text-center py-6">
                <CheckCircle2 size={36} className="mx-auto mb-3 text-[#3B6D11]" />
                <p className="font-bold text-[#1C1C1A] mb-1">Terima kasih atas ulasannya!</p>
                <div className="flex justify-center gap-1 mt-2">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={18} className={s <= (review?.rating || rating) ? "text-[#F5B93F] fill-[#F5B93F]" : "text-[#E5E2D9]"} />
                  ))}
                </div>
                {review?.review_text && <p className="text-sm text-[#5B6472] mt-2 italic">"{review.review_text}"</p>}
              </div>
            ) : order.status !== "selesai" ? (
              <div className="text-center py-6">
                <p className="text-sm text-[#8B8D85]">Ulasan bisa diberikan setelah pesanan selesai diterima.</p>
              </div>
            ) : (
              <form onSubmit={submitReview} className="space-y-4">
                <h2 className="font-bold text-[#1C1C1A]">Beri ulasan produk</h2>
                <div className="flex items-center gap-2 py-2">
                  {[1,2,3,4,5].map((s) => (
                    <button type="button" key={s} onClick={() => setRating(s)}>
                      <Star size={30} className={s <= rating ? "text-[#F5B93F] fill-[#F5B93F]" : "text-[#E5E2D9]"} />
                    </button>
                  ))}
                  <span className="text-sm text-[#8B8D85] ml-2">
                    {["","Jelek","Kurang","Lumayan","Bagus","Sangat Bagus"][rating]}
                  </span>
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Ceritakan pengalamanmu (opsional)..."
                  rows={4}
                  className="w-full px-4 py-3 border border-[#E5E2D9] rounded-xl text-sm focus:outline-none focus:border-[#D85A30] resize-none"
                />
                <button type="submit" disabled={!rating || submittingReview}
                  className="w-full py-3 bg-[#D85A30] text-white rounded-xl font-medium disabled:opacity-50">
                  {submittingReview ? "Mengirim..." : "Kirim Ulasan"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── KOMPLAIN ─────────────────────────────────────── */}
        {activeSection === "komplain" && (
          <div className="space-y-4">
            {complaint ? (
              <div className="bg-white rounded-2xl border border-[#E5E2D9] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-[#D85A30]" />
                  <h2 className="font-bold text-[#1C1C1A]">Komplain Diajukan</h2>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8B8D85]">Jenis</span>
                    <span className="font-medium text-[#1C1C1A]">{COMPLAINT_TYPES.find((t) => t.value === complaint.type)?.label || complaint.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8B8D85]">Status</span>
                    <span className={`font-medium ${complaint.status === "selesai" ? "text-[#166534]" : "text-[#B8860B]"}`}>
                      {complaint.status === "open" ? "Menunggu respons" : complaint.status === "proses" ? "Sedang diproses" : complaint.status === "selesai" ? "Selesai" : "Ditolak"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="text-[#8B8D85]">Deskripsi</p>
                    <p className="text-[#1C1C1A] mt-1">{complaint.description}</p>
                  </div>
                  {complaint.resolution && (
                    <div className="mt-3 p-3 bg-[#EAF1E8] rounded-xl">
                      <p className="text-xs font-bold text-[#166534] mb-1">Resolusi dari penjual:</p>
                      <p className="text-sm text-[#1C1C1A]">{complaint.resolution}</p>
                    </div>
                  )}
                </div>

                {complaint.involves_cs && (
                  <div className="mt-4 p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE]">
                    <p className="text-xs font-bold text-[#1E40AF] mb-1">CS Tokku.id dilibatkan</p>
                    <p className="text-xs text-[#1E40AF]">Tim kami akan menghubungi kamu via WhatsApp dalam 1×24 jam.</p>
                    <a href="https://wa.me/6281234567890?text=Halo+CS+Tokku.id%2C+saya+ingin+melaporkan+komplain+pesanan+{orderId}"
                      target="_blank"
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#1E40AF] underline"
                    >
                      Chat langsung ke CS Tokku.id →
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E2D9] p-5">
                <h2 className="font-bold text-[#1C1C1A] mb-1">Ajukan Komplain</h2>
                <p className="text-xs text-[#8B8D85] mb-5">Sampaikan masalahmu dan penjual akan merespons segera.</p>

                <form onSubmit={submitComplaint} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block mb-2">
                      Jenis Masalah
                    </label>
                    <div className="space-y-2">
                      {COMPLAINT_TYPES.map((t) => (
                        <label key={t.value}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            complaintType === t.value ? "border-[#D85A30] bg-[#FAECE7]" : "border-[#E5E2D9]"
                          }`}>
                          <input type="radio" name="complaintType" value={t.value}
                            checked={complaintType === t.value}
                            onChange={() => setComplaintType(t.value)}
                            className="accent-[#D85A30]" />
                          <span className="text-sm text-[#1C1C1A]">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      required value={complaintDesc} onChange={(e) => setComplaintDesc(e.target.value)}
                      placeholder="Jelaskan masalah yang kamu alami secara detail..."
                      rows={4}
                      className="w-full px-4 py-3 border border-[#E5E2D9] rounded-xl text-sm focus:outline-none focus:border-[#D85A30] resize-none"
                    />
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E2D9] cursor-pointer">
                    <input type="checkbox" checked={involvesCs} onChange={(e) => setInvolvesCs(e.target.checked)}
                      className="mt-0.5 accent-[#D85A30]" />
                    <div>
                      <p className="text-sm font-medium text-[#1C1C1A]">Libatkan CS Tokku.id</p>
                      <p className="text-xs text-[#8B8D85]">Pilih ini jika tidak ada respons dari penjual atau perlu mediasi.</p>
                    </div>
                  </label>

                  <button type="submit" disabled={!complaintType || !complaintDesc || submittingComplaint}
                    className="w-full py-3 bg-[#D85A30] text-white rounded-xl font-medium disabled:opacity-50">
                    {submittingComplaint ? "Mengirim..." : "Kirim Komplain"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── RETURN ───────────────────────────────────────── */}
        {activeSection === "return" && (
          <div className="bg-white rounded-2xl border border-[#E5E2D9] p-5">
            {ret ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <RotateCcw size={18} className="text-[#3B82F6]" />
                  <h2 className="font-bold text-[#1C1C1A]">Status Return</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8B8D85]">Alasan</span>
                    <span className="font-medium text-[#1C1C1A]">{RETURN_REASONS.find((r) => r.value === ret.reason)?.label || ret.reason}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8D85]">Status</span>
                    <span className={`font-medium ${ret.status === "disetujui" ? "text-[#166534]" : ret.status === "ditolak" ? "text-[#A32D2D]" : "text-[#B8860B]"}`}>
                      {ret.status === "pending" ? "Menunggu respons penjual" : ret.status === "disetujui" ? "Disetujui" : "Ditolak"}
                    </span>
                  </div>
                  {ret.seller_notes && (
                    <div className="mt-3 p-3 bg-[#F1EFE8] rounded-xl">
                      <p className="text-xs font-bold text-[#5B6472] mb-1">Catatan dari penjual:</p>
                      <p className="text-sm">{ret.seller_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : order.status !== "selesai" ? (
              <div className="text-center py-6">
                <p className="text-sm text-[#8B8D85]">Return hanya bisa diajukan setelah pesanan diterima.</p>
              </div>
            ) : (
              <form onSubmit={submitReturn} className="space-y-4">
                <h2 className="font-bold text-[#1C1C1A] mb-1">Ajukan Pengembalian</h2>
                <p className="text-xs text-[#8B8D85] mb-2">Pilih alasan return dan penjual akan menindaklanjutinya.</p>

                <div>
                  <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block mb-2">Alasan Return</label>
                  <div className="space-y-2">
                    {RETURN_REASONS.map((r) => (
                      <label key={r.value}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                          returnReason === r.value ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-[#E5E2D9]"
                        }`}>
                        <input type="radio" name="returnReason" value={r.value}
                          checked={returnReason === r.value} onChange={() => setReturnReason(r.value)}
                          className="accent-[#3B82F6]" />
                        <span className="text-sm text-[#1C1C1A]">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <textarea
                  value={returnDesc} onChange={(e) => setReturnDesc(e.target.value)}
                  placeholder="Detail tambahan (opsional)..."
                  rows={3}
                  className="w-full px-4 py-3 border border-[#E5E2D9] rounded-xl text-sm focus:outline-none focus:border-[#3B82F6] resize-none"
                />

                <button type="submit" disabled={!returnReason || submittingReturn}
                  className="w-full py-3 bg-[#3B82F6] text-white rounded-xl font-medium disabled:opacity-50">
                  {submittingReturn ? "Mengirim..." : "Ajukan Return"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
