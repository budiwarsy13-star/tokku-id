// Seluruh area /admin: jangan diindeks mesin pencari, jangan di-cache.
export const metadata = {
  title: "tokku.id admin",
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
};
export default function AdminLayout({ children }) {
  return children;
}
