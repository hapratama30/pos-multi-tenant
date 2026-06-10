/**
 * Calculate tax for POS checkout.
 * @returns {{ subtotal, taxAmount, total }}
 */
export function calculateTax(subtotal, { enabled, rate = 11, inclusive = false }) {
  const base = Number(subtotal) || 0;
  if (!enabled || !rate) {
    return { subtotal: base, taxAmount: 0, total: base };
  }
  const r = Number(rate) / 100;
  if (inclusive) {
    const taxAmount = Math.round(base - base / (1 + r));
    return { subtotal: base - taxAmount, taxAmount, total: base };
  }
  const taxAmount = Math.round(base * r);
  return { subtotal: base, taxAmount, total: base + taxAmount };
}

export function formatRp(n) {
  return `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;
}
