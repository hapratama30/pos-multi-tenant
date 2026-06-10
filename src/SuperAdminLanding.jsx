/* eslint-disable */

import React, { useState, useEffect, useCallback } from 'react';

import {

  fetchLandingContent,

  saveLandingContent,

  resetLandingContent,

  unlockSuperAdmin,

  isSuperAdminUnlocked,

  lockSuperAdmin,

  isSuperAdminConfigured,

  isSuperAdminLockedOut,

  getSuperAdminLockoutRemainingMs,

  getSuperAdminPinForRpc,

  DEFAULT_LANDING_CONTENT,

} from './utils/landingContent';

import SuperAdminShell from './components/superadmin/SuperAdminShell';

import SuperAdminOverview from './components/superadmin/SuperAdminOverview';

import SuperAdminTenants from './components/superadmin/SuperAdminTenants';


import SuperAdminPlans from './components/superadmin/SuperAdminPlans';

import SuperAdminLandingCMS from './components/superadmin/SuperAdminLandingCMS';

import SuperAdminPPOB from './components/superadmin/SuperAdminPPOB';
import SuperAdminBroadcast from './components/superadmin/SuperAdminBroadcast';
import SuperAdminDeposits from './components/superadmin/SuperAdminDeposits';
import SuperAdminWithdrawals from './components/superadmin/SuperAdminWithdrawals';
import SuperAdminSettings from './components/superadmin/SuperAdminSettings';



function deepClone(obj) {

  return JSON.parse(JSON.stringify(obj));

}



