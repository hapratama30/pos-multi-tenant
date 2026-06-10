// eslint-disable-next-line no-unused-vars
import React, { useRef } from 'react';
import html2canvas from 'html2canvas';

// eslint-disable-next-line no-unused-vars
export default function QrisStandarFrame({ staticQrString, tenantName = 'NAMA MERCHANT', nmid = 'ID1020304050607', tid = 'A01' }) {
  const printRef = useRef(null);

  const handleDownload = async () => {
    if (!printRef.current) return;
    try {
      const el = printRef.current;
      
      const canvas = await html2canvas(el, { 
        scale: 4, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        width: 420,
        height: 600,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('qris-frame-to-print');
          if (clonedEl) {
            clonedEl.style.transform = 'none';
            clonedEl.style.position = 'fixed';
            clonedEl.style.top = '0';
            clonedEl.style.left = '0';
            clonedEl.style.margin = '0';
            clonedEl.style.boxShadow = 'none';
            
            // Ensure instructions are visible
            const instructions = clonedEl.querySelector('.qris-instructions-container');
            if (instructions) {
              instructions.style.display = 'flex';
              instructions.style.visibility = 'visible';
              instructions.style.opacity = '1';
            }

            // Fix for SVG backgrounds in html2canvas
            const redTriangle = clonedEl.querySelector('.qris-red-triangle');
            if (redTriangle) {
              redTriangle.style.display = 'block';
            }
          }
        }
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `QRIS-${tenantName.replace(/\s+/g, '-')}.png`;
      link.click();
    } catch (err) {
      console.error('Error downloading QRIS:', err);
      alert('Gagal mendownload QRIS');
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-full">
      
      <div className="relative w-full flex justify-center items-start overflow-hidden py-10 bg-slate-100/30 rounded-xl" style={{ height: '480px' }}>
        <style>{`
          .qris-preview-scale {
            transform: scale(0.65);
            transform-origin: top center;
          }
          @media (min-width: 640px) {
            .qris-preview-scale {
              transform: scale(0.75);
            }
          }
          .qris-red-triangle {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 0 155px 240px;
            border-color: transparent transparent #ed2128 transparent;
            z-index: 1;
          }
          .qris-left-accent {
            position: absolute;
            top: 25%;
            left: 0;
            width: 55px;
            height: 110px;
            background-color: #ed2128;
            clip-path: polygon(0 0, 100% 30%, 100% 70%, 0 100%);
            z-index: 1;
          }
        `}</style>
        
        <div 
          id="qris-frame-to-print"
          ref={printRef}
          className="qris-preview-scale bg-white shadow-2xl shrink-0"
          style={{ 
            width: '420px', 
            height: '600px',
            minWidth: '420px',
            minHeight: '600px',
            fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
            color: 'black',
            overflow: 'hidden',
            position: 'relative',
            display: 'block',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Faint Grid Background - Adjusted to match standard QRIS pattern */}
          <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%23000' stroke-width='0.5'%3E%3Cpath d='M30 0v60M0 30h60'/%3E%3Crect x='25' y='25' width='10' height='10'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '30px 30px'
            }}
          />

          {/* Text Watermark "AGRAPos" */}
          <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
            <div style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='150' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='14' font-weight='900' font-family='sans-serif' fill='%23000' text-anchor='middle' dominant-baseline='middle' transform='rotate(-35 75 50)'%3EAGRAPos%3C/text%3E%3C/svg%3E")`,
              backgroundSize: '150px 100px',
              width: '200%',
              height: '200%',
              transform: 'rotate(0deg)'
            }} />
          </div>

          {/* Left Red Accent - Polygon shape like Gambar 2 */}
          <div className="qris-left-accent" />

          {/* Right Bottom Red Triangle */}
          <div className="qris-red-triangle" />

          {/* 1. Header Section */}
          <div className="absolute top-0 left-0 w-full flex justify-between items-start px-8 pt-8 z-10">
            <div className="flex items-start gap-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg" 
                alt="QRIS" 
                className="h-9 w-auto object-contain"
                crossOrigin="anonymous"
              />
              <div className="flex flex-col ml-1">
                <span className="text-[10px] font-black leading-none text-black">QR Code Standar</span>
                <span className="text-[10px] font-black leading-none text-black mt-0.5">Pembayaran Nasional</span>
              </div>
            </div>
            <img 
              src="https://i.ibb.co.com/S4PL5jzX/OIP-removebg-preview.png" 
              alt="GPN" 
              className="h-11 w-auto object-contain"
              crossOrigin="anonymous"
            />
          </div>

          {/* 2. Merchant Info */}
          <div className="absolute top-[100px] left-0 w-full text-center px-6 z-10">
            <h2 className="text-[22px] font-black text-black uppercase tracking-normal leading-tight mb-1">
              {tenantName}
            </h2>
            <p className="text-[16px] text-black font-medium tracking-tight">
              NMID : {nmid}
            </p>
            <p className="text-[16px] text-black font-medium mt-0.5">
              {tid}
            </p>
          </div>

          {/* 3. QR Code Section (Centered) */}
          <div className="absolute top-[200px] left-0 w-full flex flex-col items-center z-10">
            <div className="bg-white">
              <div className="w-[230px] h-[230px] bg-white flex items-center justify-center">
                {staticQrString ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(staticQrString)}&margin=0&ecc=H`} 
                    alt="QR Code"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-slate-100 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase">
                    Generating...
                  </div>
                )}
              </div>
            </div>

            {/* Slogan & URL */}
            <div className="text-center mt-7">
              <p className="text-[17px] font-black text-black tracking-[0.1em]">
                SATU QRIS UNTUK SEMUA
              </p>
              <div className="mt-2 flex flex-col items-center">
                <p className="text-[12px] text-black font-medium leading-tight">Cek aplikasi penyelenggara</p>
                <p className="text-[12px] text-black font-medium leading-tight">di: www.aspi-qris.id</p>
              </div>
            </div>
          </div>

          {/* 4. Footer Left (Print Info) */}
          <div className="absolute bottom-6 left-8 text-left z-10">
            <p className="text-[10px] text-black font-bold leading-tight">Dicetak oleh : 93600014</p>
            <p className="text-[10px] text-black font-bold mt-0.5 leading-tight">Versi Cetak : 1.0-2025.08.25</p>
          </div>

          {/* 5. Footer Right (Instructions inside red triangle) */}
          <div className="qris-instructions-container absolute bottom-0 right-0 flex flex-col items-end z-20 pr-5 pb-3.5">
            <p className="text-[7.5px] font-bold text-white mb-1.5 mr-2">Cara bayar dengan QRIS:</p>
            <div className="flex gap-1.5 items-start">
              <div className="flex flex-col items-center w-10">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm mb-1">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#ed2128">
                    <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14zM12 19c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM8 7h8v2H8V7z"/>
                  </svg>
                </div>
                <span className="text-[4px] font-bold text-white leading-tight uppercase text-center">Buka Aplikasi<br/>Berlogo QRIS</span>
              </div>
              <div className="flex flex-col items-center w-10">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm mb-1">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#ed2128">
                    <path d="M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm6 9l-4 4h3v4h2v-4h3l-4-4zM20 2h-7v2h7v7h2V4c0-1.1-.9-2-2-2zM4 20h7v2H4c-1.1 0-2-.9-2-2v-7h2v7zM20 20h-7v2h7c1.1 0 2-.9 2-2v-7h-2v7z"/>
                  </svg>
                </div>
                <span className="text-[4px] font-bold text-white leading-tight uppercase text-center">Scan & Cek<br/>Nominal</span>
              </div>
              <div className="flex flex-col items-center w-10">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm mb-1">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#ed2128">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <span className="text-[4px] font-bold text-white leading-tight uppercase text-center">Bayar</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <button 
        onClick={handleDownload}
        className="mt-6 bg-[#ed2128] hover:bg-red-700 text-white font-black py-4 px-12 rounded-2xl text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-red-200 transition-all active:scale-95 flex items-center gap-3"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download QRIS Resmi
      </button>
    </div>
  );
}
