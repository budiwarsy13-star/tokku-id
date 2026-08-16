// Cart disimpan di localStorage, di-scope per slug toko (biar cart toko A gak
// nyampur sama cart toko B). Ini murni client-side, gak ada tabel database buat
// cart — baru "jadi order beneran" pas checkout selesai.

function cartKey(slug) {
  return `tokku_cart_${slug}`;
}

export function getCart(slug) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(cartKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(slug, cart) {
  if (typeof window === "undefined") return;
  localStorage.setItem(cartKey(slug), JSON.stringify(cart));
}

// itemKey dipakai buat bedain produk yang sama tapi varian beda
export function itemKey(productId, variantName) {
  return `${productId}::${variantName || "_"}`;
}

export function addToCart(slug, product, variant, quantity) {
  const cart = getCart(slug);
  const key = itemKey(product.id, variant?.name);
  const existing = cart.find((i) => i.key === key);
  const maxStock = variant ? variant.stock : product.stock;

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, maxStock ?? 999);
  } else {
    cart.push({
      key,
      productId: product.id,
      variantName: variant?.name || null,
      name: variant ? `${product.name} - ${variant.name}` : product.name,
      price: variant ? variant.price : product.price,
      image: product.images?.[0] || null,
      weight: product.weight || 1000,
      quantity: Math.min(quantity, maxStock ?? 999),
      maxStock: maxStock ?? 999,
    });
  }
  saveCart(slug, cart);
  return cart;
}

export function updateCartQty(slug, key, quantity) {
  const cart = getCart(slug);
  const item = cart.find((i) => i.key === key);
  if (!item) return cart;
  if (quantity <= 0) {
    return removeFromCart(slug, key);
  }
  item.quantity = Math.min(quantity, item.maxStock ?? 999);
  saveCart(slug, cart);
  return cart;
}

export function removeFromCart(slug, key) {
  const cart = getCart(slug).filter((i) => i.key !== key);
  saveCart(slug, cart);
  return cart;
}

export function clearCart(slug) {
  saveCart(slug, []);
}

export function cartTotalItems(cart) {
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartTotalWeight(cart) {
  return cart.reduce((sum, i) => sum + i.weight * i.quantity, 0);
}