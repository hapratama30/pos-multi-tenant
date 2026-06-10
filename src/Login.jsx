// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { updateJwtTenantMetadata } from './utils/authSession';
import { findStaffForLogin, linkStaffAuthUserId } from './utils/staffLookup';

export default function Login({ onLoginSuccess, onNavigateToRegister, onNavigateToLanding }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Kelola Banyak Cabang Tanpa Pusing",
      icon: "🏪",
      imageUrl: "https://ds393qgzrxwzn.cloudfront.net/resize/m720x480/cat1/img/images/0/CpKpKe6IK1.jpg",
    },
    {
      title: "Otomatisasi Laporan Keuangan",
      icon: "⚡",
      imageUrl: "https://sisi.id/wp-content/uploads/2023/05/12-Mei-Ketahui-Fungsi-Integrasi-Aplikasi-untuk-Tingkatkan-Efektifitas-dan-Efisiensi-Bisnis-1080px-web.jpg",
    },
    {
      title: "Kasir Anti-Lemot & Digital Payment",
      icon: "🚀",
      imageUrl: "https://www.paper.id/blog/wp-content/uploads/2020/11/ey-digital-payment-scaled-1.jpg",
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      // STEP 1: Auth Supabase
      const cleanEmail = email.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });
      if (authError) throw new Error("Email atau kata sandi salah. Silakan periksa kembali.");
      if (!authData?.user) throw new Error("Gagal mendapatkan data user.");

      const { staffData, staffError } = await findStaffForLogin(cleanEmail, authData.user.id);

      if (staffError || !staffData) {
        await supabase.auth.signOut();
        const detail = staffError?.message ? ` (${staffError.message})` : '';
        throw new Error(
          staffError
            ? `Gagal memuat data staff.${detail}`
            : 'Akun Auth ada, tapi belum terdaftar di tabel staff toko manapun. Daftar toko baru atau minta owner menambahkan email Anda sebagai staff.'
        );
      }
      if (staffData.status && staffData.status === 'Nonaktif') {
        await supabase.auth.signOut();
        throw new Error("Akses ditolak. Akun Anda telah dinonaktifkan.");
      }

      // STEP 3: Ambil tenant_name sekalian di sini — bukan di Dashboard
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('tenant_name, plan_id')
        .eq('tenant_id', staffData.tenant_id)
        .maybeSingle();

      await linkStaffAuthUserId(staffData.id, authData.user.id);
      await updateJwtTenantMetadata(staffData.tenant_id, staffData.role || 'Kasir', staffData.name);

      // STEP 4: Pass semua data ke App.jsx — termasuk tenant_name
      if (onLoginSuccess) {
        onLoginSuccess({
          id: staffData.id,
          staff_id: staffData.id,
          uid: authData.user.id,
          email: authData.user.email,
          tenant_id: staffData.tenant_id,
          tenant_name: tenantData?.tenant_name || 'Toko Anda',
          plan_id: tenantData?.plan_id || 'free',
          name: staffData.name,
          role: staffData.role || 'Kasir',
          permissions: staffData.permissions,
          outlet_id: staffData.outlet_id
        });
      }

    } catch (err) {
      setErrorMsg(err.message || 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100dvh',
      minHeight: '-webkit-fill-available',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#f8fafc',
      fontFamily: 'sans-serif',
      position: 'relative',
    }}>

      <style dangerouslySetInnerHTML={{__html: `
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

        .morph-teal   { animation: tealMorph 12s infinite ease-in-out; }
        .morph-orange { animation: orangeFloat 10s infinite ease-in-out; }
        .bar-teal     { animation: tealBar 10s infinite ease-in-out; }
        .bar-orange   { animation: orangeBlob 10s infinite ease-in-out; }
        .fade-up      { animation: fadeUp 0.3s ease-out forwards; }

        .carousel-vertical-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 600px;
          gap: 0.75rem;
          position: relative;
          z-index: 30;
          text-align: center;
        }
        .carousel-image-area {
          width: clamp(110px, 13vw, 150px);
          height: clamp(110px, 13vw, 150px);
          border-radius: 50%;
          background: white;
          padding: 5px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.22);
          border: 2px solid rgba(255,255,255,0.7);
          overflow: hidden;
          flex-shrink: 0;
        }
        .carousel-text-area { color: white; width: 100%; }
        .dots-flex { display: flex; gap: 6px; margin-top: 8px; justify-content: center; }

        @media (max-width: 767px) {
          .carousel-image-area { width: 90px; height: 90px; padding: 4px; }
          .carousel-vertical-container { gap: 0.5rem; }
          .dots-flex { margin-top: 6px; }
        }

        .login-input:focus {
          border-color: #0d9488 !important;
          box-shadow: 0 0 0 3px rgba(13,148,136,0.1);
        }
      `}} />

      {/* ── BANNER ── */}
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
        <div className="morph-orange" style={{
          position: 'absolute',
          top: '-45%', right: '-3rem',
          width: 'clamp(240px, 32vw, 450px)',
          height: 'clamp(240px, 32vw, 450px)',
          background: 'linear-gradient(135deg, #fb923c, #f97316)',
          zIndex: 10,
        }} />

        <div className="carousel-vertical-container">
          <div className="carousel-image-area">
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

          <div className="carousel-text-area">
            <div style={{ minHeight:'2.4rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {slides.map((slide, i) => i !== currentSlide ? null : (
                <div key={i} className="fade-up">
                  <div style={{ fontSize:'clamp(15px, 2vw, 21px)', fontWeight:900, lineHeight:1.25 }}>
                    {slide.icon} {slide.title}
                  </div>
                </div>
              ))}
            </div>
            <div className="dots-flex">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)} style={{
                  height:'6px', borderRadius:'99px', border:'none', cursor:'pointer',
                  width: i === currentSlide ? '26px' : '6px',
                  background: i === currentSlide ? '#fb923c' : 'rgba(255,255,255,0.35)',
                  transition:'all 0.3s', padding:0,
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD LOGIN ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '0',
        paddingBottom: '3.5rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        position: 'relative',
        zIndex: 30,
        marginTop: '-1.75rem',
        overflowY: 'auto',
      }}>
        <div style={{
          width: '100%', maxWidth: '440px',
          background: 'white',
          borderRadius: '1.75rem',
          border: '1px solid #f1f5f9',
          boxShadow: '0 20px 50px -10px rgba(15,23,42,0.13)',
          padding: 'clamp(0.9rem, 3vw, 1.5rem) clamp(1rem, 4vw, 1.75rem)',
        }}>

          {/* Branding */}
          <div style={{ textAlign:'center', marginBottom:'0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize:'clamp(17px,4vw,22px)', fontWeight:900, color:'#1e293b', letterSpacing:'-0.02em', lineHeight:1 }}>
              AGRA<span style={{ color:'#f97316' }}>Pos</span>
            </div>
            <div style={{ fontSize:'8.5px', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:'2px' }}>
              All In One General Retail Automation
            </div>
          </div>

          {errorMsg && (
            <div style={{
              marginBottom:'0.6rem', padding:'0.6rem 0.75rem',
              background:'#fff7ed', border:'1px solid #fed7aa',
              borderRadius:'12px', color:'#c2410c',
              fontSize:'11px', fontWeight:600, textAlign:'center',
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:'0.5rem' }}>
              <label style={{ display:'block', fontSize:'10.5px', fontWeight:700, color:'#64748b', marginBottom:'4px' }}>
                Alamat Email Karyawan
              </label>
              <input
                className="login-input"
                type="email" required placeholder="nama@tokomu.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:'12px', padding:'10px 14px',
                  fontSize:'13.5px', color:'#334155', outline:'none',
                  transition:'border 0.2s, box-shadow 0.2s',
                }}
              />
            </div>
            <div style={{ marginBottom:'0.65rem' }}>
              <label style={{ display:'block', fontSize:'10.5px', fontWeight:700, color:'#64748b', marginBottom:'4px' }}>
                Kata Sandi (Password)
              </label>
              <input
                className="login-input"
                type="password" required placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:'12px', padding:'10px 14px',
                  fontSize:'13.5px', color:'#334155', outline:'none',
                  transition:'border 0.2s, box-shadow 0.2s',
                }}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width:'100%', padding:'11px',
                background: loading ? '#94a3b8' : 'linear-gradient(to right, #0f766e, #0d9488)',
                color:'white', fontWeight:700, fontSize:'13.5px',
                border:'none', borderRadius:'12px', cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(13,148,136,0.25)',
                transition:'all 0.2s',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation:'spin 1s linear infinite' }} width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity:0.25 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path style={{ opacity:0.75 }} fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memverifikasi...
                </>
              ) : (
                <>Masuk Aplikasi <span style={{ fontSize:'15px' }}>›</span></>
              )}
            </button>
          </form>

          <div style={{
            marginTop:'0.6rem', paddingTop:'0.6rem',
            borderTop:'1px solid #f1f5f9', textAlign:'center',
            fontSize:'11px', color:'#94a3b8', fontWeight:500,
          }}>
            Belum punya akun toko?{' '}
            <button type="button" onClick={onNavigateToRegister} style={{
              color:'#f97316', fontWeight:700, background:'none',
              border:'none', cursor:'pointer',
            }}>
              Daftar Toko Baru
            </button>
          </div>
        </div>
      </div>

      {/* ── SHAPES BAWAH ── */}
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

      {/* ── FOOTER ── */}
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

    </div>
  );
}