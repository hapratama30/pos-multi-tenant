/** Kunci tanggal YYYY-MM-DD di zona waktu lokal (bukan UTC). */
export function toLocalDateKey(isoOrDate) {
  if (!isoOrDate) return null;
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalKey() {
  return toLocalDateKey(new Date());
}

export function firstDayOfMonthKey(ref = new Date()) {
  const d = ref instanceof Date ? ref : new Date(ref);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Tanggal terakhir bulan Masehi (28/29/30/31) sebagai YYYY-MM-DD lokal. */
export function lastDayOfMonthKey(ref = new Date()) {
  const d = ref instanceof Date ? ref : new Date(ref);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export function daysInLocalMonth(ref = new Date()) {
  const d = ref instanceof Date ? ref : new Date(ref);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Slot harian lengkap untuk satu bulan kalender (tanggal 1 … akhir bulan). */
export function buildMonthDayBuckets(ref = new Date()) {
  const startKey = firstDayOfMonthKey(ref);
  const endKey = lastDayOfMonthKey(ref);
  const rows = [];
  forEachDayInRange(startKey, endKey, ({ dateKey, dayLabel, formattedDate }) => {
    rows.push({
      dateStr: dateKey,
      name: dayLabel,
      formattedDate,
      omzet: 0,
      count: 0,
    });
  });
  return rows;
}

/** Parse input type="date" (YYYY-MM-DD) ke Date lokal tengah malam. */
export function parseDateInput(value) {
  if (!value) return null;
  const parts = String(value).split('-').map(Number);
  if (parts.length < 3) return null;
  const [y, m, day] = parts;
  const d = new Date(y, m - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isInDateRange(iso, startKey, endKey) {
  const key = toLocalDateKey(iso);
  if (!key) return false;
  if (startKey && key < startKey) return false;
  if (endKey && key > endKey) return false;
  return true;
}

export function isSameLocalDay(iso, ref = new Date()) {
  return toLocalDateKey(iso) === toLocalDateKey(ref);
}

export function isSameLocalMonth(iso, ref = new Date()) {
  const d = new Date(iso);
  const r = ref instanceof Date ? ref : new Date(ref);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth();
}

/**
 * Iterasi setiap hari dari startKey sampai endKey (inklusif).
 * Memanggil callback dengan { dateKey, dayLabel, formattedDate }.
 */
export function forEachDayInRange(startKey, endKey, callback) {
  const start = parseDateInput(startKey);
  const end = parseDateInput(endKey);
  if (!start || !end || start > end) return;

  const cur = new Date(start);
  while (cur <= end) {
    const dateKey = toLocalDateKey(cur);
    const dayNum = cur.getDate();
    callback({
      dateKey,
      dayLabel: String(dayNum),
      formattedDate: cur.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    });
    cur.setDate(cur.getDate() + 1);
  }
}

/** Rentang default: awal bulan berjalan s/d hari ini. */
export function defaultMonthToTodayRange() {
  return {
    from: firstDayOfMonthKey(),
    to: todayLocalKey(),
  };
}

/** Satu bulan penuh (tanggal 1 … akhir bulan berjalan). */
export function currentMonthRange() {
  return {
    from: firstDayOfMonthKey(),
    to: lastDayOfMonthKey(),
  };
}

export function isActiveSale(tx) {
  const status = tx?.status || 'completed';
  return status !== 'void' && status !== 'refunded';
}
