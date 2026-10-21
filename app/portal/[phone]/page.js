// Link lama /portal/<nomor-wa>. Daftar pesanan sekarang butuh verifikasi email, jadi
// route ini cuma mengarahkan ke /portal (dan nomor WA di URL tidak dipakai lagi).
import { redirect } from "next/navigation";

export default function PortalLama() {
  redirect("/portal");
}
