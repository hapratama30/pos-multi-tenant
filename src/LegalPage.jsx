import React, { useEffect } from 'react';

const THEME = {
  teal: '#0d9488',
  tealDark: '#0f766e',
  orange: '#F47920',
  orangeHover: '#ea580c',
};

export default function LegalPage({ type, onNavigateToHome, isLoggedIn }) {
  const backLabel = isLoggedIn ? 'Kembali ke Pengaturan' : 'Kembali ke Beranda';
  useEffect(() => {
    window.scrollTo(0, 0);
    // Set matching page title for SEO/Auditing
    const titles = {
      terms: 'Syarat & Ketentuan Layanan - AGRAPos',
      privacy: 'Kebijakan Privasi Data Pengguna - AGRAPos',
      refund: 'Kebijakan Pengembalian Dana (Refund) - AGRAPos',
    };
    document.title = titles[type] || 'Halaman Hukum - AGRAPos';
  }, [type]);

  const handleLogoClick = (e) => {
    e.preventDefault();
    onNavigateToHome();
  };

  const renderContent = () => {
    switch (type) {
      case 'terms':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Syarat & Ketentuan</h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Terakhir diperbarui: 19 Juni 2026</p>
            </div>
            
            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-6 text-sm">
              <p className="text-base font-medium">
                Selamat datang di <strong>AGRAPos</strong> (All-in-One General Retail Automation). Dengan mengakses dan menggunakan platform SaaS POS kami, Anda dianggap telah membaca, memahami, dan menyetujui seluruh isi Syarat & Ketentuan di bawah ini. Jika Anda tidak menyetujui bagian apa pun dari ketentuan ini, mohon untuk tidak melanjutkan penggunaan layanan kami.
              </p>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  1. Registrasi Akun & Keamanan
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Anda wajib memberikan data informasi bisnis dan identitas diri yang akurat, lengkap, dan terbaru saat mendaftarkan akun Owner.</li>
                  <li>Anda bertanggung jawab penuh untuk menjaga kerahasiaan password dan akses akun Anda. Segala aktivitas transaksi atau pengaturan yang terjadi di bawah akun Anda dianggap sebagai tindakan sah dari Anda.</li>
                  <li>AGRAPos berhak menolak pendaftaran akun atau menonaktifkan akun yang terbukti melanggar hukum atau memberikan informasi palsu.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  2. Penggunaan Layanan SaaS POS
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Layanan AGRAPos ditujukan untuk membantu mencatat transaksi kasir, mengelola stok produk, melacak laporan keuangan, dan manajemen staff operasional bisnis Anda.</li>
                  <li>Anda dilarang menggunakan platform ini untuk memfasilitasi bisnis ilegal, pencucian uang, penjualan barang terlarang, atau aktivitas lain yang melanggar hukum Negara Republik Indonesia.</li>
                  <li>Data transaksi yang Anda input sepenuhnya merupakan milik Anda, namun Anda memberikan hak kepada sistem untuk memproses data tersebut guna menghasilkan laporan analitik demi kelancaran operasional bisnis Anda.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  3. Paket Langganan & Ketentuan Biaya
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>AGRAPos menyediakan paket layanan gratis (Free) dengan fitur terbatas serta paket berbayar (Pro & Enterprise) yang ditagihkan secara bulanan atau tahunan.</li>
                  <li>Tarif layanan dapat berubah sewaktu-waktu sesuai kebijakan pengembang, dengan pemberitahuan tertulis kepada pengguna minimal 14 hari sebelum masa tagihan baru berlaku.</li>
                  <li>Keterlambatan pembayaran biaya langganan berbayar dapat mengakibatkan pembatasan fitur secara otomatis atau penangguhan akses akun hingga pembayaran diselesaikan.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  4. Batasan Tanggung Jawab & Jaminan
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Kami berupaya keras menjaga stabilitas platform dan ketersediaan server hingga 99.9%. Namun, AGRAPos disediakan "sebagaimana adanya" tanpa jaminan bahwa layanan tidak akan pernah terganggu oleh gangguan server global, koneksi internet lokal, atau bencana alam.</li>
                  <li>AGRAPos tidak bertanggung jawab atas kerugian finansial tidak langsung, hilangnya keuntungan bisnis, atau kebocoran data akibat kelalaian pengguna menjaga keamanan kredensial akun mereka sendiri.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  5. Perubahan Syarat & Ketentuan
                </h3>
                <p>
                  AGRAPos berhak memperbarui dokumen Syarat & Ketentuan ini kapan saja. Perubahan akan berlaku segera setelah dipublikasikan pada halaman web ini. Kami menyarankan Anda untuk meninjau halaman ini secara berkala.
                </p>
              </section>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Kebijakan Privasi</h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Terakhir diperbarui: 19 Juni 2026</p>
            </div>

            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-6 text-sm">
              <p className="text-base font-medium">
                Privasi Anda adalah hal yang sangat krusial bagi kami di <strong>AGRAPos</strong>. Dokumen Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, mengelola, menggunakan, menyimpan, dan melindungi informasi pribadi serta data operasional bisnis yang Anda berikan melalui platform kami.
              </p>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  1. Informasi yang Kami Kumpulkan
                </h3>
                <p>Kami mengumpulkan data berikut untuk mendukung operasional akun dan aplikasi Anda:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Informasi Pendaftaran:</strong> Nama pemilik akun (Owner), alamat email, nomor telepon, kata sandi terenkripsi, nama bisnis/toko, dan alamat fisik toko Anda.</li>
                  <li><strong>Data Operasional Bisnis:</strong> Katalog produk, harga barang, jumlah stok, nama karyawan, jadwal shift kasir, pengeluaran operasional, dan data transaksi penjualan harian.</li>
                  <li><strong>Informasi Transaksi Pembayaran:</strong> Data terkait invoice tagihan langganan, metode pembayaran yang dipilih, dan status pembayaran yang diproses melalui gateway mitra resmi kami (Xendit).</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  2. Penggunaan Informasi Data Anda
                </h3>
                <p>Semua data yang kami kumpulkan digunakan secara ketat untuk tujuan berikut:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Menyediakan, memelihara, dan mengoptimalkan fungsi aplikasi POS dan modul-modul pelengkapnya.</li>
                  <li>Menghasilkan laporan analitik grafik, perhitungan laba rugi, serta kalkulasi stok otomatis untuk membantu keputusan bisnis Anda.</li>
                  <li>Memproses verifikasi akun, penagihan paket langganan SaaS, dan penyelesaian kendala teknis via tim dukungan kami.</li>
                  <li>Mengirimkan notifikasi operasional penting, pembaruan keamanan aplikasi, serta invoice cetak melalui WhatsApp dan Email.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  3. Keamanan & Perlindungan Data
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Kami mengimplementasikan enkripsi standar industri (SSL/TLS) untuk mengamankan pertukaran data antara browser Anda dengan server cloud kami.</li>
                  <li>Setiap data tenant diisolasi secara ketat pada database menggunakan aturan otorisasi Row Level Security (RLS) di Supabase, memastikan bisnis lain tidak dapat mengintip atau memodifikasi data toko Anda.</li>
                  <li>Meskipun kami mengambil langkah keamanan terbaik, harap dipahami bahwa tidak ada transmisi data di internet yang dijamin 100% aman tanpa celah.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  4. Pembagian Data Pihak Ketiga
                </h3>
                <p>
                  Kami berkomitmen penuh untuk <strong>tidak pernah menjual, menyewakan, atau memberikan data operasional toko Anda</strong> kepada pihak ketiga untuk kepentingan iklan pemasaran tanpa persetujuan eksplisit Anda. Kami hanya membagikan data kepada mitra fungsional tepercaya (seperti gateway pembayaran Xendit dan provider API notifikasi) guna memproses transaksi yang Anda picu sendiri di dalam aplikasi.
                </p>
              </section>
            </div>
          </div>
        );

      case 'refund':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Kebijakan Refund & Pengembalian</h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Terakhir diperbarui: 19 Juni 2026</p>
            </div>

            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-6 text-sm">
              <p className="text-base font-medium">
                Di <strong>AGRAPos</strong>, kami berkomitmen untuk menyediakan solusi POS berkualitas tinggi yang dapat diandalkan. Harap baca kebijakan pengembalian dana (refund) dan pembatalan langganan kami secara saksama sebelum membeli paket berbayar kami.
              </p>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  1. Pembatalan Langganan SaaS POS
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Anda dapat membatalkan langganan paket berbayar (Pro atau Enterprise) kapan saja melalui menu pengaturan akun Anda.</li>
                  <li>Jika Anda membatalkan langganan sebelum periode berjalan berakhir, Anda tetap dapat menikmati seluruh fitur berbayar tersebut hingga akhir siklus penagihan saat itu.</li>
                  <li>Setelah siklus penagihan berakhir, sistem kami akan secara otomatis menurunkan status akun Anda ke paket gratis (Free Plan) dengan limitasi fitur yang berlaku.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  2. Kebijakan Refund Biaya SaaS
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Seluruh transaksi pembayaran biaya langganan bulanan maupun tahunan yang telah sukses diproses bersifat <strong>final dan tidak dapat di-refund (non-refundable)</strong>.</li>
                  <li>Kami tidak memberikan refund proporsional atau pengembalian sebagian uang atas sisa hari penggunaan yang tidak terpakai jika Anda memutuskan berhenti di tengah periode berjalan.</li>
                  <li>Kami menyarankan Anda untuk mencoba fitur-fitur kami secara menyeluruh menggunakan <strong>Free Plan</strong> terlebih dahulu sebelum melakukan upgrade ke paket berbayar.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  3. Kebijakan Saldo Deposit / PPOB
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Deposit saldo PPOB (Payment Point Online Bank) yang telah berhasil masuk ke akun Anda tidak dapat ditarik kembali (cash out) ke rekening bank Anda dengan alasan apa pun.</li>
                  <li>Saldo deposit tersebut dapat Anda gunakan kapan saja tanpa batas kedaluwarsa untuk melakukan transaksi pembelian produk digital seperti pulsa, paket data, token listrik, dan tagihan PPOB lainnya di dalam sistem AGRAPos.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  4. Pengecualian Khusus & Double Billing
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Jika terjadi kegagalan sistem yang menyebabkan double billing (terpotong saldo ganda atas satu tagihan yang sama), silakan hubungi tim CS kami melalui email <strong>agratechnology90@gmail.com</strong> dalam waktu maksimal 1x24 jam sejak transaksi dilakukan.</li>
                  <li>Tim keuangan kami akan melakukan investigasi dalam waktu 3 hari kerja. Jika keluhan terbukti valid akibat galat teknis di sisi kami atau gateway pembayaran, pengembalian dana penuh untuk transaksi ganda tersebut akan ditransfer kembali ke rekening asal Anda.</li>
                </ul>
              </section>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-black text-slate-800">Halaman Tidak Ditemukan</h2>
            <p className="mt-2 text-slate-500 font-medium">Maaf, halaman kebijakan hukum yang Anda cari tidak tersedia.</p>
          </div>
        );
    }
  };

  const title = {
    terms: 'Syarat & Ketentuan',
    privacy: 'Kebijakan Privasi',
    refund: 'Kebijakan Refund & Pengembalian',
  }[type] || 'Kebijakan Hukum';

  const subtitle = {
    terms: 'Ketentuan penggunaan platform, pendaftaran, dan biaya langganan',
    privacy: 'Bagaimana data personal, toko, dan transaksi Anda kami lindungi',
    refund: 'Kebijakan pembatalan langganan dan pengembalian saldo PPOB',
  }[type] || 'Kebijakan Hukum Platform AGRAPos';

  if (isLoggedIn) {
    return (
      <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans">
        <div className="px-4 sm:px-6 pt-6 space-y-6">
          {/* BACK BUTTON */}
          <div>
            <button 
              onClick={onNavigateToHome} 
              className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Kembali ke Pengaturan
            </button>
          </div>

          {/* PAGE HEADER */}
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase">
                {title}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                {subtitle}
              </p>
            </div>
          </header>

          {/* DOCUMENT CONTENT */}
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
            {renderContent()}

            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Butuh Bantuan Hukum?</p>
                <p className="text-sm font-bold text-slate-700">agratechnology90@gmail.com</p>
              </div>
              <button
                onClick={onNavigateToHome}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                style={{ background: `linear-gradient(135deg, ${THEME.orange}, ${THEME.orangeHover})` }}
              >
                {backLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      {/* ── HEADER NAVBAR ── */}
      <header className="bg-white border-b border-slate-100 py-4 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" className="h-8 w-auto object-contain" />
            <div>
              <p className="text-base font-black tracking-tight leading-none text-slate-900">
                AGRA<span style={{ color: THEME.orange }}>Pos</span>
              </p>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5 text-slate-400">
                Multi-Tenant POS
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={onNavigateToHome}
              className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-teal-700 border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors cursor-pointer"
            >
              {backLabel}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 sm:p-12 shadow-sm">
          {renderContent()}

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Butuh Bantuan Hukum?</p>
              <p className="text-sm font-bold text-slate-700">agratechnology90@gmail.com</p>
            </div>
            <button
              onClick={onNavigateToHome}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${THEME.orange}, ${THEME.orangeHover})` }}
            >
              {backLabel}
            </button>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} AGRAPos Platform. All Rights Reserved.
          </p>
          <div className="flex justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <a href="/terms" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/terms'); window.dispatchEvent(new Event('pushstate-changed')); }} className="hover:text-teal-600 transition-colors">Syarat & Ketentuan</a>
            <span>•</span>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/privacy'); window.dispatchEvent(new Event('pushstate-changed')); }} className="hover:text-teal-600 transition-colors">Kebijakan Privasi</a>
            <span>•</span>
            <a href="/refund" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/refund'); window.dispatchEvent(new Event('pushstate-changed')); }} className="hover:text-teal-600 transition-colors">Kebijakan Refund</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
