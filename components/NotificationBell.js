"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bell, ShoppingBag, Wallet, AlertTriangle,
  Truck, CheckCircle2, MessageCircle, RotateCcw
} from "lucide-react";

const ICON_BY_TYPE = {
  order_masuk:      { icon: ShoppingBag,   color: "#2563EB" },
  pembayaran_masuk: { icon: Wallet,        color: "#3B6D11" },
  order_pending:    { icon: AlertTriangle, color: "#B8860B" },
  delivery_update:  { icon: Truck,         color: "#2563EB" },
  pesanan_selesai:  { icon: CheckCircle2,  color: "#5B6472" },
  chat_masuk:       { icon: MessageCircle, color: "#7C3AED" },
  complaint:        { icon: AlertTriangle, color: "#DC2626" },
  return_request:   { icon: RotateCcw,     color: "#0369A1" },
};

function waktuRelatif(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return "Baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function NotificationBell({ storeId }) {
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    if (!storeId) return;

    // Fetch awal
    supabase
      .from("notifications")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => { setNotifs(data || []); setLoading(false); });

    // ── KEY FIX: TIDAK pakai filter di postgres_changes ──────
    // Filter by store_id dilakukan client-side karena filter non-PK
    // pada postgres_changes sering gagal tanpa REPLICA IDENTITY FULL
    // yang di-set secara konsisten. Ini pattern yang sama dengan
    // unread badge yang sudah terbukti bekerja.
    const channel = supabase
      .channel(`notif-bell-${storeId}-v2`)  // versi baru agar tidak konflik channel lama
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "notifications",
        // SENGAJA tidak ada filter — saring client-side di bawah
      }, (payload) => {
        const n = payload.new;
        if (!n || n.store_id !== storeId) return; // filter client-side
        setNotifs((prev) => [n, ...prev]);

        // Bunyi / getar di mobile via Notification API jika tab tidak fokus
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          new Notification(n.title || "Notifikasi baru", {
            body: n.message?.slice(0, 80),
            icon: "/favicon.ico",
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [storeId]);

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  async function markAllRead() {
    if (unreadCount === 0) return;
    const ids = notifs.filter((n) => !n.is_read).map((n) => n.id);
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) markAllRead();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-lg hover:bg-[#F1EFE8] transition-colors"
        aria-label="Notifikasi"
      >
        <Bell size={20} className="text-[#5B6472]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-[#D85A30] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#E5E2D9] shadow-xl z-50 max-h-[420px] overflow-y-auto">
          <div className="px-4 py-3 border-b border-[#E5E2D9] sticky top-0 bg-white flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#1C1C1A]">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-[#D85A30]">{unreadCount} belum dibaca</span>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-[#8B8D85] text-center py-8">Memuat...</p>
          ) : notifs.length === 0 ? (
            <p className="text-sm text-[#8B8D85] text-center py-8">Belum ada notifikasi.</p>
          ) : (
            <div className="divide-y divide-[#F1EFE8]">
              {notifs.map((n) => {
                const meta = ICON_BY_TYPE[n.type] || ICON_BY_TYPE.order_masuk;
                const Icon = meta.icon;
                const El = n.url ? "a" : "div";
                return (
                  <El key={n.id} href={n.url || undefined}
                    className={`flex gap-3 px-4 py-3 transition-colors ${!n.is_read ? "bg-[#FAECE7]/40" : ""} ${n.url ? "hover:bg-[#F9F7F5] cursor-pointer" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${meta.color}1A` }}>
                      <Icon size={15} style={{ color: meta.color }} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1C1C1A] line-clamp-1">{n.title}</p>
                      <p className="text-xs text-[#5B6472] mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-[#8B8D85] mt-1">{waktuRelatif(n.created_at)}</p>
                    </div>
                  </El>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
