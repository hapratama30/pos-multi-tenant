import { supabase } from '../supabaseClient';

/** @deprecated legacy localStorage — dipakai hanya untuk one-time migration */
export const LANDING_STORAGE_KEY = 'agrapos_landing_content';

export const DEFAULT_LANDING_CONTENT = {
  hero: {
    badge: 'POS Cloud untuk UMKM & Retail',
    title: 'Kelola Toko, Kasir, & Laba',
    titleHighlight: 'Dalam Satu App',
    description:
      'AGRAPos adalah sistem Point of Sale multi-tenant lengkap — dari transaksi kasir, stok bahan, laporan keuangan, hingga manajemen staff. Siap dipakai hari ini.',
    ctaPrimary: 'Mulai Gratis Sekarang →',
    ctaSecondary: 'Sudah Punya Akun',
    bullets: ['Tanpa install rumit', 'Data cloud aman', 'Support multi cabang'],
  },
  stats: [
    { value: 'All-in-One', label: 'Satu app lengkap' },
    { value: 'Real-time', label: 'Data langsung sync' },
    { value: 'Cloud', label: 'Akses dari mana saja' },
    { value: 'Multi-Role', label: 'Owner, Admin, Kasir' },
  ],
  featuresSection: {
    eyebrow: 'Fitur Lengkap',
    title: 'Semua yang Toko Butuhkan',
    subtitle: 'Dari warung kecil hingga retail multi-cabang — modul terintegrasi tanpa ribet pindah app.',
  },
  features: [
    { icon: '⚡', title: 'Kasir Anti-Lemot', desc: 'Transaksi cepat, multi metode bayar — Tunai, QRIS, Transfer, dan piutang.' },
    { icon: '🏪', title: 'Multi-Tenant', desc: 'Satu platform, banyak toko. Data tenant terisolasi aman per bisnis.' },
    { icon: '📊', title: 'Laporan Laba Rugi', desc: 'Omzet, pengeluaran, HPP, dan margin operasional otomatis terhitung.' },
    { icon: '📦', title: 'Stok & Bahan', desc: 'Kelola gudang, konsumsi bahan otomatis dari kasir, log mutasi lengkap.' },
    { icon: '👥', title: 'Member & Poin', desc: 'Database pelanggan, program loyalitas, dan riwayat belanja.' },
    { icon: '🏷️', title: 'Diskon & Varian', desc: 'Promo fleksibel, varian produk, dan ekstra pesanan dalam satu sistem.' },
  ],
  stepsSection: {
    eyebrow: 'Mudah Dimulai',
    title: '3 Langkah Siap Jualan',
  },
  steps: [
    { num: '01', title: 'Daftar Toko', desc: 'Buat akun owner & nama bisnis dalam hitungan menit.' },
    { num: '02', title: 'Atur Katalog', desc: 'Upload produk, kategori, stok, dan tim kasir Anda.' },
    { num: '03', title: 'Mulai Jualan', desc: 'Buka kasir, catat transaksi, pantau laba real-time.' },
  ],
  benefitsSection: {
    eyebrow: 'Kenapa AGRAPos?',
    title: 'Bukan Sekadar Kasir —',
    titleHighlight: 'Sistem Bisnis Lengkap',
    items: [
      'Laporan omzet, pengeluaran, HPP, dan laba operasional otomatis',
      'Isolasi data per tenant — aman untuk multi toko & franchise',
      'Role Owner, Admin, Kasir dengan permission per menu',
      'Riwayat transaksi, cetak struk, dan notifikasi WhatsApp',
      'Manajemen pembelian bahan terhubung ke stok gudang',
    ],
  },
  ctaSection: {
    title: 'Siap Modernisasi Toko Anda?',
    subtitle: 'Daftar gratis, setup toko, dan mulai transaksi hari ini. Tanpa kartu kredit.',
    btnPrimary: 'Daftar Toko Baru',
    btnSecondary: 'Login ke Akun Saya',
  },
  footer: {
    tagline: 'All In One General Retail Automation',
    copyright: 'AGRAPos Platform',
  },
  contact: {
    email: 'agratechnology90@gmail.com',
    phone: '+62 856-9566-0902',
    address: 'Jl. Raya Bogor No. 123, Jakarta Timur, Indonesia',
    whatsapp: '6285695660902',
  },
  legal: {
    terms: 'Syarat dan Ketentuan penggunaan layanan AGRAPos.',
    privacy: 'Kebijakan privasi data pengguna AGRAPos.',
    refund: 'Kebijakan pengembalian dana dan pembatalan langganan.',
  },
};

