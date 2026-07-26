import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
import "./globals.css";



export const metadata = {
  title: "tokku.id — Jualan Langsung Tanpa Potongan Marketplace",
  description: "Bikin halaman checkout brand kamu dalam menit. Ongkir otomatis, pixel iklan siap, tanpa bayar komisi ke siapapun.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
