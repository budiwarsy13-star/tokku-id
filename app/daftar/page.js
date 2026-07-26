"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Daftar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDaftar(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("Gagal daftar: " + error.message);
    } else {
      setMessage("Berhasil! Cek email kamu buat konfirmasi akun.");
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6 font-[family-name:var(--font-baloo)]">
      <div className="w-full max-w-sm">
        <a href="/" className="font-bold text-2xl tracking-tight text-[#1C1C1A] block text-center mb-8">
          tok<span className="text-[#D85A30]">k</span>u<span className="text-[#8B8D85] font-normal">.id</span>
        </a>

        <div className="bg-white rounded-xl border border-[#E5E2D9] p-6">
          <h1 className="text-xl font-bold text-[#1C1C1A] mb-1">Daftar Gratis</h1>
          <p className="text-sm text-[#8B8D85] mb-6">Mulai jualan tanpa potongan marketplace.</p>

          <form onSubmit={handleDaftar} className="space-y-4">
            <div>
              <label className="text-sm text-[#5B6472] block mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
                placeholder="kamu@email.com"
              />
            </div>
            <div>
              <label className="text-sm text-[#5B6472] block mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-[#E5E2D9] rounded-lg text-sm focus:outline-none focus:border-[#D85A30]"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D85A30] text-white rounded-lg font-medium hover:bg-[#B84A25] transition-colors disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </form>

          {message && (
            <p className="text-sm text-center mt-4 text-[#5B6472]">{message}</p>
          )}

          <p className="text-sm text-center text-[#8B8D85] mt-6">
            Sudah punya akun?{" "}
            <a href="/masuk" className="text-[#D85A30] font-medium">
              Masuk
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}