let memoryCache = null;

function mergeLandingContent(partial) {
  if (!partial || typeof partial !== 'object') {
    return { ...DEFAULT_LANDING_CONTENT };
  }
  return {
    ...DEFAULT_LANDING_CONTENT,
    ...partial,
    hero: { ...DEFAULT_LANDING_CONTENT.hero, ...partial.hero },
    featuresSection: { ...DEFAULT_LANDING_CONTENT.featuresSection, ...partial.featuresSection },
    stepsSection: { ...DEFAULT_LANDING_CONTENT.stepsSection, ...partial.stepsSection },
    benefitsSection: { ...DEFAULT_LANDING_CONTENT.benefitsSection, ...partial.benefitsSection },
    ctaSection: { ...DEFAULT_LANDING_CONTENT.ctaSection, ...partial.ctaSection },
    footer: { ...DEFAULT_LANDING_CONTENT.footer, ...partial.footer },
    contact: { ...DEFAULT_LANDING_CONTENT.contact, ...partial.contact },
    legal: { ...DEFAULT_LANDING_CONTENT.legal, ...partial.legal },
    features: Array.isArray(partial.features) && partial.features.length > 0
      ? partial.features
      : DEFAULT_LANDING_CONTENT.features,
    steps: Array.isArray(partial.steps) && partial.steps.length > 0
      ? partial.steps
      : DEFAULT_LANDING_CONTENT.steps,
    stats: Array.isArray(partial.stats) && partial.stats.length > 0
      ? partial.stats
      : DEFAULT_LANDING_CONTENT.stats,
  };
}

function isEmptyContent(raw) {
  if (!raw || typeof raw !== 'object') return true;
  return Object.keys(raw).length === 0;
}

