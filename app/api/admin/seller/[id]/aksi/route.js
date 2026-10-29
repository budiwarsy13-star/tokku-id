import { dengan, kirim } from "@/lib/admin-http";
import { aksiSeller } from "@/lib/admin-aksi";

export const POST = dengan(
  { izinAksi: { tangguhkan: "seller.tangguhkan", aktifkan: "seller.tangguhkan", set_paket: "seller.paket", cabut_paket: "seller.paket", verifikasi: "seller.verifikasi", cabut_verifikasi: "seller.verifikasi" } },
  async ({ params, body, db, admin, ip, ua }) =>
    kirim(await aksiSeller({ db, admin, storeId: params.id, aksi: body.aksi, alasan: body.alasan, hari: body.hari, ip, ua }))
);
