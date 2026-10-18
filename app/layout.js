import localFont from "next/font/local";

// Font di-host sendiri (bukan next/font/google): build tidak perlu mengunduh apa pun dari
// Google Fonts, jadi tidak bisa gagal gara-gara jaringan/Turbopack saat deploy.
// Plus Jakarta Sans (OFL-1.1), varian variable, subset latin, bobot 200-800.
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-latin-variable.woff2",
  variable: "--font-baloo",
  weight: "200 800",
  display: "swap",
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
