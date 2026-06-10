import React from 'react';

const LANDING_TABS = [
  { id: 'hero', label: 'Hero', icon: '🎯' },
  { id: 'stats', label: 'Statistik', icon: '📊' },
  { id: 'features', label: 'Fitur', icon: '⚡' },
  { id: 'steps', label: 'Cara Kerja', icon: '📋' },
  { id: 'benefits', label: 'Keunggulan', icon: '✨' },
  { id: 'cta', label: 'CTA & Footer', icon: '🚀' },
];

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-shadow';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5';

export default function SuperAdminLandingCMS({
  content,
  tab,
  onTabChange,
  loadingContent,
  onUpdateHero,
  onUpdateHeroBullets,
  onUpdateSection,
  onUpdateListItem,
  onUpdateBenefitItem,
}) {
  if (loadingContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-[3px] border-teal-100 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-4">Memuat konten landing...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Section nav */}
      <div className="lg:w-48 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm lg:sticky lg:top-28">
          <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section</p>
          {LANDING_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all mb-0.5 ${
                tab === t.id
                  ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-5">
        {tab === 'hero' && (
          <>
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Bagian Hero</h2>
              <p className="text-xs text-slate-500 mt-0.5">Judul utama dan call-to-action di atas landing page</p>
            </div>
            {[
              ['badge', 'Badge / Label'],
              ['title', 'Judul Utama'],
              ['titleHighlight', 'Highlight (warna orange)'],
              ['description', 'Deskripsi'],
              ['ctaPrimary', 'Tombol Utama'],
              ['ctaSecondary', 'Tombol Sekunder'],
            ].map(([field, lbl]) => (
              <div key={field}>
                <label className={labelCls}>{lbl}</label>
                {field === 'description' ? (
                  <textarea className={`${inputCls} min-h-[88px] resize-y`} value={content.hero[field]} onChange={(e) => onUpdateHero(field, e.target.value)} />
                ) : (
                  <input className={inputCls} value={content.hero[field]} onChange={(e) => onUpdateHero(field, e.target.value)} />
                )}
              </div>
            ))}
            <div>
              <label className={labelCls}>Bullet Points</label>
              <div className="space-y-2">
                {content.hero.bullets.map((b, i) => (
                  <input key={i} className={inputCls} value={b} onChange={(e) => onUpdateHeroBullets(i, e.target.value)} placeholder={`Poin ${i + 1}`} />
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'stats' && (
          <>
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Bar Statistik</h2>
              <p className="text-xs text-slate-500 mt-0.5">Angka highlight di bawah hero</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {content.stats.map((s, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                  <p className="text-[10px] font-bold text-slate-400 mb-3">Stat {i + 1}</p>
                  <div className="space-y-2">
                    <div><label className={labelCls}>Nilai</label><input className={inputCls} value={s.value} onChange={(e) => onUpdateListItem('stats', i, 'value', e.target.value)} /></div>
                    <div><label className={labelCls}>Label</label><input className={inputCls} value={s.label} onChange={(e) => onUpdateListItem('stats', i, 'label', e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'features' && (
          <>
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Section Fitur</h2>
            </div>
            {['eyebrow', 'title', 'subtitle'].map((f) => (
              <div key={f}><label className={labelCls}>{f}</label><input className={inputCls} value={content.featuresSection[f]} onChange={(e) => onUpdateSection('featuresSection', f, e.target.value)} /></div>
            ))}
            <div className="space-y-3 pt-2">
              {content.features.map((f, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-4 bg-slate-50/30">
                  <p className="text-xs font-bold text-teal-600 mb-3">Fitur {i + 1}</p>
                  <div className="grid sm:grid-cols-[80px_1fr] gap-2">
                    <div><label className={labelCls}>Icon</label><input className={inputCls} value={f.icon} onChange={(e) => onUpdateListItem('features', i, 'icon', e.target.value)} /></div>
                    <div><label className={labelCls}>Judul</label><input className={inputCls} value={f.title} onChange={(e) => onUpdateListItem('features', i, 'title', e.target.value)} /></div>
                  </div>
                  <div className="mt-2"><label className={labelCls}>Deskripsi</label><textarea className={`${inputCls} min-h-[64px]`} value={f.desc} onChange={(e) => onUpdateListItem('features', i, 'desc', e.target.value)} /></div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'steps' && (
          <>
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Cara Kerja</h2>
            </div>
            {['eyebrow', 'title'].map((f) => (
              <div key={f}><label className={labelCls}>{f}</label><input className={inputCls} value={content.stepsSection[f]} onChange={(e) => onUpdateSection('stepsSection', f, e.target.value)} /></div>
            ))}
            <div className="space-y-3 pt-2">
              {content.steps.map((s, i) => (
                <div key={i} className="grid sm:grid-cols-3 gap-2 rounded-xl border border-slate-100 p-3 bg-slate-50/30">
                  <div><label className={labelCls}>No</label><input className={inputCls} value={s.num} onChange={(e) => onUpdateListItem('steps', i, 'num', e.target.value)} /></div>
                  <div><label className={labelCls}>Judul</label><input className={inputCls} value={s.title} onChange={(e) => onUpdateListItem('steps', i, 'title', e.target.value)} /></div>
                  <div><label className={labelCls}>Deskripsi</label><input className={inputCls} value={s.desc} onChange={(e) => onUpdateListItem('steps', i, 'desc', e.target.value)} /></div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'benefits' && (
          <>
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Keunggulan</h2>
            </div>
            {['eyebrow', 'title', 'titleHighlight'].map((f) => (
              <div key={f}><label className={labelCls}>{f}</label><input className={inputCls} value={content.benefitsSection[f]} onChange={(e) => onUpdateSection('benefitsSection', f, e.target.value)} /></div>
            ))}
            <div><label className={labelCls}>Daftar Poin</label><div className="space-y-2">{content.benefitsSection.items.map((item, i) => (<input key={i} className={inputCls} value={item} onChange={(e) => onUpdateBenefitItem(i, e.target.value)} />))}</div></div>
          </>
        )}

        {tab === 'cta' && (
          <>
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">CTA & Footer</h2>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Call to Action</p>
            {['title', 'subtitle', 'btnPrimary', 'btnSecondary'].map((f) => (
              <div key={f}><label className={labelCls}>{f}</label><input className={inputCls} value={content.ctaSection[f]} onChange={(e) => onUpdateSection('ctaSection', f, e.target.value)} /></div>
            ))}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-3">Footer</p>
            {['tagline', 'copyright'].map((f) => (
              <div key={f}><label className={labelCls}>{f}</label><input className={inputCls} value={content.footer[f]} onChange={(e) => onUpdateSection('footer', f, e.target.value)} /></div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
