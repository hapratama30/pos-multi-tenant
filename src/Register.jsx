// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { updateJwtTenantMetadata } from './utils/authSession';

export default function Register({ onNavigateToLogin, onRegisterSuccess, onNavigateToLanding }) {
  const [namaOwner, setNamaOwner]   = useState('');
  const [namaToko, setNamaToko]     = useState('');
  const [nomorHp, setNomorHp]       = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Daftar & Langsung Aktif",
      icon: "🏗️",
      imageUrl: "https://ds393qgzrxwzn.cloudfront.net/resize/m720x480/cat1/img/images/0/CpKpKe6IK1.jpg",
    },
    {
      title: "Kelola Semua Cabang",
      icon: "🏪",
      imageUrl: "https://sisi.id/wp-content/uploads/2023/05/12-Mei-Ketahui-Fungsi-Integrasi-Aplikasi-untuk-Tingkatkan-Efektifitas-dan-Efisiensi-Bisnis-1080px-web.jpg",
    },
    {
      title: "Laporan Profit Otomatis",
      icon: "📊",
      imageUrl: "https://www.paper.id/blog/wp-content/uploads/2020/11/ey-digital-payment-scaled-1.jpg",
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data: emailAvailable, error: checkError } = await supabase.rpc('check_registration_email', {
        p_email: cleanEmail,
      });

      if (checkError) throw checkError;
      if (!emailAvailable) {
        throw new Error("Email ini sudah terdaftar di sistem.");
      }

      const phoneClean = nomorHp.trim();
      const phoneDigits = phoneClean.replace(/\D/g, '');
      if (!phoneClean) {
        throw new Error('Nomor HP / WhatsApp wajib diisi agar tim kami bisa menghubungi Anda.');
      }
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        throw new Error('Nomor HP / WhatsApp tidak valid (min. 10 digit).');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            name: namaOwner.trim(),
            role: 'Owner',
          },
        },
      });

      if (authError) throw authError;
      if (!authData?.user) {
        throw new Error("Gagal mendaftarkan autentikasi user.");
      }

      const { data: regData, error: regError } = await supabase.rpc('complete_tenant_registration', {
        p_tenant_name: namaToko.trim(),
        p_phone: phoneClean,
        p_owner_name: namaOwner.trim(),
      });

      if (regError) {
        if (regError.message?.includes('email_already_registered')) {
          throw new Error('Email ini sudah terdaftar di sistem.');
        }
        if (regError.message?.includes('not_authenticated')) {
          throw new Error('Sesi belum aktif. Jika konfirmasi email wajib, cek inbox lalu login.');
        }
        throw regError;
      }

      const newTenantId = regData?.tenant_id;
      if (!newTenantId) {
        throw new Error('Gagal membuat tenant. Jalankan migration 015 di Supabase.');
      }

      await updateJwtTenantMetadata(newTenantId, 'Owner', namaOwner.trim());

      setSuccessMsg("Pendaftaran toko berhasil! Sistem multi-tenant siap digunakan.");
      
      if (onRegisterSuccess) {
        setTimeout(() => {
          onRegisterSuccess({
            uid: authData.user.id,
            email: authData.user.email,
            tenant_id: newTenantId,
            name: namaOwner.trim(),
            role: 'Owner'
          });
        }, 1500);
      }

    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat mendaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100dvh',       /* dynamic viewport height — works di mobile browser */
      minHeight: '-webkit-fill-available',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#f8fafc',
      fontFamily: 'sans-serif',
      position: 'relative',
    }}>

      <style dangerouslySetInnerHTML={{__html: `
        /* Semua height pakai dvh agar address bar mobile tidak ganggu */
        html, body { height: 100%; margin: 0; }

        @keyframes tealMorph {
          0%,100% { border-radius: 0 0 30% 40%; }
          33% { border-radius: 0 0 44% 26%; transform: scaleY(1.012); }
          66% { border-radius: 0 0 28% 48%; transform: scaleY(0.991); }
        }
        @keyframes orangeFloat {
          0%,100% { border-radius:42% 58% 36% 64%/52% 44% 56% 48%; transform:translate(0,0) rotate(0deg); }
          50% { border-radius:58% 42% 54% 46%/44% 56% 44% 56%; transform:translate(-8px,10px) rotate(4deg) scale(1.03); }
        }
        @keyframes tealBar {
          0%,100% { left:-2rem; width:56vw; height:2.8rem; border-radius:2rem; bottom:0.3rem; }
          45%,55%  { left:calc(100% - 9.5rem); width:12rem; height:12rem; border-radius:50%; bottom:-2.5rem; }
        }
        @keyframes orangeBlob {
          0%,100% { left:-2.5rem; width:9rem; height:9rem; border-radius:50%; bottom:-1rem; }
          45%,55%  { left:calc(100% - 43vw); width:46vw; height:2.8rem; border-radius:2rem; bottom:0.3rem; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .morph-teal   { animation: tealMorph 12s infinite ease-in-out; }
        .morph-orange { animation: orangeFloat 10s infinite ease-in-out; }
        .bar-teal     { animation: tealBar 10s infinite ease-in-out; }
        .bar-orange   { animation: orangeBlob 10s infinite ease-in-out; }
        .fade-up      { animation: fadeUp 0.3s ease-out forwards; }
      `}} />

      {/* ── BANNER ASLI (TIDAK DIUBAH) ── */}
      {onNavigateToLanding && (
        <button
          type="button"
          onClick={onNavigateToLanding}
          style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 50,
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)', borderRadius: '99px',
            padding: '6px 12px', color: 'white', fontSize: '10px',
            fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          ← Beranda
        </button>
      )}
      <div className="morph-teal" style={{
        flex: '0 0 36%',
        background: '#0d9488',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        paddingBottom: '2.5rem',
      }}>
        {/* Blob orange */}
        <div className="morph-orange" style={{
          position: 'absolute',
          top: '-45%', right: '-3rem',
          width: 'clamp(240px, 90vw, 450px)',
          height: 'clamp(240px, 50vw, 450px)',
          background: 'linear-gradient(135deg, #fb923c, #f97316)',
          zIndex: 10,
        }} />

        {/* Carousel asli bawaan kode Anda */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxHeight: '100%',
          position: 'relative',
          zIndex: 30,
          textAlign: 'center',
        }}>
          {/* Foto bulat */}
          <div style={{
            width: 'clamp(110px, 13vw, 150px)',
            height: 'clamp(110px, 13vw, 150px)',
            borderRadius: '50%',
            background: 'white',
            padding: '5px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
            border: '2px solid rgba(255,255,255,0.7)',
            overflow: 'hidden',
            marginBottom: '0.75rem',
            flexShrink: 0
          }}>
            <div style={{ width:'100%', height:'100%', borderRadius:'50%', overflow:'hidden', position:'relative', background:'#e2e8f0' }}>
              {slides.map((slide, i) => (
                <img key={i} src={slide.imageUrl} alt={slide.title} style={{
                  position:'absolute', inset:0, width:'100%', height:'100%',
                  objectFit:'cover', objectPosition:'center',
                  transition:'opacity 0.5s',
                  opacity: i === currentSlide ? 1 : 0,
                }} />
              ))}
            </div>
          </div>

          {/* Judul teks */}
          <div style={{ color: 'white', width: '100%' }}>
            <div style={{ minHeight: '2.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {slides.map((slide, i) => i !== currentSlide ? null : (
                <div key={i} className="fade-up">
                  <div style={{ fontSize: 'clamp(15px, 2vw, 21px)', fontWeight: 900, lineHeight: 1.25 }}>
                    {slide.icon} {slide.title}
                  </div>
                </div>
              ))}
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'center' }}>
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)} style={{
                  height:'6px', borderRadius:'99px', border:'none', cursor:'pointer',
                  width: i === currentSlide ? '26px' : '6px',
                  background: i === currentSlide ? '#fb923c' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.3s',
                  padding: 0,
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* ── REVISI CONTAINER: CARD PROPORSIONAL DI TENGAH, TIDAK NABRAK JUDUL CAROUSEL ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: '',       /* Kembali center secara vertikal di sisa ruang */
        justifyContent: 'center',   
        paddingLeft: '1rem',
        paddingRight: '1rem',
        paddingTop: '0',
        paddingBottom: '0',         
        position: 'relative',
        zIndex: 40,
        transform: 'translateY(-2.2rem)', /* Efek mengambang naik yang aman tanpa merusak struktur flex atas */
        overflow: 'hidden',         
      }}>
        <div style={{
          width: '100%', maxWidth: '440px',
          background: 'white',
          borderRadius: '1.75rem',
          border: '1px solid #f1f5f9',
          boxShadow: '0 20px 50px -10px rgba(15,23,42,0.13)',
          padding: 'clamp(0.7rem, 1.8vw, 1.1rem) clamp(1rem, 4vw, 1.5rem)', 
        }}>
          {/* Branding */}
          <div style={{ textAlign:'center', marginBottom:'0.4rem' }}>
            <div style={{
              width:'30px', height:'30px',
              background:'linear-gradient(135deg,#0f766e,#0d9488)',
              borderRadius:'9px', display:'flex', alignItems:'center',
              justifyContent:'center', margin:'0 auto 4px',
              boxShadow:'0 4px 12px rgba(13,148,136,0.2)',
              transform:'rotate(3deg)',
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div style={{ fontSize:'clamp(15px,3.6vw,19px)', fontWeight:900, color:'#1e293b', letterSpacing:'-0.02em', lineHeight:1 }}>
              AGRA<span style={{ color:'#f97316' }}>Pos</span>
            </div>
            <div style={{ fontSize:'7.5px', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:'2px' }}>
              All In One General Retail Automation
            </div>
          </div>

          {errorMsg && (
            <div style={{
              marginBottom:'0.4rem', padding:'0.4rem 0.6rem',
              background:'#fff7ed', border:'1px solid #fed7aa',
              borderRadius:'10px', color:'#c2410c',
              fontSize: '10px', fontWeight:600, textAlign:'center',
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{
              marginBottom:'0.4rem', padding:'0.4rem 0.6rem',
              background:'#f0fdf4', border:'1px solid #bbf7d0',
              borderRadius:'10px', color:'#16a34a',
              fontSize: '10px', fontWeight:600, textAlign:'center',
            }}>
              🎉 {successMsg}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div style={{ marginBottom:'0.35rem' }}>
              <label style={{ display:'block', fontSize:'9.5px', fontWeight:700, color:'#64748b', marginBottom:'2px' }}>
                Nama Lengkap Pemilik (Owner)
              </label>
              <input
                type="text" required placeholder="Contoh: Budi Santoso"
                value={namaOwner} onChange={(e) => setNamaOwner(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:'10px', padding:'7px 11px',
                  fontSize:'12.5px', color:'#334155', outline:'none',
                }}
              />
            </div>

            <div style={{ marginBottom:'0.35rem' }}>
              <label style={{ display:'block', fontSize:'9.5px', fontWeight:700, color:'#64748b', marginBottom:'2px' }}>
                Nama Bisnis / Toko Utama
              </label>
              <input
                type="text" required placeholder="Contoh: Berkah Jaya Mart"
                value={namaToko} onChange={(e) => setNamaToko(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:'10px', padding:'7px 11px',
                  fontSize:'12.5px', color:'#334155', outline:'none',
                }}
              />
            </div>

            <div style={{ marginBottom:'0.35rem' }}>
              <label style={{ display:'block', fontSize:'9.5px', fontWeight:700, color:'#64748b', marginBottom:'2px' }}>
                Nomor HP / WhatsApp
              </label>
              <input
                type="tel" required placeholder="Contoh: 081234567890"
                value={nomorHp} onChange={(e) => setNomorHp(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:'10px', padding:'7px 11px',
                  fontSize:'12.5px', color:'#334155', outline:'none',
                }}
              />
            </div>

            <div style={{ marginBottom:'0.35rem' }}>
              <label style={{ display:'block', fontSize:'9.5px', fontWeight:700, color:'#64748b', marginBottom:'2px' }}>
                Alamat Email Owner
              </label>
              <input
                type="email" required placeholder="owner@tokomu.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:'10px', padding:'7px 11px',
                  fontSize:'12.5px', color:'#334155', outline:'none',
                }}
              />
            </div>

            <div style={{ marginBottom:'0.5rem' }}>
              <label style={{ display:'block', fontSize:'9.5px', fontWeight:700, color:'#64748b', marginBottom:'2px' }}>
                Kata Sandi Baru (Min. 6 Karakter)
              </label>
              <input
                type="password" required placeholder="••••••••" minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:'10px', padding:'7px 11px',
                  fontSize:'12.5px', color:'#334155', outline:'none',
                }}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width:'100%', padding:'9px',
                background:'linear-gradient(to right, #0f766e, #0d9488)',
                color:'white', fontWeight:700, fontSize:'13px',
                border:'none', borderRadius:'10px', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                boxShadow:'0 4px 14px rgba(13,148,136,0.25)',
                opacity: loading ? 0.7 : 1,
                transition:'all 0.2s',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation:'spin 1s linear infinite' }} width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity:0.25 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path style={{ opacity:0.75 }} fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Membuat Sistem Tenant...
                </>
              ) : (
                <>Daftarkan Toko Sekarang <span style={{ fontSize:'13px' }}>›</span></>
              )}
            </button>
          </form>

          <div style={{
            marginTop:'0.45rem', paddingTop:'0.45rem',
            borderTop:'1px solid #f1f5f9', textAlign:'center',
            fontSize:'11px', color:'#94a3b8', fontWeight:500,
          }}>
            Sudah memiliki akun owner?{' '}
            <button type="button" onClick={onNavigateToLogin} style={{
              color:'#f97316', fontWeight:700, background:'none',
              border:'none', cursor:'pointer', textDecoration:'none',
            }}>
              Masuk Aplikasi
            </button>
          </div>
        </div>
      </div>


      {/* ── SHAPES BAWAH (fixed) ── */}
      <div style={{ position:'fixed', left:0, bottom:0, width:'100%', height:'4rem', pointerEvents:'none', zIndex:0 }}>
        <div className="bar-teal" style={{
          position:'absolute', bottom:0,
          background:'linear-gradient(135deg,#14b8a6,#0d9488)',
          boxShadow:'0 -6px 20px rgba(13,148,136,0.12)',
        }} />
        <div className="bar-orange" style={{
          position:'absolute', bottom:0,
          background:'linear-gradient(135deg,#fb923c,#f97316)',
          boxShadow:'0 -6px 20px rgba(249,115,22,0.12)',
        }} />
      </div>

      {/* ── FOOTER (fixed) ── */}
      <div style={{
        position:'fixed', bottom:0, left:0, width:'100%',
        display:'flex', justifyContent:'center',
        paddingBottom:'4px', zIndex:10, pointerEvents:'none',
      }}>
        <div style={{
          display:'flex', alignItems:'center', gap:'6px',
          fontSize:'9px', color:'#94a3b8', fontWeight:700,
          textTransform:'uppercase', letterSpacing:'0.08em',
          background:'rgba(255,255,255,0.92)',
          backdropFilter:'blur(8px)',
          padding:'4px 12px', borderRadius:'99px',
          border:'1px solid rgba(226,232,240,0.6)',
          boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
          pointerEvents:'auto',
        }}>
          <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', display:'inline-block', animation:'pulse 2s infinite' }} />
          AGRAPos v1.0.0 • Supabase Engine
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.4; }
        }
      `}} />
    </div>
  );
}