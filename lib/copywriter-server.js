// lib/copywriter-server.js
import { mintaJSON } from "@/lib/ai-provider";

const SYSTEM_PROMPT = `Kamu adalah copywriter e-commerce Indonesia yang berpengalaman bikin listing produk yang konversinya tinggi buat UMKM/brand kecil.

ATURAN:
- Balas HANYA dengan JSON valid, tanpa markdown, tanpa teks pembuka/penutup apapun.
- Bahasa Indonesia yang natural, sesuai gaya jualan online (bukan kaku formal).
- Jangan mengarang klaim yang gak masuk akal (misal "terbukti klinis", "nomor 1 di Indonesia") kalau gak dikasih tau datanya.
- Fokus ke manfaat buat pembeli, bukan cuma spesifikasi teknis.

Schema JSON yang WAJIB kamu balas:
{
  "judul": "judul produk yang menarik & SEO-friendly, maks 70 karakter",
  "deskripsi": "deskripsi lengkap produk, 3-5 kalimat",
  "keunggulan": ["poin keunggulan singkat", "...", "... (3-5 poin)"],
  "caption_instagram": "caption buat story/feed IG, santai, ada call-to-action, boleh emoji secukupnya",
  "caption_tiktok": "caption pendek buat TikTok, catchy, hook di kalimat pertama",
  "caption_whatsapp": "pesan broadcast WA ke pelanggan, singkat & to the point, ada link placeholder [LINK]",
  "hashtags": ["#hashtag1", "#hashtag2", "... (5-8 hashtag relevan)"]
}`;

// `notes` = catatan bebas dari seller (bahan baku, ukuran, target pembeli, dll)
// `imageUrl` = opsional, salah satu foto produk yang udah diupload — kalau ada,
// AI "liat" produknya langsung, hasil lebih akurat daripada modal nama doang.
export async function generateCopywriting({ name, category, notes, imageUrl }) {
  const text = [
    `Nama produk: ${name}`,
    category ? `Kategori: ${category}` : null,
    notes ? `Catatan tambahan dari penjual: ${notes}` : null,
    "Buatkan listing produk lengkap sesuai schema JSON yang udah ditentukan.",
  ].filter(Boolean).join("\n");

  return mintaJSON({ systemPrompt: SYSTEM_PROMPT, text, imageUrl, maxTokens: 1024 });
}
