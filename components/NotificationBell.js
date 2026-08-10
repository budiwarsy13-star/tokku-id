"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, ShoppingBag, Wallet, AlertTriangle, Truck, CheckCircle2 } from "lucide-react";

const ICON_BY_TYPE = {
  order_masuk: { icon: ShoppingBag, color: "#2563EB" },
  pembayaran_masuk: { icon: Wallet, color: "#3B6D11" },
  order_pending: { icon: AlertTriangle, color: "#B8860B" },
  delivery_update: { icon: Truck, color: "#2563EB" },
  pesanan_selesai: { icon: CheckCircle2, color: "#5B6472" },
};

function waktuRelatif(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const menit = Math.floor(diffMs / 60000);
  if (menit < 1) return "Baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

export default function NotificationBell({ storeId }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    if (!storeId) return;

    async function fetchNotifs() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifs(data || []);
      setLoading(false);
    }
    fetchNotifs();

    // Realtime: notif baru langsung muncul tanpa refresh
    const channel = supabase
      .channel(`notifications-${storeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `store_id=eq.${storeId}` },
        (payload) => setNotifs((prev) => [payload.new, ...prev])
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [storeId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  async function markAllRead() {
    if (unreadCount === 0) return;
    const unreadIds = notifs.filter((n) => !n.is_read).map((n) => n.id);
    setNotifs(notifs.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  }

  function toggleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) markAllRead();
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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#E5E2D9] shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-[#E5E2D9] sticky top-0 bg-white">
            <h3 className="font-bold text-sm text-[#1C1C1A]">Notifikasi</h3>
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
                return (
                  <div key={n.id} className={`flex gap-3 px-4 py-3 ${!n.is_read ? "bg-[#FAECE7]/40" : ""}`}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${meta.color}1A` }}
                    >
                      <Icon size={15} style={{ color: meta.color }} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1C1C1A]">{n.title}</p>
                      <p className="text-xs text-[#5B6472] mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-[#8B8D85] mt-1">{waktuRelatif(n.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