function readLegacyLocalStorage() {
  try {
    const raw = localStorage.getItem(LANDING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function dispatchContentUpdated(content) {
  window.dispatchEvent(new CustomEvent('landing-content-updated', { detail: content }));
}

/** Fetch dari Supabase — semua visitor dapat konten yang sama */
export async function fetchLandingContent() {
  try {
    const { data, error } = await supabase
      .from('landing_content')
      .select('content')
      .eq('id', 'global')
      .maybeSingle();

    if (error) {
      if (error.message?.includes('landing_content') && error.message?.includes('does not exist')) {
        console.warn('[Landing] Tabel landing_content belum ada. Jalankan supabase/migrations/001_landing_content.sql');
      } else {
        console.warn('[Landing] Gagal fetch Supabase:', error.message);
      }
      const legacy = readLegacyLocalStorage();
      const merged = mergeLandingContent(legacy);
      memoryCache = merged;
      return merged;
    }

    const raw = data?.content;
    if (isEmptyContent(raw)) {
      const legacy = readLegacyLocalStorage();
      if (legacy && !isEmptyContent(legacy)) {
        const merged = mergeLandingContent(legacy);
        memoryCache = merged;
        return merged;
      }
    }

    const merged = mergeLandingContent(raw);
    memoryCache = merged;
    return merged;
  } catch (err) {
    console.warn('[Landing] fetchLandingContent error:', err);
    const merged = mergeLandingContent(readLegacyLocalStorage());
    memoryCache = merged;
    return merged;
  }
}

/** Sync fallback — cache memory atau default */
export function getLandingContent() {
  if (memoryCache) return { ...memoryCache };
  const legacy = readLegacyLocalStorage();
  return mergeLandingContent(legacy);
}

/** Simpan ke Supabase via RPC (PIN divalidasi di Postgres) */
export async function saveLandingContent(content, pin) {
  if (!pin) {
    return { ok: false, error: 'PIN diperlukan untuk menyimpan ke Supabase.' };
  }
  const merged = mergeLandingContent(content);
  try {
    const { error } = await supabase.rpc('upsert_landing_content', {
      p_content: merged,
      p_pin: pin,
    });

    if (error) {
      if (error.message?.includes('invalid_pin')) {
        return { ok: false, error: 'PIN ditolak server. Pastikan app_secrets.landing_admin_pin sama dengan .env.' };
      }
      if (error.message?.includes('upsert_landing_content') || error.message?.includes('does not exist')) {
        return { ok: false, error: "RPC belum ada. Jalankan SQL di supabase/migrations/001_landing_content.sql" };
      }
      return { ok: false, error: error.message };
    }

    memoryCache = merged;
    localStorage.removeItem(LANDING_STORAGE_KEY);
    dispatchContentUpdated(merged);
    return { ok: true, content: merged };
  } catch (err) {
    return { ok: false, error: err.message || 'Gagal menyimpan' };
  }
}

/** Reset ke default di Supabase */
export async function resetLandingContent(pin) {
  const defaults = { ...DEFAULT_LANDING_CONTENT };
  const result = await saveLandingContent(defaults, pin);
  if (result.ok) {
    localStorage.removeItem(LANDING_STORAGE_KEY);
  }
  return result.ok ? defaults : null;
}

export const SUPERADMIN_SESSION_KEY = 'agrapos_superadmin_session';
export const SUPERADMIN_PIN_SESSION_KEY = 'agrapos_superadmin_pin';
export const SUPERADMIN_ATTEMPTS_KEY = 'agrapos_superadmin_attempts';
export const SUPERADMIN_LOCKOUT_KEY = 'agrapos_superadmin_lockout_until';
export const SUPERADMIN_HASH = '#agrapos-dev';
export const SUPERADMIN_PATH = '/dev-cms';

export const SUPERADMIN_PIN = import.meta.env.VITE_SUPERADMIN_PIN || '';

export const SUPERADMIN_MAX_ATTEMPTS = 5;
export const SUPERADMIN_LOCKOUT_MS = 15 * 60 * 1000;

export function isSuperAdminConfigured() {
  return Boolean(SUPERADMIN_PIN && SUPERADMIN_PIN.length >= 8);
}

export function isSuperAdminLockedOut() {
  const until = Number(sessionStorage.getItem(SUPERADMIN_LOCKOUT_KEY) || 0);
  return until > Date.now();
}

export function getSuperAdminLockoutRemainingMs() {
  const until = Number(sessionStorage.getItem(SUPERADMIN_LOCKOUT_KEY) || 0);
  return Math.max(0, until - Date.now());
}

export function isSuperAdminUnlocked() {
  return sessionStorage.getItem(SUPERADMIN_SESSION_KEY) === '1';
}

export function getSuperAdminPinForRpc() {
  return sessionStorage.getItem(SUPERADMIN_PIN_SESSION_KEY) || '';
}

export function unlockSuperAdmin(pin) {
  if (!isSuperAdminConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }
  if (isSuperAdminLockedOut()) {
    return { ok: false, reason: 'locked' };
  }
  if (pin === SUPERADMIN_PIN) {
    sessionStorage.setItem(SUPERADMIN_SESSION_KEY, '1');
    sessionStorage.setItem(SUPERADMIN_PIN_SESSION_KEY, pin);
    sessionStorage.removeItem(SUPERADMIN_ATTEMPTS_KEY);
    sessionStorage.removeItem(SUPERADMIN_LOCKOUT_KEY);
    return { ok: true };
  }
  const attempts = Number(sessionStorage.getItem(SUPERADMIN_ATTEMPTS_KEY) || 0) + 1;
  sessionStorage.setItem(SUPERADMIN_ATTEMPTS_KEY, String(attempts));
  if (attempts >= SUPERADMIN_MAX_ATTEMPTS) {
    sessionStorage.setItem(SUPERADMIN_LOCKOUT_KEY, String(Date.now() + SUPERADMIN_LOCKOUT_MS));
    sessionStorage.removeItem(SUPERADMIN_ATTEMPTS_KEY);
    return { ok: false, reason: 'locked' };
  }
  return { ok: false, reason: 'wrong_pin', attemptsLeft: SUPERADMIN_MAX_ATTEMPTS - attempts };
}

export function lockSuperAdmin() {
  sessionStorage.removeItem(SUPERADMIN_SESSION_KEY);
  sessionStorage.removeItem(SUPERADMIN_PIN_SESSION_KEY);
}

export function shouldOpenSuperAdminFromUrl() {
  if (typeof window === 'undefined') return false;
  return window.location.hash === SUPERADMIN_HASH || window.location.pathname === SUPERADMIN_PATH;
}

export function clearSuperAdminUrl() {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
