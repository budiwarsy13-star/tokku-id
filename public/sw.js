// Service worker buat push notification. File ini HARUS di /public (root),
// bukan di dalam /app, biar scope-nya kena seluruh domain.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "tokku.id", message: event.data ? event.data.text() : "" };
  }

  const title = data.title || "tokku.id";
  const options = {
    body: data.message || "",
    tag: data.orderId || undefined, // notif dgn tag sama saling nge-replace, gak numpuk
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Pas notifikasi diklik, buka/fokus tab tokku.id yang relevan
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
