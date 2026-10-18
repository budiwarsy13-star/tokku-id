// Pilih penyedia pembayaran untuk langganan lewat env BILLING_PROVIDER ("midtrans" default | "xendit").
// Menambah penyedia lain (mis. DOKU) = bikin 1 file adapter dengan bentuk balikan yang sama:
// { provider, token?, redirectUrl?, providerRef? } lalu daftarkan di bawah.
import { buatTagihanMidtrans } from "@/lib/billing/midtrans";
import { buatTagihanXendit } from "@/lib/billing/xendit";

export function providerAktif() {
  return process.env.BILLING_PROVIDER === "xendit" ? "xendit" : "midtrans";
}

export async function buatTagihan(params) {
  return providerAktif() === "xendit" ? buatTagihanXendit(params) : buatTagihanMidtrans(params);
}
