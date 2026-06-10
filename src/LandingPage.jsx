/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LANDING_CONTENT, fetchLandingContent } from './utils/landingContent';
import { fetchPublicSubscriptionPlans, formatRupiah } from './utils/platformAdmin';
import { ALL_MODULES, MODULE_CATEGORIES } from './config/platformModules';

const THEME = {
  teal: '#0d9488',
  tealDark: '#0f766e',
  orange: '#F47920',
};

export default function LandingPage({ onNavigateToLogin, onNavigateToRegister }) {
  const [content, setContent] = useState(() => ({ ...DEFAULT_LANDING_CONTENT }));
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [plans, setPlans] = useState([]);
  const [legalView, setLegalView] = useState(null); // 'terms', 'privacy', 'refund'

  const reloadContent = useCallback(async () => {
    setLoading(true);
    const [landingData, planData] = await Promise.all([
      fetchLandingContent(),
      fetchPublicSubscriptionPlans().catch(() => [])
    ]);
    setContent(landingData);
    setPlans(planData);
    setLoading(false);
  }, []);

  useEffect(() => {
    reloadContent();
  }, [reloadContent]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = () => { reloadContent(); };
    window.addEventListener('landing-content-updated', handler);
    return () => window.removeEventListener('landing-content-updated', handler);
  }, [reloadContent]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const { hero, stats, featuresSection, features, stepsSection, steps, benefitsSection, ctaSection, footer, contact, legal } = content;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="h-16 bg-teal-700/80 animate-pulse" />
        <div
          className="flex-1 flex items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%)' }}
        >
          <div className="text-center text-white">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-100">Memuat landing page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans overflow-x-hidden">

      {/* ── LEGAL MODAL ── */}
      {legalView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {legalView === 'terms' ? 'Syarat & Ketentuan' : legalView === 'privacy' ? 'Kebijakan Privasi' : 'Kebijakan Refund'}
              </h2>
              <button 
                onClick={() => setLegalView(null)}
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 text-slate-600 leading-relaxed space-y-6">
              {legalView === 'terms' && (
                <div className="space-y-4 text-sm">
                  <p className="font-bold text-slate-800 text-lg">Ketentuan Penggunaan Layanan AGRAPos</p>
                  <p>Selamat datang di AGRAPos. Dengan menggunakan layanan kami, Anda menyetujui ketentuan berikut:</p>
                  <div className="space-y-4">
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">1. Registrasi Akun</h4>
                      <p>Anda wajib memberikan informasi yang akurat dan menjaga kerahasiaan password akun Anda. Aktivitas yang terjadi di akun Anda adalah tanggung jawab Anda sepenuhnya.</p>
                    </section>
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">2. Penggunaan Layanan</h4>
                      <p>Layanan AGRAPos digunakan untuk pencatatan transaksi, manajemen stok, dan operasional bisnis lainnya. Dilarang menggunakan layanan untuk aktivitas ilegal atau melanggar hukum di Indonesia.</p>
                    </section>
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">3. Biaya & Langganan</h4>
                      <p>Layanan tersedia dalam paket gratis dan berbayar. Paket berbayar akan ditagihkan sesuai periode yang dipilih. Kegagalan pembayaran dapat mengakibatkan pembatasan akses fitur.</p>
                    </section>
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">4. Perubahan Ketentuan</h4>
                      <p>AGRAPos berhak mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan akan diinformasikan melalui website atau email resmi.</p>
                    </section>
                  </div>
                </div>
              )}
              {legalView === 'privacy' && (
                <div className="space-y-4 text-sm">
                  <p className="font-bold text-slate-800 text-lg">Kebijakan Privasi Data Pengguna</p>
                  <p>Privasi Anda adalah prioritas kami. Berikut adalah kebijakan pengelolaan data di AGRAPos:</p>
                  <div className="space-y-4">
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">1. Data yang Dikumpulkan</h4>
                      <p>Kami mengumpulkan data identitas (nama, email, nomor HP), data bisnis (nama toko, alamat), dan data transaksi untuk keperluan fungsional aplikasi.</p>
                    </section>
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">2. Penggunaan Data</h4>
                      <p>Data digunakan untuk memproses transaksi, menyediakan laporan analitik, dan memberikan dukungan teknis kepada pengguna.</p>
                    </section>
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">3. Keamanan Data</h4>
                      <p>Kami menggunakan enkripsi dan protokol keamanan standar industri (SSL/TLS) untuk melindungi data Anda dari akses yang tidak sah.</p>
                    </section>
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">4. Berbagi Data</h4>
                      <p>Kami tidak akan menjual atau memberikan data Anda kepada pihak ketiga untuk keperluan pemasaran tanpa izin Anda.</p>
                    </section>
                  </div>
                </div>
              )}
              {legalView === 'refund' && (
                <div className="space-y-4 text-sm">
                  <p className="font-bold text-slate-800 text-lg">Kebijakan Pengembalian Dana (Refund)</p>
                  <p>Mohon baca kebijakan pembatalan dan refund kami dengan seksama:</p>
                  <div className="space-y-4">
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">1. Langganan SaaS</h4>
                      <p>Pembayaran langganan paket (Pro/Enterprise) yang sudah aktif tidak dapat di-refund. Anda dapat membatalkan langganan kapan saja untuk periode berikutnya.</p>
                    </section>
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">2. Saldo PPOB / Deposit</h4>
                      <p>Deposit saldo yang sudah berhasil diproses tidak dapat ditarik kembali ke rekening bank, namun dapat digunakan sepenuhnya untuk transaksi produk PPOB di dalam sistem.</p>
                    </section>
                    <section>
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-1">3. Kesalahan Transaksi</h4>
                      <p>Jika terjadi kesalahan sistem yang mengakibatkan double billing atau kegagalan transaksi namun saldo terpotong, pengguna wajib melapor dalam 1x24 jam untuk proses investigasi dan pengembalian saldo.</p>
                    </section>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setLegalView(null)}
                className="px-8 py-3 bg-slate-800 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-700 transition-colors shadow-lg"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 py-3'
            : 'bg-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" className="h-8 w-auto object-contain" />
            <div>
              <p className={`text-base font-black tracking-tight leading-none ${scrolled ? 'text-slate-900' : 'text-white'}`}>
                AGRA<span style={{ color: scrolled ? THEME.orange : '#fb923c' }}>Pos</span>
              </p>
              <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${scrolled ? 'text-slate-400' : 'text-teal-100/80'}`}>
                Multi-Tenant POS
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {['fitur', 'cara-kerja', 'harga', 'keunggulan'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={`text-[11px] font-black uppercase tracking-wider transition-colors ${
                  scrolled ? 'text-slate-500 hover:text-teal-600' : 'text-white/80 hover:text-white'
                }`}
              >
                {id === 'fitur' ? 'Fitur' : id === 'cara-kerja' ? 'Cara Kerja' : id === 'harga' ? 'Harga' : 'Keunggulan'}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                scrolled
                  ? 'text-teal-700 border border-teal-200 bg-teal-50 hover:bg-teal-100'
                  : 'text-white border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => scrollTo('harga')}
              className="px-4 sm:px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: `linear-gradient(135deg, ${THEME.orange}, #f97316)` }}
            >
              Daftar Gratis
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className="relative pt-28 sm:pt-32 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%)' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-48 bg-teal-900/20 blur-3xl rounded-full" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center pt-4 sm:pt-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {hero.badge}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              {hero.title}{' '}
              <span className="text-orange-300">{hero.titleHighlight}</span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-teal-50/90 font-medium leading-relaxed max-w-lg">
              {hero.description}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => scrollTo('harga')}
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-teal-900 bg-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Daftar Gratis
              </button>
              <button
                type="button"
                onClick={() => window.open('https://wa.me/6285695660902', '_blank')}
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white border-2 border-white/40 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <span>Hubungi Sales</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412 0 12.048c0 2.123.554 4.197 1.607 6.034L0 24l6.117-1.605a11.803 11.803 0 005.925 1.586h.005c6.631 0 12.046-5.411 12.048-12.047 0-3.22-1.258-6.244-3.541-8.527z"/></svg>
              </button>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 sm:gap-6">
              {(hero.bullets || []).map((t) => (
                <span key={t} className="flex items-center gap-2 text-[11px] font-bold text-teal-100/90">
                  <svg className="w-4 h-4 text-orange-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative hidden sm:block">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-5 shadow-2xl">
              <div className="bg-white rounded-[1.5rem] p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Omzet Hari Ini</p>
                    <p className="text-2xl font-black text-teal-600">Rp 4.850.000</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-lg">📈</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Transaksi</p>
                    <p className="text-lg font-black text-slate-800">47 Nota</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3">
                    <p className="text-[8px] font-black text-orange-400 uppercase">Laba Ops</p>
                    <p className="text-lg font-black text-orange-600">+18.4%</p>
                  </div>
                </div>
                <div className="h-16 flex items-end gap-1">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md"
                      style={{
                        height: `${h}%`,
                        background: i % 2 === 0 ? THEME.teal : THEME.orange,
                        opacity: 0.7 + (i % 3) * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-white border-y border-slate-100 py-8 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {(stats || []).map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl sm:text-2xl font-black text-teal-700">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FITUR ── */}
      <section id="fitur" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-2">{featuresSection.eyebrow}</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{featuresSection.title}</h2>
            <p className="mt-3 text-sm text-slate-500 font-medium max-w-xl mx-auto">{featuresSection.subtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {(features || []).map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-teal-200/60 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CARA KERJA ── */}
      <section id="cara-kerja" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2">{stepsSection.eyebrow}</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stepsSection.title}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {(steps || []).map((s, i) => (
              <div key={s.num} className="relative text-center md:text-left">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-0 h-px bg-gradient-to-r from-teal-200 to-transparent" />
                )}
                <div
                  className="inline-flex w-14 h-14 rounded-2xl items-center justify-center text-lg font-black text-white mb-4 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${THEME.tealDark}, ${THEME.teal})` }}
                >
                  {s.num}
                </div>
                <h3 className="text-base font-black text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500 font-medium">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEUNGGULAN ── */}
      <section id="keunggulan" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-2">{benefitsSection.eyebrow}</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {benefitsSection.title}{' '}
              <span className="text-teal-600">{benefitsSection.titleHighlight}</span>
            </h2>
            <ul className="mt-8 space-y-4">
              {(benefitsSection.items || []).map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-black"
                    style={{ background: THEME.teal }}
                  >
                    ✓
                  </span>
                  <span className="text-sm font-medium text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-[2rem] p-6 sm:p-8 text-white shadow-2xl"
            style={{ background: 'linear-gradient(145deg, #0f766e, #0d9488 50%, #14b8a6)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-100/80">Ringkasan Keuangan</p>
            <h3 className="text-xl font-black mt-2">Seperti POS Profesional</h3>
            <div className="mt-6 space-y-3 bg-white/10 rounded-2xl p-4 backdrop-blur border border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-teal-100">Penjualan Kasir</span>
                <span className="font-black">+ Rp 12.400.000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-teal-100">Pembelian Stok (HPP)</span>
                <span className="font-black text-orange-200">− Rp 4.200.000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-teal-100">Biaya Operasional</span>
                <span className="font-black text-orange-200">− Rp 1.800.000</span>
              </div>
              <div className="h-px bg-white/20 my-2" />
              <div className="flex justify-between">
                <span className="font-black">Laba Operasional</span>
                <span className="text-xl font-black text-orange-300">Rp 6.400.000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="harga" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-[9px] font-black uppercase tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Currency: IDR (Rupiah)
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Investasi Terbaik Bisnis Anda</h2>
            <p className="mt-3 text-sm text-slate-500 font-medium max-w-xl mx-auto">Mulai dari gratis hingga paket enterprise untuk retail besar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => {
              const isPro = plan.id === 'pro';
              const isEnt = plan.id === 'enterprise';
              const themeColor = isEnt ? '#7c3aed' : '#0d9488'; // Violet for Enterprise, Teal for others
              const checkmarkClass = isEnt ? 'text-violet-500' : 'text-teal-500';
              
              const moduleIds = plan.features?.includes?.('all') ? ALL_MODULES.map(m => m.id) : (plan.features || []);

              return (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col rounded-[2.5rem] bg-white p-8 transition-all hover:scale-[1.02] ${
                    isPro 
                      ? 'ring-4 ring-teal-500/20 border-2 border-teal-500/30 shadow-xl' 
                      : isEnt 
                        ? 'ring-4 ring-violet-500/30 border-2 border-violet-500/50 shadow-2xl bg-gradient-to-b from-white to-violet-50/30' 
                        : 'border border-slate-100 shadow-lg'
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-10">
                      Paling Populer
                    </div>
                  )}
                  
                  {isEnt && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-5 py-2 rounded-full shadow-xl z-10 border border-white/20">
                      ✨ Solusi Korporasi ✨
                    </div>
                  )}

                  <div className="mb-8 relative">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${isEnt ? 'text-violet-600' : isPro ? 'text-teal-600' : 'text-slate-400'}`}>
                      {plan.name}
                    </h3>
                    <div className="mt-4 flex flex-col">
                      {plan.price_original > plan.price_monthly && (
                        <span className="text-sm text-slate-400 line-through font-bold mb-1">
                          {formatRupiah(plan.price_original)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${isEnt ? 'text-violet-900' : 'text-slate-900'}`}>{formatRupiah(plan.price_monthly)}</span>
                        <span className="text-sm font-bold text-slate-400">/bln</span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-10 flex-1">
                    <li className={`flex items-center gap-3 text-sm font-bold ${isEnt ? 'text-violet-900' : 'text-slate-700'}`}>
                      <svg className={`w-5 h-5 shrink-0 ${checkmarkClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {plan.max_outlets >= 99 ? 'Cabang Tak Terbatas' : `${plan.max_outlets} Outlet`}
                    </li>
                    <li className={`flex items-center gap-3 text-sm font-bold ${isEnt ? 'text-violet-900' : 'text-slate-700'}`}>
                      <svg className={`w-5 h-5 shrink-0 ${checkmarkClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {plan.max_staff >= 99 ? 'Staff Tak Terbatas' : `${plan.max_staff} Staff`}
                    </li>
                    <li className={`flex items-center gap-3 text-sm font-bold ${isEnt ? 'text-violet-900' : 'text-slate-700'}`}>
                      <svg className={`w-5 h-5 shrink-0 ${checkmarkClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {plan.max_products >= 9999 ? 'Produk Tak Terbatas' : `${plan.max_products} Produk`}
                    </li>
                    
                    <div className={`my-4 border-t ${isEnt ? 'border-violet-200' : 'border-slate-100'}`} />

                    {/* Grouped Features - Exactly like Super Admin */}
                    <div className="space-y-6">
                      {MODULE_CATEGORIES.map(cat => {
                        const catModules = ALL_MODULES.filter(m => m.category === cat.id);
                        return (
                          <div key={cat.id} className="space-y-2">
                            <p className={`text-[9px] font-black uppercase tracking-[0.15em] mb-2 ${isEnt ? 'text-violet-400' : 'text-slate-400'}`}>
                              {cat.label}
                            </p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                              {catModules.map(mod => {
                                const active = moduleIds.includes(mod.id);
                                return (
                                  <div 
                                    key={mod.id} 
                                    className={`flex items-center gap-2 transition-all duration-300 ${
                                      active 
                                        ? isEnt ? 'text-violet-900' : 'text-slate-700' 
                                        : 'opacity-20 grayscale'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 flex items-center justify-center shrink-0 rounded-md border ${
                                      active 
                                        ? isEnt ? 'bg-violet-50 border-violet-200' : 'bg-teal-50 border-teal-200' 
                                        : 'bg-slate-50 border-slate-100'
                                    }`}>
                                      {active ? (
                                        <svg className={`w-3 h-3 ${checkmarkClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <div className="w-1 h-0.5 bg-slate-300 rounded-full" />
                                      )}
                                    </div>
                                    <span className="text-sm shrink-0">{mod.icon}</span>
                                    <span className="text-[10px] font-bold truncate tracking-tight">{mod.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ul>

                  <button
                    onClick={() => {
                      if (plan.price_monthly === 0) {
                        onNavigateToRegister();
                      } else {
                        const message = encodeURIComponent(`Halo Admin AGRAPos, saya tertarik dengan paket ${plan.name}. Mohon info lebih lanjut.`);
                        window.open(`https://wa.me/6285695660902?text=${message}`, '_blank');
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-[0.98] ${
                      isPro 
                        ? 'bg-teal-600 text-white' 
                        : isEnt 
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 ring-2 ring-violet-300 ring-offset-2' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {plan.price_monthly === 0 ? 'Mulai Sekarang (Gratis)' : `Pilih Paket ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* ── PAYMENT METHODS ── */}
          <div className="mt-16 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Metode Pembayaran Didukung</p>
            <div className="flex flex-wrap justify-center items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg" alt="QRIS" className="h-6 w-auto" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg" alt="BCA" className="h-5 w-auto" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg" alt="Mandiri" className="h-5 w-auto" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/68/BANK_BRI_logo.svg" alt="BRI" className="h-4 w-auto" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 w-auto" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 w-auto" />
            </div>
            <p className="mt-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <svg className="w-3 h-3 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Pembayaran Aman Terintegrasi via Xendit (Test Mode Ready)
            </p>
          </div>
        </div>
      </section>

      {/* ── CONTACT US ── */}
      <section id="kontak" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2">Hubungi Kami</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Ada Pertanyaan? Kami Siap Membantu</h2>
              <p className="mt-4 text-sm text-slate-500 font-medium leading-relaxed">
                Tim support kami siap menjawab pertanyaan teknis maupun seputar paket langganan. Jangan ragu untuk menghubungi kami melalui kanal di bawah ini.
              </p>
              
              <div className="mt-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Support</p>
                    <p className="text-sm font-bold text-slate-800">{contact?.email || 'support@agrapos.dev'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Kantor</p>
                    <p className="text-sm font-bold text-slate-800 leading-snug">{contact?.address || 'Jakarta, Indonesia'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412 0 12.048c0 2.123.554 4.197 1.607 6.034L0 24l6.117-1.605a11.803 11.803 0 005.925 1.586h.005c6.631 0 12.046-5.411 12.048-12.047 0-3.22-1.258-6.244-3.541-8.527z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</p>
                    <p className="text-sm font-bold text-slate-800">{contact?.phone || '+62 856-9566-0902'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-teal-600 rounded-[2.5rem] rotate-2 scale-95 opacity-10 group-hover:rotate-3 transition-transform" />
              <div className="relative bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8">
                <h3 className="text-lg font-black text-slate-900 mb-6">Kirim Pesan Cepat</h3>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nama Anda" className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-teal-500/20 outline-none w-full" />
                    <input type="email" placeholder="Email Aktif" className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-teal-500/20 outline-none w-full" />
                  </div>
                  <textarea placeholder="Pesan Anda..." rows="4" className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-teal-500/20 outline-none w-full resize-none"></textarea>
                  <button className="w-full py-4 bg-teal-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-teal-700 transition-colors">
                    Kirim Pesan
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div
          className="max-w-4xl mx-auto rounded-[2.5rem] p-8 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #F47920, #f97316)' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{ctaSection.title}</h2>
            <p className="mt-3 text-sm sm:text-base text-orange-100 font-medium max-w-md mx-auto">{ctaSection.subtitle}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => scrollTo('harga')}
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-white text-orange-600 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
              >
                {ctaSection.btnPrimary}
              </button>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider border-2 border-white/50 text-white hover:bg-white/10 transition-all"
              >
                {ctaSection.btnSecondary}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-6">
                <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" className="h-8 w-auto object-contain" />
                <div>
                  <p className="text-base font-black text-slate-900 leading-none">
                    AGRA<span style={{ color: THEME.orange }}>Pos</span>
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Multi-Tenant POS</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Sistem Point of Sale modern berbasis cloud untuk akselerasi bisnis UMKM Indonesia. Kelola stok, kasir, dan laporan keuangan dalam satu genggaman.
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Navigasi</h4>
              <ul className="space-y-4">
                {['fitur', 'cara-kerja', 'harga', 'kontak'].map((id) => (
                  <li key={id}>
                    <button onClick={() => scrollTo(id)} className="text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors uppercase tracking-wider">
                      {id.replace('-', ' ')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Bantuan</h4>
              <ul className="space-y-4">
                <li><button onClick={() => setLegalView('terms')} className="text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors uppercase tracking-wider">Syarat & Ketentuan</button></li>
                <li><button onClick={() => setLegalView('privacy')} className="text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors uppercase tracking-wider">Kebijakan Privasi</button></li>
                <li><button onClick={() => setLegalView('refund')} className="text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors uppercase tracking-wider">Kebijakan Refund</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Kontak</h4>
              <ul className="space-y-4">
                <li className="text-xs font-bold text-slate-500 break-words">{contact?.email || 'support@agrapos.dev'}</li>
                <li className="text-xs font-bold text-slate-500">{contact?.phone || '+62 856-9566-0902'}</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              © {new Date().getFullYear()} {footer.copyright}. All Rights Reserved.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 grayscale opacity-50">
                <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">Secure Payment by</span>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Xendit_Logo.png/640px-Xendit_Logo.png" alt="Xendit" className="h-3 w-auto" />
              </div>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Built with ❤️ in Indonesia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
