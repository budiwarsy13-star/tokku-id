import { dengan, kirim } from "@/lib/admin-http";
import { sinkronLangganan } from "@/lib/admin-aksi";

// Satu-satunya aksi: SINKRON ke Midtrans. Tidak ada "konfirmasi manual": status ditentukan Midtrans,
// bukan admin, jadi tidak ada jalur untuk memberi paket gratis lewat tombol konfirmasi.
export const POST = dengan({ izinAksi: { sinkron: "langganan.sinkron" } }, async ({ body, db, admin, ip, ua }) =>
  kirim(await sinkronLangganan({ db, admin, orderId: body.orderId, ip, ua }))
);
