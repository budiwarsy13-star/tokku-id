"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard, Package, ShoppingBag, Store,
  LogOut, Tag, Menu, X, Palette
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Ringkasan",       href: "/dashboard" },
  { icon: Package,         label: "Produk",          href: "/dashboard/produk" },
  { icon: ShoppingBag,     label: "Pesanan",         href: "/dashboard/pesanan" },
  { icon: Tag,             label: "Diskon",          href: "/dashboard/diskon" },
  { icon: Palette,         label: "Tampilan",        href: "/dashboard/tampilan" },
  { icon: Store,           label: "Pengaturan toko", href: "/dashboard/toko" },
];

export default function DashboardLayout({ store, activeMenu, children, headerTitle, headerRight }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setDrawerOpen(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const SidebarContent = () => (
    <>
      <div className="px-6 py-5 border-b border-[#E5E2D9] flex items-center justify-between">
        <a href="/dashboard">
          <span className="font-bold text-xl tracking-tight text-[#1C1C1A]">
            tok<span className="text-[#D85A30]">k</span>u
            <span className="text-[#8B8D85] font-normal">.id</span>
          </span>
        </a>
        <button onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-1 rounded-lg text-[#8B8D85] hover:bg-[#F1EFE8]">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeMenu === item.href;
          return (
            <a key={item.label} href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                isActive ? "bg-[#FAECE7] text-[#D85A30] font-semibold"
                         : "text-[#5B6472] hover:bg-[#F1EFE8]"
              }`}>
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#E5E2D9]">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#5B6472] hover:bg-[#F1EFE8] w-full">
          <LogOut size={18} strokeWidth={1.75} /> Keluar
        </button>
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-[#FAFAF7] font-[family-name:var(--font-baloo)] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-[#E5E2D9] flex-col fixed h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setDrawerOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-screen w-72 bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 lg:hidden ${
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-60 min-w-0">
        <header className="bg-white border-b border-[#E5E2D9] px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#5B6472] hover:bg-[#F1EFE8]">
              <Menu size={20} />
            </button>
            {headerTitle ? (
              <h1 className="text-lg font-bold text-[#1C1C1A] truncate">{headerTitle}</h1>
            ) : (
              <div className="min-w-0">
                <p className="text-xs text-[#8B8D85]">Toko kamu</p>
                <h1 className="font-bold text-[#1C1C1A] truncate">{store?.name}</h1>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {store?.slug && !headerTitle && (
              <a href={`/${store.slug}`} target="_blank"
                className="hidden sm:block text-xs text-[#D85A30] bg-[#FAECE7] px-3 py-1.5 rounded-lg hover:bg-[#F5D8CD] transition-colors">
                tokku.id/{store.slug}
              </a>
            )}
            {headerRight}
            {store?.id && <NotificationBell storeId={store.id} />}
          </div>
        </header>

        <div className="p-4 lg:p-8">{children}</div>
      </div>
    </main>
  );
}