export default function SuperAdminLanding({ onBack, onPreview, initialSection = 'overview' }) {

  const [unlocked, setUnlocked] = useState(isSuperAdminUnlocked());

  const [pin, setPin] = useState('');

  const [pinError, setPinError] = useState('');

  const [content, setContent] = useState(() => deepClone(DEFAULT_LANDING_CONTENT));

  const [section, setSection] = useState(initialSection);

  const [landingTab, setLandingTab] = useState('hero');

  const [toast, setToast] = useState(null);

  const [loadingContent, setLoadingContent] = useState(false);

  const [saving, setSaving] = useState(false);



  const showToast = useCallback((msg, type = 'success') => {

    setToast({ msg, type });

    setTimeout(() => setToast(null), 3500);

  }, []);



  useEffect(() => {

    if (!unlocked) return undefined;

    let cancelled = false;

    setLoadingContent(true);

    fetchLandingContent().then((data) => {

      if (!cancelled) {

        setContent(deepClone(data));

        setLoadingContent(false);

      }

    });

    return () => { cancelled = true; };

  }, [unlocked]);



  useEffect(() => {

    const sync = async () => {

      const data = await fetchLandingContent();

      setContent(deepClone(data));

    };

    window.addEventListener('landing-content-updated', sync);

    return () => window.removeEventListener('landing-content-updated', sync);

  }, []);



  const handlePinSubmit = (e) => {

    e.preventDefault();

    if (!isSuperAdminConfigured()) {

      setPinError('PIN belum dikonfigurasi. Set VITE_SUPERADMIN_PIN di .env (min. 8 karakter).');

      return;

    }

    if (isSuperAdminLockedOut()) {

      const mins = Math.ceil(getSuperAdminLockoutRemainingMs() / 60000);

      setPinError(`Terlalu banyak percobaan salah. Coba lagi dalam ${mins} menit.`);

      return;

    }

    const result = unlockSuperAdmin(pin.trim());

    if (result.ok) {

      setUnlocked(true);

      setPinError('');

      setPin('');

    } else if (result.reason === 'locked') {

      const mins = Math.ceil(getSuperAdminLockoutRemainingMs() / 60000);

      setPinError(`Terlalu banyak percobaan salah. Coba lagi dalam ${mins} menit.`);

    } else if (result.reason === 'wrong_pin') {

      setPinError(`PIN salah. Sisa percobaan: ${result.attemptsLeft}.`);

    } else {

      setPinError('Akses ditolak.');

    }

  };



  const handleSave = async () => {

    const rpcPin = getSuperAdminPinForRpc();

    if (!rpcPin) {

      showToast('Sesi PIN habis. Kunci panel lalu masuk lagi.', 'error');

      return;

    }

    setSaving(true);

    const result = await saveLandingContent(content, rpcPin);

    setSaving(false);

    if (result.ok) {

      showToast('Konten landing berhasil disimpan ke Supabase.');

    } else {

      showToast(result.error || 'Gagal menyimpan', 'error');

    }

  };



  const handleReset = async () => {

    if (!window.confirm('Reset semua konten ke default? Tindakan ini tidak bisa dibatalkan.')) return;

    const rpcPin = getSuperAdminPinForRpc();

    if (!rpcPin) {

      showToast('Sesi PIN habis. Kunci panel lalu masuk lagi.', 'error');

      return;

    }

    setSaving(true);

    const defaults = await resetLandingContent(rpcPin);

    setSaving(false);

    if (defaults) {

      setContent(deepClone(defaults));

      showToast('Konten direset ke default.', 'info');

    } else {

      showToast('Gagal reset. Cek migration SQL & app_secrets.', 'error');

    }

  };



  const updateListItem = (key, index, field, value) => {

    setContent((prev) => {

      const list = [...prev[key]];

      list[index] = { ...list[index], [field]: value };

      return { ...prev, [key]: list };

    });

  };



  const updateSection = (sectionKey, field, value) => {

    setContent((prev) => ({

      ...prev,

      [sectionKey]: { ...prev[sectionKey], [field]: value },

    }));

  };



  const updateHero = (field, value) => updateSection('hero', field, value);



  const updateHeroBullets = (index, value) => {

    setContent((prev) => {

      const bullets = [...prev.hero.bullets];

      bullets[index] = value;

      return { ...prev, hero: { ...prev.hero, bullets } };

    });

  };



  const updateBenefitItem = (index, value) => {

    setContent((prev) => {

      const items = [...prev.benefitsSection.items];

      items[index] = value;

      return { ...prev, benefitsSection: { ...prev.benefitsSection, items } };

    });

  };



  /* ── Login screen ── */

  if (!unlocked) {

    return (

      <div className="min-h-screen flex">

        {/* Brand panel */}

        <div className="hidden lg:flex lg:w-1/2 bg-slate-950 text-white flex-col justify-between p-12 relative overflow-hidden">

          <div className="absolute inset-0 opacity-30">

            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />

            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

          </div>

          <div className="relative">

            <div className="flex items-center gap-3">
              <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" className="h-10 w-auto object-contain" />
              <div>
                <p className="font-bold text-lg">AGRAPos</p>
                <p className="text-xs text-slate-400">Platform Console</p>
              </div>
            </div>

          </div>

          <div className="relative space-y-6">

            <h1 className="text-4xl font-bold leading-tight tracking-tight">

              Kelola seluruh<br />

              <span className="text-teal-400">ecosystem multi-tenant</span><br />

              dari satu panel.

            </h1>

            <p className="text-slate-400 text-sm leading-relaxed max-w-md">

              Monitor tenant, atur langganan, follow-up calon pelanggan via WhatsApp, dan edit landing page — semua terpusat di Super Admin.

            </p>

            <div className="flex flex-wrap gap-3">

              {['Tenant Management', 'Subscription Control', 'Landing CMS'].map((tag) => (

                <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-slate-300 border border-white/10">{tag}</span>

              ))}

            </div>

          </div>

          <p className="relative text-xs text-slate-600">© AGRAPos · Restricted Access</p>

        </div>



        {/* PIN form */}

        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">

          <div className="w-full max-w-md">

            <div className="lg:hidden flex items-center gap-3 mb-8">
              <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" className="h-10 w-auto object-contain" />
              <div><p className="font-bold text-slate-900">AGRAPos Super Admin</p></div>
            </div>



            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Masuk ke Console</h2>

            <p className="text-sm text-slate-500 mt-2 mb-8">Masukkan PIN developer untuk mengakses panel platform.</p>



            {!isSuperAdminConfigured() && (

              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">

                Set <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPERADMIN_PIN</code> di .env dan samakan dengan{' '}

                <code className="font-mono bg-amber-100 px-1 rounded">app_secrets.landing_admin_pin</code> di Supabase.

              </div>

            )}



            {pinError && (

              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">{pinError}</div>

            )}



            <form onSubmit={handlePinSubmit} className="space-y-4">

              <div>

                <label className="block text-xs font-semibold text-slate-600 mb-1.5">PIN Developer</label>

                <input

                  type="password"

                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none bg-white"

                  placeholder="••••••••"

                  value={pin}

                  onChange={(e) => setPin(e.target.value)}

                  autoFocus

                />

              </div>

              <button

                type="submit"

                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-lg shadow-teal-500/25 transition-all"

              >

                Buka Dashboard

              </button>

            </form>



            {onBack && (

              <button type="button" onClick={onBack} className="w-full mt-4 py-3 text-sm font-medium text-slate-400 hover:text-teal-600 transition-colors">

                ← Kembali ke Landing

              </button>

            )}

          </div>

        </div>

      </div>

    );

  }



  const landingActions = section === 'landing' ? (

    <>

      <button

        type="button"

        onClick={handleReset}

        disabled={saving || loadingContent}

        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 disabled:opacity-50 transition-colors"

      >

        Reset Default

      </button>

      <button

        type="button"

        onClick={handleSave}

        disabled={saving || loadingContent}

        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-sm transition-colors"

      >

        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}

      </button>

    </>

  ) : null;



  return (

    <SuperAdminShell

      section={section}

      onSectionChange={setSection}

      toast={toast}

      onLock={() => { lockSuperAdmin(); setUnlocked(false); }}

      onBack={onBack}

      onPreview={onPreview}

      showPreview={section === 'landing'}

      headerActions={landingActions}

    >

      {section === 'overview' && (

        <SuperAdminOverview showToast={showToast} onNavigateTenants={() => setSection('tenants')} />

      )}



      {section === 'tenants' && (

        <SuperAdminTenants showToast={showToast} />

      )}



      {section === 'plans' && (

        <SuperAdminPlans showToast={showToast} />

      )}



      {section === 'landing' && (

        <SuperAdminLandingCMS

          content={content}

          tab={landingTab}

          onTabChange={setLandingTab}

          loadingContent={loadingContent}

          onUpdateHero={updateHero}

          onUpdateHeroBullets={updateHeroBullets}

          onUpdateSection={updateSection}

          onUpdateListItem={updateListItem}

          onUpdateBenefitItem={updateBenefitItem}

        />

      )}

      {section === 'ppob' && (

        <SuperAdminPPOB showToast={showToast} />

      )}

      {section === 'broadcasts' && (
        <SuperAdminBroadcast showToast={showToast} />
      )}

      {section === 'deposits' && (
        <SuperAdminDeposits showToast={showToast} />
      )}

      {section === 'withdrawals' && (
        <SuperAdminWithdrawals showToast={showToast} />
      )}

      {section === 'settings' && (
        <SuperAdminSettings showToast={showToast} />
      )}
    </SuperAdminShell>

  );

}
