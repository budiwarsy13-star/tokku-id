// lib/image-utils.js
export async function urlKeBase64Image(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Gagal ambil gambar produk.");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { mediaType: contentType.split(";")[0], base64: buffer.toString("base64") };
}
