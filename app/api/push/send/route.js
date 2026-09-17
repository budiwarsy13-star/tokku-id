// Endpoint ini SENGAJA dinonaktifkan — return 410 Gone untuk semua method.
// Sebelumnya endpoint ini adalah celah keamanan kritis: publik tanpa
// autentikasi, siapapun bisa kirim push notification ke toko manapun.
const response = () => Response.json({ error: "Endpoint ini sudah dihapus." }, { status: 410 });
export const GET = response;
export const POST = response;
export const PUT = response;
export const DELETE = response;
export const PATCH = response;
