// lib/ai-provider.js
//
// SATU pintu masuk buat semua fitur AI di tokku.id. copywriter-server.js &
// insight-server.js manggil `mintaJSON` dari sini doang, gak perlu tau lagi
// di baliknya Gemini atau Claude yang jalan.
//
// Sekarang default-nya GEMINI (gratis, gak perlu kartu kredit) biar bisa
// mulai testing tanpa modal. Begitu ada budget dan mau kualitas lebih bagus,
// tinggal ganti env var:
//   AI_PROVIDER=claude
//   ANTHROPIC_API_KEY=sk-ant-...
// TIDAK perlu ubah kode di copywriter-server.js / insight-server.js sama sekali.

import { urlKeBase64Image } from "@/lib/image-utils";

const PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

export async function mintaJSON({ systemPrompt, text, imageUrl, maxTokens = 1024 }) {
  let image = null;
  if (imageUrl) {
    try {
      image = await urlKeBase64Image(imageUrl);
    } catch {
      // Gagal ambil gambar (URL mati/timeout) BUKAN alasan gagalin generate —
      // lanjut pakai teks doang.
    }
  }

  if (PROVIDER === "claude") return mintaJSONClaude({ systemPrompt, text, image, maxTokens });
  return mintaJSONGemini({ systemPrompt, text, image, maxTokens });
}

// ---- GEMINI (default, gratis via Google AI Studio) ----
async function mintaJSONGemini({ systemPrompt, text, image, maxTokens }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum di-set di environment variables.");
  }
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const parts = [];
  if (image) parts.push({ inline_data: { mime_type: image.mediaType, data: image.base64 } });
  parts.push({ text });

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    // Gemini bisa dipaksa balas JSON murni lewat responseMimeType — lebih
    // reliable daripada cuma ngandelin instruksi teks doang.
    generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" },
  });

  // Model gratis (Flash) kadang kena 503 "overloaded" pas lagi rame dipakai
  // developer lain di seluruh dunia — ini SEMENTARA, bukan error permanen.
  // Coba ulang otomatis 3x dengan jeda sebelum beneran nyerah, biar seller
  // gak harus manual klik generate berkali-kali sendiri.
  const MAX_PERCOBAAN = 2; // dikecilin dari 3 — retry yang kebanyakan malah boros kuota harian gratis
  let errorTerakhir;

  for (let percobaan = 1; percobaan <= MAX_PERCOBAAN; percobaan++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );

    if (res.status === 503 && percobaan < MAX_PERCOBAAN) {
      errorTerakhir = "Model lagi overload, coba ulang otomatis...";
      await new Promise((r) => setTimeout(r, percobaan * 1500)); // jeda 1.5s, lalu 3s
      continue;
    }

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();
    const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) {
      throw new Error("Gemini gak ngebalas apa-apa (kemungkinan kena safety filter, coba ubah catatan produknya).");
    }
    return parseJSONAman(textOut);
  }

  throw new Error(`Gemini lagi sibuk banget, coba lagi sebentar lagi. (${errorTerakhir})`);
}

// ---- CLAUDE (opsional, aktifin nanti kalau udah ada budget) ----
async function mintaJSONClaude({ systemPrompt, text, image, maxTokens }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY belum di-set di environment variables.");
  }
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-5";

  const contentBlocks = [];
  if (image) contentBlocks.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
  contentBlocks.push({ type: "text", text });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: "user", content: contentBlocks }] }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Claude gak ngebalas teks.");

  return parseJSONAman(textBlock.text);
}

function parseJSONAman(rawText) {
  const cleaned = rawText.replace(/```json\s*|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Balasan AI bukan JSON valid, coba generate ulang.");
  }
}