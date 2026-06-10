// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SuperAdminWithdrawals({ showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [history, setHistory] = useState([]);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/withdrawal-requests?status=pending`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRequests(data.requests || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchHistory = useCallback(() => {
    setLoadingHistory(true);
    const params = new URLSearchParams();
    if (historyStartDate) params.append('start_date', historyStartDate);
    if (historyEndDate) params.append('end_date', historyEndDate);
    if (historySearch) params.append('search', historySearch);

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/withdrawal-history?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHistory(data.history || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [historyStartDate, historyEndDate, historySearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab === 'pending') fetchRequests();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  const handleAction = async (id, action) => {
    const pin = localStorage.getItem('pos_superadmin_pin') || prompt('Masukkan PIN Super Admin:');
    if (!pin) return;
    
    setProcessingId(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/withdrawal-requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Berhasil', data.message, 'success');
        localStorage.setItem('pos_superadmin_pin', pin);
        if (activeTab === 'pending') fetchRequests();
        else fetchHistory();
      } else {
        showToast('Gagal', data.error, 'error');
        if (data.error === 'Unauthorized PIN') localStorage.removeItem('pos_superadmin_pin');
      }
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      showToast('Gagal', 'Terjadi kesalahan jaringan.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // ====== EXPORT TO EXCEL ======
  const exportToExcel = () => {
    if (history.length === 0) {
      showToast('Info', 'Tidak ada data untuk diekspor.', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Summary data
    const totalBerhasil = history.filter(i => i.status === 'approved').reduce((s, i) => s + Number(i.amount), 0);
    const totalDitolak = history.filter(i => i.status === 'rejected').reduce((s, i) => s + Number(i.amount), 0);
    const totalAll = totalBerhasil;
    const countBerhasil = history.filter(i => i.status === 'approved').length;
    const countDitolak = history.filter(i => i.status === 'rejected').length;

    // Build worksheet data with header section
    const wsData = [
      ['LAPORAN RIWAYAT WITHDRAW (PENARIKAN)'],
      ['AGRAPos - Platform Console'],
      [''],
      ['Tanggal Cetak:', new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })],
      ['Periode:', historyStartDate && historyEndDate ? `${historyStartDate} s/d ${historyEndDate}` : 'Semua Periode'],
      ['Pencarian:', historySearch || '-'],
      [''],
      ['RINGKASAN'],
      ['Total Transaksi', history.length],
      ['Disetujui', countBerhasil, '', 'Total Dana Keluar', `Rp ${totalAll.toLocaleString('id-ID')}`],
      ['Ditolak', countDitolak, '', 'Total Ditolak', `Rp ${totalDitolak.toLocaleString('id-ID')}`],
      [''],
      ['No', 'Tanggal', 'Waktu', 'Nama Tenant', 'Tenant ID', 'Bank', 'No Rekening', 'Atas Nama', 'Status', 'Nominal (Rp)'],
    ];

    history.forEach((item, idx) => {
      const d = new Date(item.created_at);
      wsData.push([
        idx + 1,
        d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        item.tenants?.tenant_name || '-',
        item.tenant_id || '-',
        item.bank_name || '-',
        item.account_number || '-',
        item.account_name || '-',
        item.status === 'approved' ? 'Disetujui' : 'Ditolak',
        Number(item.amount),
      ]);
    });

    // Footer totals
    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', '', 'TOTAL DISETUJUI:', totalBerhasil]);
    wsData.push(['', '', '', '', '', '', '', '', 'TOTAL DITOLAK:', totalDitolak]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 16 },  // Tanggal
      { wch: 8 },   // Waktu
      { wch: 22 },  // Nama Tenant
      { wch: 18 },  // Tenant ID
      { wch: 15 },  // Bank
      { wch: 20 },  // No Rek
      { wch: 22 },  // A.N
      { wch: 12 },  // Status
      { wch: 18 },  // Nominal
    ];

    // Merge title cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Subtitle
      { s: { r: 8, c: 0 }, e: { r: 8, c: 9 } }, // Ringkasan
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Withdraw');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileName = `Laporan_Withdraw_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
    showToast('Berhasil', `File ${fileName} berhasil diunduh!`, 'success');
    setShowExportMenu(false);
  };

  // ====== EXPORT TO PDF ======
  const exportToPDF = () => {
    if (history.length === 0) {
      showToast('Info', 'Tidak ada data untuk diekspor.', 'error');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN RIWAYAT WITHDRAW (PENARIKAN)', 148.5, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('AGRAPos - Platform Console', 148.5, 24, { align: 'center' });

    // Meta info
    doc.setFontSize(9);
    const metaY = 32;
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, metaY);
    doc.text(`Periode: ${historyStartDate && historyEndDate ? `${historyStartDate} s/d ${historyEndDate}` : 'Semua Periode'}`, 14, metaY + 5);
    if (historySearch) doc.text(`Pencarian: "${historySearch}"`, 14, metaY + 10);

    // Summary box
    const totalBerhasil = history.filter(i => i.status === 'approved').reduce((s, i) => s + Number(i.amount), 0);
    const totalDitolak = history.filter(i => i.status === 'rejected').reduce((s, i) => s + Number(i.amount), 0);

    const summaryY = historySearch ? metaY + 17 : metaY + 12;
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, summaryY, 269, 12, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${history.length} transaksi`, 20, summaryY + 7.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`Disetujui: Rp ${totalBerhasil.toLocaleString('id-ID')}`, 90, summaryY + 7.5);
    doc.setTextColor(225, 29, 72);
    doc.text(`Ditolak: Rp ${totalDitolak.toLocaleString('id-ID')}`, 190, summaryY + 7.5);
    doc.setTextColor(0);

    // Table
    const tableData = history.map((item, idx) => {
      const d = new Date(item.created_at);
      return [
        idx + 1,
        d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        item.tenants?.tenant_name || '-',
        item.tenant_id || '-',
        `${item.bank_name}\n${item.account_number}\n${item.account_name}`,
        item.status === 'approved' ? 'Disetujui' : 'Ditolak',
        `Rp ${Number(item.amount).toLocaleString('id-ID')}`,
      ];
    });

    autoTable(doc, {
      startY: summaryY + 16,
      head: [['No', 'Tanggal', 'Waktu', 'Tenant', 'Tenant ID', 'Detail Rekening', 'Status', 'Nominal']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
      headStyles: {
        fillColor: [249, 115, 22], // orange-500
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 26 },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 40 },
        4: { cellWidth: 35, fontSize: 6 },
        5: { cellWidth: 60 },
        6: { halign: 'center', cellWidth: 25 },
        7: { halign: 'right', cellWidth: 30 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const val = data.cell.raw;
          if (val === 'Disetujui') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Ditolak') {
            data.cell.styles.textColor = [225, 29, 72];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Halaman ${i} dari ${pageCount}`, 283, 200, { align: 'right' });
      doc.text('Dicetak oleh AGRAPos Platform Console', 14, 200);
    }

    const fileName = `Laporan_Withdraw_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    showToast('Berhasil', `File ${fileName} berhasil diunduh!`, 'success');
    setShowExportMenu(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">💳</span>
            Penarikan Tunai (Withdraw)
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Menunggu Konfirmasi
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Riwayat Transaksi
            </button>
          </div>
        </div>

        {activeTab === 'pending' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={fetchRequests} className="text-sm font-bold text-orange-600 hover:text-orange-800 bg-orange-50 px-4 py-2 rounded-xl transition-colors">
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="text-center p-8 text-slate-400 font-bold">Memuat data...</div>
            ) : requests.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-slate-500 font-bold">Belum ada pengajuan withdraw baru.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div key={req.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">Pending</span>
                        <span className="text-xs text-slate-400 font-mono">{new Date(req.created_at).toLocaleString('id-ID')}</span>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 font-mono uppercase">WD-{req.id}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-0.5">{req.tenants?.tenant_name || 'Unknown Tenant'}</h3>
                      <div className="text-xs font-mono text-slate-500 mt-2 space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                        <p><span className="font-bold text-slate-600">Bank:</span> {req.bank_name}</p>
                        <p><span className="font-bold text-slate-600">No. Rek:</span> {req.account_number}</p>
                        <p><span className="font-bold text-slate-600">A.N:</span> {req.account_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 text-center md:text-right w-full md:w-auto">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nominal Tarik</p>
                      <p className="text-2xl font-black text-orange-600">Rp {Number(req.amount).toLocaleString('id-ID')}</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto justify-end">
                      <button 
                        onClick={() => handleAction(req.id, 'reject')}
                        disabled={processingId === req.id}
                        className="flex-1 md:flex-none px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                      >
                        Tolak
                      </button>
                      <button 
                        onClick={() => handleAction(req.id, 'approve')}
                        disabled={processingId === req.id}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        {processingId === req.id ? 'Memproses...' : 'Setujui & Transfer'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
                Log Riwayat Penarikan
              </h3>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 min-w-[200px] animate-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={exportToExcel}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-emerald-50 transition-colors text-left group"
                      >
                        <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold group-hover:scale-110 transition-transform">
                          📊
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Export Excel</p>
                          <p className="text-[10px] text-slate-400 font-medium">Format .xlsx dengan style</p>
                        </div>
                      </button>
                      <div className="border-t border-slate-100" />
                      <button
                        onClick={exportToPDF}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-rose-50 transition-colors text-left group"
                      >
                        <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold group-hover:scale-110 transition-transform">
                          📄
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Export PDF</p>
                          <p className="text-[10px] text-slate-400 font-medium">Laporan siap cetak</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
              <div className="flex flex-col flex-1">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Rentang Tanggal</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="date" 
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="flex-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-slate-300 font-bold">-</span>
                  <input 
                    type="date" 
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="flex-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex flex-col flex-1">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Cari Universal</label>
                <input 
                  type="text"
                  placeholder="Cari nama tenant, tenant ID, bank, no rek, status..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Result count badge */}
            {!loadingHistory && history.length > 0 && (
              <div className="flex items-center gap-2 -mt-2 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {history.length} transaksi ditemukan
                </span>
                {historySearch && (
                  <button 
                    onClick={() => setHistorySearch('')}
                    className="text-[10px] font-bold text-orange-500 hover:text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md transition-colors"
                  >
                    ✕ Hapus Pencarian
                  </button>
                )}
              </div>
            )}

            {loadingHistory ? (
              <div className="text-center p-8 text-slate-400 font-bold">Memuat riwayat...</div>
            ) : history.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-slate-500 font-bold">Belum ada riwayat penarikan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white hover:border-orange-200 transition-colors">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.status === 'rejected' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.status === 'rejected' ? "M6 18L18 6M6 6l12 12" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-sm">{item.tenants?.tenant_name || 'Unknown Tenant'}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{new Date(item.created_at).toLocaleString('id-ID')}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono uppercase ${item.status === 'rejected' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                            WD-{item.id}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {item.tenant_id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${item.status === 'rejected' ? 'text-rose-600 bg-rose-100' : 'text-emerald-600 bg-emerald-100'}`}>
                            {item.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 text-xs text-slate-500 font-medium">
                      <p>{item.bank_name} - {item.account_number}</p>
                      <p>a.n {item.account_name}</p>
                    </div>

                    <div className="text-left md:text-right w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nominal Tarik</p>
                      <p className={`text-lg font-black ${item.status === 'rejected' ? 'text-rose-600' : 'text-orange-600'}`}>
                        Rp {Number(item.amount).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
