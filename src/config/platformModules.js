/** Katalog modul platform — dikontrol Super Admin per tenant */

export const MODULE_CATEGORIES = [
  {
    id: 'core',
    label: 'Modul Inti',
    desc: 'Fitur utama POS & operasional toko',
  },
  {
    id: 'finance',
    label: 'Keuangan & Laporan',
    desc: 'Analitik, pengeluaran, pembayaran digital',
  },
  {
    id: 'operations',
    label: 'Operasional',
    desc: 'Multi-outlet, shift, stok lanjutan',
  },
];

export const ALL_MODULES = [
  { id: 'pos', label: 'Kasir POS', icon: '⚡', category: 'core', minPlan: 'free', desc: 'Transaksi & checkout' },
  { id: 'history', label: 'Riwayat Transaksi', icon: '📜', category: 'core', minPlan: 'free', desc: 'Arsip penjualan' },
  { id: 'catalog', label: 'Katalog Produk', icon: '📦', category: 'core', minPlan: 'free', desc: 'Produk & kategori' },
  { id: 'variants', label: 'Varian Produk', icon: '🏷️', category: 'core', minPlan: 'pro', desc: 'Topping, size, ekstra' },
  { id: 'customers', label: 'Member & Pelanggan', icon: '👥', category: 'core', minPlan: 'pro', desc: 'Database pelanggan & poin' },
  { id: 'staff', label: 'Manajemen Staff', icon: '🧑‍💼', category: 'core', minPlan: 'free', desc: 'Role & permission' },
  { id: 'settings', label: 'Pengaturan Toko', icon: '⚙️', category: 'core', minPlan: 'free', desc: 'Profil bisnis & printer' },
  { id: 'reports', label: 'Laporan & Analitik', icon: '📊', category: 'finance', minPlan: 'pro', desc: 'Omzet, laba, grafik' },
  { id: 'expenses', label: 'Pengeluaran', icon: '💸', category: 'finance', minPlan: 'pro', desc: 'Catat biaya operasional' },
  { id: 'discounts', label: 'Promo & Diskon', icon: '🎁', category: 'finance', minPlan: 'pro', desc: 'Aturan diskon' },
  { id: 'xendit', label: 'QRIS & VA Xendit', icon: '📱', category: 'finance', minPlan: 'pro', desc: 'Payment gateway' },
  { id: 'ppob', label: 'Tagihan PPOB', icon: '⚡', category: 'finance', minPlan: 'pro', desc: 'Jual pulsa, PLN, PDAM' },
  { id: 'stock', label: 'Manajemen Stok', icon: '📋', category: 'operations', minPlan: 'pro', desc: 'Gudang & mutasi stok' },
  { id: 'outlets', label: 'Multi Outlet', icon: '🏪', category: 'operations', minPlan: 'pro', desc: 'Cabang & lokasi' },
  { id: 'shifts', label: 'Shift Kas', icon: '🕐', category: 'operations', minPlan: 'pro', desc: 'Buka/tutup kasir' },
];

export const BUSINESS_VERTICALS = [
  { id: 'general', label: 'Umum / Retail', icon: '🏬' },
];

export const PLAN_PRESETS = {
  free: {
    modules: ['pos', 'history', 'catalog', 'staff', 'settings'],
    limits: { max_outlets: 1, max_staff: 3, max_products: 100 },
  },
  pro: {
    modules: ['pos', 'history', 'catalog', 'variants', 'customers', 'staff', 'settings', 'reports', 'expenses', 'discounts', 'xendit', 'ppob', 'stock', 'outlets', 'shifts'],
    limits: { max_outlets: 3, max_staff: 10, max_products: 1000 },
  },
  enterprise: {
    modules: ALL_MODULES.map((m) => m.id),
    limits: { max_outlets: 99, max_staff: 99, max_products: 99999 },
  },
};

export function getModuleById(id) {
  return ALL_MODULES.find((m) => m.id === id);
}

export function modulesForPlan(planId) {
  const preset = PLAN_PRESETS[planId];
  if (!preset) return PLAN_PRESETS.free.modules;
  return preset.modules;
}

export function normalizeEnabledModules(raw) {
  if (!Array.isArray(raw)) return [...PLAN_PRESETS.free.modules];
  if (raw.includes('all')) return ALL_MODULES.map((m) => m.id);
  // legacy: general only → map to free core
  if (raw.length === 1 && raw[0] === 'general') return [...PLAN_PRESETS.free.modules];
  return raw.filter((id) => ALL_MODULES.some((m) => m.id === id));
}

export function isModuleEnabled(enabledModules, moduleId) {
  const list = normalizeEnabledModules(enabledModules);
  return list.includes(moduleId) || list.includes('all');
}
