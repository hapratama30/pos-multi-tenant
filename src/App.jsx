// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { restoreAuthSession, persistUserSession, subscribeAuthChanges } from './utils/authSession';

// =====================================================================
// IMPORT KOMPONEN INTERNAL
// =====================================================================
import Login from './Login'; 
import Register from './Register'; 
import LandingPage from './LandingPage';
import SuperAdminLanding from './SuperAdminLanding';
import LegalPage from './LegalPage';
import { shouldOpenSuperAdminFromUrl, clearSuperAdminUrl, isSuperAdminUnlocked, lockSuperAdmin } from './utils/landingContent';
import Dashboard from './components/Dashboard';
import PosOverlay from './components/PosOverlay';
import History from './components/History';
import Settings from './components/Settings';
import Laporan from './components/Laporan';
import KatalogProduk from './components/KatalogProduk';
import CustomerManager from './components/CustomerManager';
import VariantManagement from './components/VariantManagement';
import StockManager from './components/StockManager'; 
import DiscountManager from './components/DiscountManager'; 
import StaffManager from './components/StaffManager';
import ExpenseManager from './components/ExpenseManager';
import OutletManager from './components/OutletManager';
import CashShiftManager from './components/CashShiftManager';
import PpobHistory from './components/PpobHistory';
import PpobTopup from './components/PpobTopup';
import PpobWithdraw from './components/PpobWithdraw';
// Modul vertikal dihapus sementara

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.substring(1); // remove leading slash
      const parts = path.split('/');
      const tabName = parts[0];
      const validTabs = [
        'dashboard', 'pos', 'history', 'catalog', 'variants', 'customers',
        'stock', 'discounts', 'expenses', 'reports', 'employees', 'outlets',
        'shifts', 'ppob-history', 'ppob-topup', 'ppob-withdraw', 'settings'
      ];
      if (validTabs.includes(tabName)) return tabName;
    }
    return localStorage.getItem('pos_active_tab') || 'dashboard';
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTriggerModule, setUpgradeTriggerModule] = useState('');

  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const parts = path.substring(1).split('/');
      if (parts[0] === 'settings' && parts[1]) {
        return parts[1];
      }
    }
    return 'menu';
  });

  const triggerUpgrade = (moduleName) => {
    setUpgradeTriggerModule(moduleName || '');
    setShowUpgradeModal(true);
  };

  const [platformSettings, setPlatformSettings] = useState(null);
  const [featurePopup, setFeaturePopup] = useState(null);

  const triggerFeaturePopup = (moduleId) => {
    const config = platformSettings?.pos_features?.[moduleId];
    const labels = {
      'pos': 'Kasir POS',
      'history': 'Riwayat Transaksi',
      'catalog': 'Katalog Produk',
      'variants': 'Varian Produk',
      'customers': 'Member & Pelanggan',
      'stock': 'Stok Bahan',
      'discounts': 'Diskon & Promo',
      'expenses': 'Beli & Pengeluaran',
      'reports': 'Laporan & Analitik',
      'staff': 'Manajemen Staff',
      'outlets': 'Multi Outlet',
      'shifts': 'Shift Kas',
      'ppob': 'Tagihan PPOB'
    };
    setFeaturePopup({
      title: labels[moduleId] || moduleId,
      message: config?.popupMessage || 'Fitur ini sedang dalam pengembangan / pemeliharaan. Silakan coba beberapa saat lagi.'
    });
  };


  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState(null);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(null);

  const [authPage, setAuthPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/terms' || path === '/terms-and-conditions') return 'terms';
      if (path === '/refund' || path === '/refund-policy') return 'refund';
      if (path === '/privacy' || path === '/privacy-policy') return 'privacy';
      if (path === '/login') return 'login';
      if (path === '/register') return 'register';

      if (window.location.hash === '#platform-admin') return 'superadmin';
      if (shouldOpenSuperAdminFromUrl()) return 'superadmin';
      if (isSuperAdminUnlocked()) return 'superadmin';
    }
    return 'landing';
  });

  const [authLoading, setAuthLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('pos_current_user');
  });

  const tenantId = currentUser?.tenant_id || null;

  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setAuthLoading(false);
    }, 3500);

    const initAuth = async () => {
      try {
        const user = await restoreAuthSession();
        if (cancelled) return;
        setCurrentUser(user);
      } catch (err) {
        console.warn('Auth init gagal:', err);
        if (!cancelled) {
          localStorage.removeItem('pos_current_user');
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          clearTimeout(safetyTimer);
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const unsub = subscribeAuthChanges((user) => {
      if (user) setCurrentUser(user);
      else setCurrentUser(null);
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      unsub();
    };
  }, []);

  const fetchPlatformSettings = () => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/platform-settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlatformSettings(data.features || {});
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchPlatformSettings();
    if (activeTab === 'dashboard') {
      fetchPlatformSettings();
    }
  }, [activeTab]);

  // Fungsi penarikan data transaksi yang terisolasi ketat sesuai tenant_id pengguna riil
  const fetchTransactions = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Gagal memuat data transaksi Supabase:', err.message);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
  }, [tenantId, activeTab]);

  const fetchOutlets = async () => {
    if (!tenantId) {
      setOutlets([]);
      setSelectedOutletId(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('tenant_id', tenantId)
        // Hapus filter ketat is_active karena cabang baru tadinya null (bukan true)
        // Kita izinkan cabang yang is_active-nya null atau true.
        .or('is_active.is.null,is_active.eq.true')
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setOutlets(data || []);

      // Menentukan outlet aktif pertama kali
      const savedOutletId = localStorage.getItem(`pos_selected_outlet_${tenantId}`);
      if (savedOutletId && (data || []).some(o => String(o.id) === savedOutletId)) {
        setSelectedOutletId(Number(savedOutletId));
      } else if (currentUser?.outlet_id && (data || []).some(o => o.id === currentUser.outlet_id)) {
        setSelectedOutletId(currentUser.outlet_id);
      } else if (data && data.length > 0) {
        setSelectedOutletId(data[0].id);
        localStorage.setItem(`pos_selected_outlet_${tenantId}`, data[0].id);
      } else {
        setSelectedOutletId(null);
      }
    } catch (err) {
      console.error('Gagal memuat cabang:', err.message);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOutlets();
  }, [tenantId, currentUser?.outlet_id]);

  const handleOutletChange = (outletId) => {
    const parsedId = outletId ? Number(outletId) : null;
    setSelectedOutletId(parsedId);
    if (parsedId) {
      localStorage.setItem(`pos_selected_outlet_${tenantId}`, parsedId);
    } else {
      localStorage.removeItem(`pos_selected_outlet_${tenantId}`);
    }
    const branchName = outlets.find(o => o.id === parsedId)?.name || 'Semua Cabang';
    showNotification(`Cabang aktif diubah ke: ${branchName}`);
  };

  const filteredTransactionsForOutlet = useMemo(() => {
    if (!selectedOutletId) return transactions;
    const isMain = outlets.find(o => String(o.id) === String(selectedOutletId))?.is_main;
    return transactions.filter(t => 
      String(t.outlet_id) === String(selectedOutletId) || 
      (isMain && (!t.outlet_id || String(t.outlet_id) === 'null'))
    );
  }, [transactions, selectedOutletId, outlets]);


  // Akses rahasia CMS dan routing halaman hukum (SPA)
  useEffect(() => {
    const handleLocationChange = () => {
      if (shouldOpenSuperAdminFromUrl()) {
        setAuthPage('superadmin');
        clearSuperAdminUrl();
        return;
      }

      if (authPage === 'superadmin') {
        return;
      }

      const path = window.location.pathname;
      const pathParts = path.substring(1).split('/');
      if (pathParts[0] === 'settings' && pathParts[1]) {
        setActiveSubTab(pathParts[1]);
      } else {
        setActiveSubTab('menu');
      }

      if (path === '/terms' || path === '/terms-and-conditions') {
        setAuthPage('terms');
      } else if (path === '/refund' || path === '/refund-policy') {
        setAuthPage('refund');
      } else if (path === '/privacy' || path === '/privacy-policy') {
        setAuthPage('privacy');
      } else if (path === '/login') {
        if (currentUser) {
          setAuthPage('dashboard');
          setActiveTab('dashboard');
          window.history.replaceState(null, '', '/dashboard');
        } else {
          setAuthPage('login');
        }
      } else if (path === '/register') {
        if (currentUser) {
          setAuthPage('dashboard');
          setActiveTab('dashboard');
          window.history.replaceState(null, '', '/dashboard');
        } else {
          setAuthPage('register');
        }
      } else if (path === '/' || path === '') {
        if (currentUser) {
          setAuthPage('dashboard');
          setActiveTab('dashboard');
          window.history.replaceState(null, '', '/dashboard');
        } else {
          setAuthPage('landing');
        }
      } else {
        // Ini adalah subpage tab ketika user sudah login (misal /catalog atau /settings/profile)
        const parts = path.substring(1).split('/');
        const tabName = parts[0];
        const validTabs = [
          'dashboard', 'pos', 'history', 'catalog', 'variants', 'customers',
          'stock', 'discounts', 'expenses', 'reports', 'employees', 'outlets',
          'shifts', 'ppob-history', 'ppob-topup', 'ppob-withdraw', 'settings'
        ];
        if (validTabs.includes(tabName)) {
          if (currentUser) {
            setAuthPage('dashboard'); // Pastikan authPage diset agar login view dirender
            if (hasPermission(tabName)) {
              setActiveTab(tabName);
              localStorage.setItem('pos_active_tab', tabName);
            } else {
              setActiveTab('dashboard');
              localStorage.setItem('pos_active_tab', 'dashboard');
            }
          } else {
            // Jika belum login tapi akses /catalog, arahkan ke login
            setAuthPage('login');
            window.history.replaceState(null, '', '/login');
          }
        }
      }
    };

    handleLocationChange();
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('pushstate-changed', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate-changed', handleLocationChange);
    };
  }, [currentUser, authPage]);

  const hasPermission = (tabName) => {
    if (!currentUser) return false;

    // 0. Global Feature Gating (Hidden features check)
    const tabToModuleMap = {
      'pos': 'pos',
      'history': 'history',
      'catalog': 'catalog',
      'variants': 'variants',
      'customers': 'customers',
      'stock': 'stock',
      'discounts': 'discounts',
      'expenses': 'expenses',
      'reports': 'reports',
      'employees': 'staff',
      'outlets': 'outlets',
      'shifts': 'shifts',
      'ppob-history': 'ppob',
      'ppob-topup': 'ppob',
      'ppob-withdraw': 'ppob'
    };
    const requiredModule = tabToModuleMap[tabName];
    if (requiredModule && platformSettings?.pos_features?.[requiredModule]?.status === 'hidden') {
      return false;
    }

    // 1. SaaS Gating Check (berlaku untuk Owner dan Admin)
    const baseTabs = ['dashboard', 'settings'];
    if (!baseTabs.includes(tabName)) {
      const enabledModules = Array.isArray(currentUser.enabled_modules) ? currentUser.enabled_modules : [];
      const tabToModuleMap = {
        'pos': 'pos',
        'history': 'history',
        'catalog': 'catalog',
        'variants': 'variants',
        'customers': 'customers',
        'stock': 'stock',
        'discounts': 'discounts',
        'expenses': 'expenses',
        'reports': 'reports',
        'employees': 'staff',
        'outlets': 'outlets',
        'shifts': 'shifts',
        'ppob-history': 'ppob',
        'ppob-topup': 'ppob',
        'ppob-withdraw': 'ppob'
      };
      const requiredModule = tabToModuleMap[tabName];
      if (requiredModule && !enabledModules.includes('all') && !enabledModules.includes(requiredModule)) {
        return false;
      }
    }

    // 2. Role-Based Access Control (RBAC)
    if (currentUser.role === 'Owner' || currentUser.role === 'Admin') return true;
    const userPerms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    if (['dashboard', 'settings', 'ppob-history', 'ppob-topup', 'ppob-withdraw'].includes(tabName)) return true;
    if (tabName === 'employees') return userPerms.includes('settings');
    return userPerms.includes(tabName);
  };

  useEffect(() => {
    if (currentUser && activeTab !== 'dashboard' && !hasPermission(activeTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('dashboard');
      localStorage.setItem('pos_active_tab', 'dashboard');
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.tab) {
        if (hasPermission(event.state.tab)) {
          setActiveTab(event.state.tab);
          localStorage.setItem('pos_active_tab', event.state.tab);
        } else {
          setActiveTab('dashboard');
          localStorage.setItem('pos_active_tab', 'dashboard');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  const handleTabChange = (tabName) => {
    // Intercept if feature status is 'popup'
    const tabToModuleMap = {
      'pos': 'pos', 'history': 'history', 'catalog': 'catalog', 'variants': 'variants',
      'customers': 'customers', 'stock': 'stock', 'discounts': 'discounts', 'expenses': 'expenses',
      'reports': 'reports', 'employees': 'staff', 'outlets': 'outlets', 'shifts': 'shifts',
      'ppob-history': 'ppob', 'ppob-topup': 'ppob', 'ppob-withdraw': 'ppob'
    };
    const requiredModule = tabToModuleMap[tabName];
    if (requiredModule && platformSettings?.pos_features?.[requiredModule]?.status === 'popup') {
      triggerFeaturePopup(requiredModule);
      return;
    }

    if (!hasPermission(tabName)) {
      const baseTabs = ['dashboard', 'settings'];
      if (!baseTabs.includes(tabName)) {
        const enabledModules = Array.isArray(currentUser?.enabled_modules) ? currentUser.enabled_modules : [];
        const tabToModuleMap = {
          'pos': 'pos', 'history': 'history', 'catalog': 'catalog', 'variants': 'variants',
          'customers': 'customers', 'stock': 'stock', 'discounts': 'discounts', 'expenses': 'expenses',
          'reports': 'reports', 'employees': 'staff', 'outlets': 'outlets', 'shifts': 'shifts',
          'ppob-history': 'ppob', 'ppob-topup': 'ppob', 'ppob-withdraw': 'ppob'
        };
        const requiredModule = tabToModuleMap[tabName];
        if (requiredModule && !enabledModules.includes('all') && !enabledModules.includes(requiredModule)) {
          triggerUpgrade(requiredModule);
          return;
        }
      }
      showNotification(`AKSES DITOLAK: ANDA TIDAK MEMILIKI IZIN MENU TERSEBUT.`);
      return;
    }
    setActiveTab(tabName);
    localStorage.setItem('pos_active_tab', tabName);
    window.history.pushState({ tab: tabName }, '', `/${tabName}`);
  };

  const showNotification = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  // HANDLER LOGIN SUKSES
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    persistUserSession(userData);
    setActiveTab('dashboard');
    window.history.pushState(null, '', '/dashboard');
    window.dispatchEvent(new Event('pushstate-changed'));
    showNotification(`SELAMAT DATANG, ${userData.name.toUpperCase()}!`);
  };

  // HANDLER LOGOUT GLOBAL
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('pos_current_user');
    localStorage.removeItem('pos_active_tab');
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new Event('pushstate-changed'));
    setActiveTab('dashboard');
  };

  // =====================================================================
  // PROTEKSI GERBANG AUTENTIKASI (MULTI-TENANT GATEKEEPER)
  // =====================================================================
  // Prioritas Utama: SuperAdmin (jika unlocked atau URL rahasia aktif)
  const isSuperAdminMode = authPage === 'superadmin' || isSuperAdminUnlocked();
  
  if (isSuperAdminMode) {
    const superAdminSection = typeof window !== 'undefined' && window.location.hash === '#platform-admin'
      ? 'tenants'
      : 'overview';
    return (
      <SuperAdminLanding
        initialSection={superAdminSection}
        onBack={() => {
          lockSuperAdmin(); // Pastikan sesi dihapus jika ingin kembali ke landing
          setAuthPage(currentUser ? 'dashboard' : 'landing');
        }}
        onPreview={() => setAuthPage(currentUser ? 'dashboard' : 'landing')}
      />
    );
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulseScale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .loading-logo-anim {
            animation: pulseScale 2s ease-in-out infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spinner-anim {
            border: 3px solid rgba(15, 139, 107, 0.2);
            border-top: 3px solid #0f8b6b;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
          }
        `}} />
        <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" className="loading-logo-anim" style={{ width: '180px', height: 'auto', marginBottom: '24px' }} />
        <div className="spinner-anim"></div>
      </div>
    );
  }

  // Cek apakah halaman legal sedang aktif (tidak memerlukan login)
  if (['terms', 'privacy', 'refund'].includes(authPage)) {
    return (
      <LegalPage
        type={authPage}
        isLoggedIn={!!currentUser}
        onNavigateToHome={() => {
          if (currentUser) {
            window.history.pushState(null, '', '/settings/legal');
          } else {
            window.history.pushState(null, '', '/');
          }
          window.dispatchEvent(new Event('pushstate-changed'));
        }}
      />
    );
  }

  if (!currentUser) {
    if (authPage === 'landing') {
      return (
        <LandingPage
          onNavigateToLogin={() => {
            window.history.pushState(null, '', '/login');
            window.dispatchEvent(new Event('pushstate-changed'));
          }}
          onNavigateToRegister={() => {
            window.history.pushState(null, '', '/register');
            window.dispatchEvent(new Event('pushstate-changed'));
          }}
        />
      );
    }
    if (authPage === 'register') {
      return (
        <Register 
          onNavigateToLogin={() => {
            window.history.pushState(null, '', '/login');
            window.dispatchEvent(new Event('pushstate-changed'));
          }} 
          onRegisterSuccess={() => {
            window.history.pushState(null, '', '/login');
            window.dispatchEvent(new Event('pushstate-changed'));
          }}
          onNavigateToLanding={() => {
            window.history.pushState(null, '', '/');
            window.dispatchEvent(new Event('pushstate-changed'));
          }}
        />
      );
    }
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onNavigateToRegister={() => {
          window.history.pushState(null, '', '/register');
          window.dispatchEvent(new Event('pushstate-changed'));
        }}
        onNavigateToLanding={() => {
          window.history.pushState(null, '', '/');
          window.dispatchEvent(new Event('pushstate-changed'));
        }}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      color: '#334155',
      position: 'relative',
      userSelect: 'none',
      width: '100%',
      fontFamily: 'sans-serif',
      overflowX: 'hidden' /* Mencegah horizontal scroll */
    }}>
      
      {/* ── REKAYASA STYLE SHAPES, ANIMASI MANIS, DAN RESPONSIVITAS ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        .app-bg-shape-teal {
          position: fixed; top: -8rem; left: -8rem; width: 32rem; height: 32rem;
          background: radial-gradient(circle, rgba(13,148,136,0.06) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%; pointer-events: none; z-index: 0; animation: floatSlow 14s infinite ease-in-out;
        }
        .app-bg-shape-orange {
          position: fixed; bottom: -6rem; right: -6rem; width: 28rem; height: 28rem;
          background: radial-gradient(circle, rgba(249,115,22,0.05) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%; pointer-events: none; z-index: 0; animation: floatSlow 11s infinite ease-in-out reverse;
        }

        /* ── ANIMASI MANIS UNTUK ITEM NAVIGASI BAWAH ── */
        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px 0;
          flex: 1; 
          position: relative;
          z-index: 20;
          color: rgba(255,255,255,0.6);
          /* Bouncy transition buat hover & active */
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .bottom-nav-item svg {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .bottom-nav-item span {
          transition: all 0.3s ease;
          opacity: 0.8;
        }

        /* HOVER EFFECT: Icon loncat dikit membesar, teks turun dikit */
        .bottom-nav-item:hover {
          color: rgba(255,255,255,0.9);
        }
        .bottom-nav-item:hover svg {
          transform: translateY(-4px) scale(1.15);
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
        }
        .bottom-nav-item:hover span {
          transform: translateY(2px);
          opacity: 1;
        }

        /* ACTIVE STATE: State waktu tab lagi dibuka */
        .bottom-nav-item.active {
          color: #ffffff;
        }
        .bottom-nav-item.active svg {
          transform: translateY(-2px) scale(1.1);
          filter: drop-shadow(0 2px 8px rgba(255,255,255,0.4));
        }
        .bottom-nav-item.active span {
          opacity: 1;
        }

        /* ── WRAPPER UTAMA RESPONSIVE ── */
        .curved-navigation-wrapper {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 70px;
          z-index: 50;
        }

        .nav-bg-shadow-wrapper {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: -1;
          filter: drop-shadow(0 -4px 12px rgba(244,121,32,0.35));
        }

        /* LAYER BACKGROUND ORANGE YANG DILUBANGI */
        .nav-masked-bg {
          width: 100%;
          height: 100%;
          background: #F47920;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          
          /* Masking Responsive! Nilai calc(50% - 69px) bikin dia auto-fit di screen berapapun */
          -webkit-mask-image:
            url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 70' width='140' height='70'%3E%3Cpath d='M0,0 C30,0 35,50 70,50 C105,50 110,0 140,0 L140,70 L0,70 Z' fill='black'/%3E%3C/svg%3E"),
            linear-gradient(black, black),
            linear-gradient(black, black);
          -webkit-mask-position: center top, left top, right top;
          -webkit-mask-repeat: no-repeat, no-repeat, no-repeat;
          -webkit-mask-size: 140px 70px, calc(50% - 69px) 100%, calc(50% - 69px) 100%;

          mask-image:
            url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 70' width='140' height='70'%3E%3Cpath d='M0,0 C30,0 35,50 70,50 C105,50 110,0 140,0 L140,70 L0,70 Z' fill='black'/%3E%3C/svg%3E"),
            linear-gradient(black, black),
            linear-gradient(black, black);
          mask-position: center top, left top, right top;
          mask-repeat: no-repeat, no-repeat, no-repeat;
          mask-size: 140px 70px, calc(50% - 69px) 100%, calc(50% - 69px) 100%;
        }

        /* CONTAINER MENU ITEM */
        .nav-items-container {
          display: flex;
          justify-content: space-around; /* Rata sempurna di ukuran layar berapapun */
          align-items: center;
          height: 100%;
          position: relative;
          z-index: 10;
          max-width: 800px; /* Supaya ga terlalu melar di layar desktop Ultrawide */
          margin: 0 auto;
        }

        /* ── ANIMASI TOMBOL FAB TEAL TENGAH ── */
        .fab-btn-container {
          position: relative; 
          width: 140px; /* WAJIB sama dengan width cut-out SVG biar presisi */
          height: 100%; 
          display: flex; 
          justify-content: center; 
          z-index: 30;
        }

        .fab-btn {
          position: absolute;
          top: -24px; 
          width: 68px; 
          height: 68px; 
          border-radius: 50%;
          background: linear-gradient(135deg, #0f8b6b, #0d9488); 
          color: white; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          border: none;
          cursor: pointer; 
          box-shadow: 0 8px 24px rgba(13,148,136,0.6);
          padding: 0;
          flex-shrink: 0;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .fab-btn svg {
          transition: transform 0.4s ease;
        }

        .fab-btn:hover {
          transform: translateY(-6px) scale(1.05); /* Ngangkat & membesar pas di hover */
          box-shadow: 0 14px 30px rgba(13,148,136,0.8);
        }
        
        .fab-btn:hover svg {
          transform: rotate(90deg); /* Icon plus muter pas di hover, manis bet! */
        }

        .fab-btn:active {
          transform: translateY(2px) scale(0.95); /* Efek ketekan */
          box-shadow: 0 4px 12px rgba(13,148,136,0.4);
        }
      `}} />

      {/* Shapes dekoratif background pelengkap tema */}
      <div className="app-bg-shape-teal" />
      <div className="app-bg-shape-orange" />

      {/* NOTIFIKASI TOAST DARI SISTEM MULTI-TENANT */}
      {message && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'rgba(15,23,42,0.96)', backdropFilter: 'blur(8px)',
          color: 'white', fontFamily: 'sans-serif', fontWeight: 900, fontSize: '10px',
          letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 28px',
          borderRadius: '16px', boxShadow: '0 20px 40px rgba(15,23,42,0.2)',
          display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316', animation: 'pulse 1.5s infinite' }}></div>
          {message}
        </div>
      )}

      {/* ── TOP HEADER NAVBAR ── */}
      <header style={{
        background: 'linear-gradient(to right, #0f766e, #0d9488)',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 4px 15px rgba(255, 255, 255, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" style={{ height: '32px', width: 'auto', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.8))' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, textTransform: 'uppercase', color: 'white' }}>
              AGRA<span style={{ color: '#fb923c' }}>Pos</span>
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '8px', fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Multi-Tenant POS
            </p>
          </div>
        </div>



        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(0,0,0,0.12)', padding: '5px 12px',
          borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 800 }}>{currentUser.name || 'Staff Kasir'}</p>
            <p style={{ margin: 0, fontSize: '8px', fontWeight: 700, color: '#fdba74', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{currentUser.role || 'Kasir'}</p>
          </div>
          <div style={{
            width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase'
          }}>
            {currentUser.name ? currentUser.name.substring(0, 2) : 'ST'}
          </div>
        </div>
      </header>

      {/* RENDER VIEW UTAMA HALAMAN */}
      <main style={
        activeTab === 'pos'
          ? { padding: 0, paddingBottom: 0, boxSizing: 'border-box', position: 'relative', height: 'calc(100vh - 56px - 70px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
          : { padding: '16px', paddingBottom: '100px', boxSizing: 'border-box', position: 'relative' }
      }>
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={filteredTransactionsForOutlet}
            onNavigate={handleTabChange}
            currentUser={{ ...currentUser, outlet_id: selectedOutletId }}
            onShowToast={showNotification}
            onTriggerUpgrade={triggerUpgrade}
            onTriggerFeaturePopup={triggerFeaturePopup}
          />
        )}
        
        {activeTab === 'pos' && (
          <PosOverlay 
            tenantId={tenantId}
            currentUser={{ ...currentUser, outlet_id: selectedOutletId }}
            onClose={() => handleTabChange('dashboard')} 
            onNavigate={handleTabChange}
            onSuccess={() => {
              fetchTransactions();
              showNotification('TRANSAKSI BERHASIL DISIMPAN');
            }}
          />
        )}

        {activeTab === 'ppob-history' && (
          <PpobHistory
            currentUser={{ ...currentUser, outlet_id: selectedOutletId }}
            onNavigate={handleTabChange}
          />
        )}

        {activeTab === 'ppob-topup' && (
          <PpobTopup
            currentUser={{ ...currentUser, outlet_id: selectedOutletId }}
            onNavigate={handleTabChange}
            onShowToast={showNotification}
          />
        )}

        {activeTab === 'ppob-withdraw' && (
          <PpobWithdraw
            currentUser={{ ...currentUser, outlet_id: selectedOutletId }}
            onNavigate={handleTabChange}
            onShowToast={showNotification}
          />
        )}
        
        {activeTab === 'history' && (
          <History
            transactions={filteredTransactionsForOutlet}
            tenantId={tenantId}
            onTransactionUpdated={() => fetchTransactions()}
          />
        )}
        {activeTab === 'catalog' && <KatalogProduk tenantId={tenantId} selectedOutletId={selectedOutletId} outlets={outlets} />}
        {activeTab === 'variants' && <VariantManagement onBack={() => handleTabChange('dashboard')} tenantId={tenantId} selectedOutletId={selectedOutletId} outlets={outlets} />}
        {activeTab === 'customers' && <CustomerManager tenantId={tenantId} selectedOutletId={selectedOutletId} outlets={outlets} />}
        {activeTab === 'stock' && <StockManager onBack={() => handleTabChange('dashboard')} tenantId={tenantId} currentUser={currentUser} selectedOutletId={selectedOutletId} outlets={outlets} />}
        {activeTab === 'discounts' && <DiscountManager onBack={() => handleTabChange('dashboard')} tenantId={tenantId} selectedOutletId={selectedOutletId} outlets={outlets} />}
        {activeTab === 'expenses' && (
          <ExpenseManager
            onBack={() => handleTabChange('dashboard')}
            tenantId={tenantId}
            currentUser={currentUser}
            selectedOutletId={selectedOutletId}
            outlets={outlets}
          />
        )}
        {activeTab === 'reports' && <Laporan transactions={transactions} tenantId={tenantId} defaultOutletId={selectedOutletId} />}
        
        {activeTab === 'settings' && (
          <Settings 
            tenantId={tenantId}
            currentUser={currentUser}
            onLogout={handleLogout}
            outlets={outlets}
            selectedOutletId={selectedOutletId}
            onOutletChange={handleOutletChange}
            onNavigate={handleTabChange}
            onTriggerUpgrade={triggerUpgrade}
            platformSettings={platformSettings}
            onTriggerFeaturePopup={triggerFeaturePopup}
            activeSubTab={activeSubTab}
          />
        )}
 
        {activeTab === 'employees' && (
          <StaffManager 
            currentUser={currentUser} 
            onBack={() => handleTabChange('settings')} 
          />
        )}
        {activeTab === 'outlets' && (
          <OutletManager tenantId={tenantId} onBack={() => handleTabChange('settings')} currentUser={currentUser} onUpdated={fetchOutlets} />
        )}
        {activeTab === 'shifts' && (
          <CashShiftManager tenantId={tenantId} currentUser={{ ...currentUser, outlet_id: selectedOutletId }} onBack={() => handleTabChange('dashboard')} selectedOutletId={selectedOutletId} />
        )}
      </main>

      {/* ── BOTTOM NAVIGASI RESPONSIVE ── */}
      <nav className="curved-navigation-wrapper">
        
        {/* Layer 1: Background Oranye (Auto Scaling Full Width) */}
        <div className="nav-bg-shadow-wrapper">
          <div className="nav-masked-bg" />
        </div>

        {/* Layer 2: Container Tombol-Tombol */}
        <div className="nav-items-container">
          
          {/* BERANDA */}
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span style={{ fontSize: '10px', fontWeight: 800 }}>Beranda</span>
          </button>

          {/* RIWAYAT - selalu tampil, kecuali jika di-hide secara global */}
          {platformSettings?.pos_features?.history?.status !== 'hidden' && (
            <button
              onClick={() => handleTabChange('history')}
              className={`bottom-nav-item ${activeTab === 'history' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: 800 }}>Riwayat</span>
            </button>
          )}

          {/* TOMBOL TENGAH FAB - selalu tampil jika tidak di-hide secara global (jika diklik dan tidak ada izin, akan muncul upgrade modal) */}
          <div className="fab-btn-container">
            {platformSettings?.pos_features?.pos?.status !== 'hidden' && (
              <button onClick={() => handleTabChange('pos')} className="fab-btn">
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '36px', height: '36px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {/* LAPORAN - selalu tampil, kecuali jika di-hide secara global */}
          {platformSettings?.pos_features?.reports?.status !== 'hidden' && (
            <button
              onClick={() => handleTabChange('reports')}
              className={`bottom-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: 800 }}>Laporan</span>
            </button>
          )}

          {/* SETTING */}
          <button
            onClick={() => handleTabChange('settings')}
            className={`bottom-nav-item ${['settings', 'employees'].includes(activeTab) ? 'active' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 0c.426 1.756 2.924 1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543.94 1.543 3.3 0 4.24a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.94-1.543-3.3 0-4.24A1.724 1.724 0 0010.325 4.317z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span style={{ fontSize: '10px', fontWeight: 800 }}>Setting</span>
          </button>

        </div>
      </nav>

      {/* ── MODAL UPGRADE PAKET PREMIUM ── */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'white', borderRadius: '32px', width: '100%', maxWidth: '500px',
            padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0', animation: 'scaleUp 0.25s ease-out'
          }}>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes scaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}} />
            
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '18px',
                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px', margin: '0 auto 12px', border: '1px solid #fde68a'
              }}>
                ⭐
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                Fitur Premium Terkunci
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: '#64748b', fontWeight: 500, lineHeight: 1.5 }}>
                Modul <strong style={{ color: '#0d9488', textTransform: 'uppercase' }}>
                  {(() => {
                    const labels = {
                      'pos': 'Aplikasi Kasir POS',
                      'history': 'Riwayat Transaksi Lengkap',
                      'catalog': 'Katalog Produk Mandiri',
                      'variants': 'Varian & Ekstra Produk',
                      'customers': 'Manajemen Data Pelanggan',
                      'stock': 'Manajemen Stok Bahan Baku',
                      'discounts': 'Sistem Diskon & Promo',
                      'expenses': 'Beli & Pengeluaran Toko',
                      'reports': 'Laporan Analitik & Laba',
                      'staff': 'Manajemen Akun Karyawan',
                      'outlets': 'Multi-Outlet / Multi-Cabang',
                      'shifts': 'Shift Kasir & Rekonsiliasi Saldo',
                      'ppob': 'Penjualan Produk Digital PPOB'
                    };
                    return labels[upgradeTriggerModule] || upgradeTriggerModule;
                  })()}
                </strong> memerlukan upgrade paket toko Anda. Pilih paket langganan Anda di bawah ini:
              </p>
            </div>

            {/* Plan options cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              {/* PRO PLAN */}
              <div style={{
                border: '2px solid #0d9488', borderRadius: '20px', padding: '16px',
                background: 'linear-gradient(to bottom, #ffffff, #f0fdfa)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute', top: '-8px', right: '10px',
                  background: '#0d9488', color: 'white', fontSize: '7.5px',
                  fontWeight: 900, textTransform: 'uppercase', padding: '2px 7px', borderRadius: '99px',
                  letterSpacing: '0.05em'
                }}>POPULER</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 900, color: '#0f766e' }}>PAKET PRO</h4>
                  <p style={{ margin: '2px 0 10px 0', fontSize: '9px', color: '#64748b', fontWeight: 500 }}>Untuk Bisnis Berkembang</p>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b' }}>Rp 99k<span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>/bln</span></div>
                </div>
                <button
                  onClick={() => {
                    const tokoName = currentUser?.tenant_name || 'Toko Saya';
                    const msg = encodeURIComponent(`Halo Admin AGRAPos, saya ingin upgrade ke Paket PRO untuk Toko "${tokoName}" (Tenant ID: ${tenantId}) agar dapat mengakses fitur premium.`);
                    window.open(`https://wa.me/6285695660902?text=${msg}`, '_blank');
                    setShowUpgradeModal(false);
                  }}
                  style={{
                    marginTop: '12px', width: '100%', padding: '8px 0',
                    background: '#0d9488', color: 'white', border: 'none',
                    borderRadius: '10px', fontSize: '10.5px', fontWeight: 800,
                    cursor: 'pointer', boxShadow: '0 4px 10px rgba(13,148,136,0.2)'
                  }}
                >
                  Pilih Paket PRO
                </button>
              </div>

              {/* ENTERPRISE PLAN */}
              <div style={{
                border: '1px solid #e2e8f0', borderRadius: '20px', padding: '16px',
                background: '#ffffff',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 900, color: '#7c3aed' }}>ENTERPRISE</h4>
                  <p style={{ margin: '2px 0 10px 0', fontSize: '9px', color: '#64748b', fontWeight: 500 }}>Multi-Cabang & Retail</p>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b' }}>Rp 299k<span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>/bln</span></div>
                </div>
                <button
                  onClick={() => {
                    const tokoName = currentUser?.tenant_name || 'Toko Saya';
                    const msg = encodeURIComponent(`Halo Admin AGRAPos, saya tertarik dengan Paket ENTERPRISE untuk Toko "${tokoName}" (Tenant ID: ${tenantId}) agar dapat membuka seluruh fitur tanpa batas.`);
                    window.open(`https://wa.me/6285695660902?text=${msg}`, '_blank');
                    setShowUpgradeModal(false);
                  }}
                  style={{
                    marginTop: '12px', width: '100%', padding: '8px 0',
                    background: '#7c3aed', color: 'white', border: 'none',
                    borderRadius: '10px', fontSize: '10.5px', fontWeight: 800,
                    cursor: 'pointer', boxShadow: '0 4px 10px rgba(124,58,237,0.2)'
                  }}
                >
                  Pilih Enterprise
                </button>
              </div>
            </div>

            {/* Cancel button */}
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                width: '100%', padding: '10px 0', background: '#f1f5f9',
                color: '#64748b', border: 'none', borderRadius: '12px',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Kembali ke Aplikasi
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL POPUP FITUR MAINTENANCE / PENGEMBANGAN ── */}
      {featurePopup && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'white', borderRadius: '32px', width: '100%', maxWidth: '440px',
            padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0', animation: 'scaleUp 0.25s ease-out',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '18px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', margin: '0 auto 16px', border: '1px solid #bfdbfe'
            }}>
              🛠️
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              Fitur {featurePopup.title}
            </h3>
            <p style={{ margin: '12px 0 24px 0', fontSize: '13px', color: '#475569', fontWeight: 500, lineHeight: 1.6 }}>
              {featurePopup.message}
            </p>
            <button
              onClick={() => setFeaturePopup(null)}
              style={{
                width: '100%', padding: '12px 0', background: '#0f766e',
                color: 'white', border: 'none', borderRadius: '14px',
                fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15,118,110,0.3)'
              }}
            >
              OK, MENGERTI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}