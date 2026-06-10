// // eslint-disable-next-line no-unused-vars
// import React, { useState, useEffect } from 'react';
// import { supabase } from '../supabaseClient';

// export default function KategoriManajemen() {
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isFormOpen, setIsFormOpen] = useState(false);
  
//   // State Form
//   const [form, setForm] = useState({ id: null, name: '', code: '' });

//   // 1. Ambil data kategori dari Supabase
//   const fetchCategories = async () => {
//     setLoading(true);
//     try {
//       const { data, error } = await supabase
//         .from('product_categories')
//         .select('*')
//         .order('id', { ascending: true });

//       if (error) throw error;
//       setCategories(data || []);
//     } catch (err) {
//       console.error(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     // eslint-disable-next-line react-hooks/set-state-in-effect
//     fetchCategories();
//   }, []);

//   // 2. Logika Simpan / Edit Kategori
//   const handleSave = async (e) => {
//     e.preventDefault();
//     if (!form.name || !form.code) return;

//     // Otomatis bikin huruf kecil tanpa spasi untuk kolom code (contoh: "Jasa Laundry" -> "jasa-laundry")
//     const formattedCode = form.code.toLowerCase().replace(/\s+/g, '-');

//     const payload = {
//       name: form.name,
//       code: formattedCode
//     };

//     try {
//       if (form.id) {
//         const { error } = await supabase.from('product_categories').update(payload).eq('id', form.id);
//         if (error) throw error;
//       } else {
//         const { error } = await supabase.from('product_categories').insert([payload]);
//         if (error) throw error;
//       }

//       setForm({ id: null, name: '', code: '' });
//       setIsFormOpen(false);
//       fetchCategories();
//     } catch (err) {
//       alert('Gagal menyimpan: ' + err.message);
//     }
//   };

//   // 3. Logika Hapus Kategori
//   const handleDelete = async (id) => {
//     if (!window.confirm('Hapus kategori ini? Produk dengan kategori ini mungkin akan terpengaruh.')) return;
//     try {
//       const { error } = await supabase.from('product_categories').delete().eq('id', id);
//       if (error) throw error;
//       fetchCategories();
//     } catch (err) {
//       alert('Gagal menghapus: ' + err.message);
//     }
//   };

//   return (
//     <div className="p-6 pb-32 animate-in fade-in duration-300">
      
//       {/* HEADER */}
//       <header className="flex justify-between items-center mb-6">
//         <div>
//           <h2 className="text-xl font-black text-slate-800 tracking-tight">Manajemen Kategori</h2>
//           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Pengaturan Lini Bisnis SaaS</p>
//         </div>
//         <button 
//           onClick={() => {
//             setForm({ id: null, name: '', code: '' });
//             setIsFormOpen(!isFormOpen);
//           }}
//           className="bg-sky-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-all"
//         >
//           {isFormOpen ? 'Tutup Form' : 'Tambah Kategori'}
//         </button>
//       </header>

//       {/* FORM INPUT KATEGORI */}
//       {isFormOpen && (
//         <form onSubmit={handleSave} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-xl mb-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
//           <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
//             {form.id ? 'Edit Kategori' : 'Buat Kategori Baru'}
//           </h3>
//           <div className="space-y-3">
//             <div>
//               <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Nama Kategori (Muncul di Dropdown)</label>
//               <input 
//                 type="text" 
//                 placeholder="Contoh: Produk Fisik, Jasa Pijat, Katering" 
//                 value={form.name}
//                 onChange={e => setForm({...form, name: e.target.value, code: e.target.value})} // otomatis isi code pas ngetik name
//                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:outline-none focus:border-sky-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">System Code (Sistem ID)</label>
//               <input 
//                 type="text" 
//                 placeholder="Contoh: fisik, jasa, paket" 
//                 value={form.code}
//                 onChange={e => setForm({...form, code: e.target.value})}
//                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-mono font-bold focus:outline-none focus:border-sky-500"
//                 required
//               />
//             </div>
//           </div>
//           <button type="submit" className="w-full bg-emerald-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-md">
//             Simpan Kategori
//           </button>
//         </form>
//       )}

//       {/* LIST KATEGORI AKTIF */}
//       <div className="space-y-3">
//         {loading ? (
//           <div className="text-center py-8 text-xs font-black text-slate-400 uppercase tracking-widest">Memuat Kategori...</div>
//         ) : categories.length > 0 ? (
//           categories.map(c => (
//             <div key={c.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-black text-slate-700 tracking-tight">{c.name}</p>
//                 <span className="inline-block text-[8px] bg-slate-100 text-slate-500 font-mono font-bold px-2 py-0.5 rounded-md uppercase">
//                   Code: {c.code}
//                 </span>
//               </div>
//               <div className="flex gap-1">
//                 <button onClick={() => { setForm(c); setIsFormOpen(true); }} className="p-1.5 text-sky-500 hover:bg-sky-50 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
//                 <button onClick={() => handleDelete(c.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
//               </div>
//             </div>
//           ))
//         ) : (
//           <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50">
//             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Belum Ada Kategori</p>
//           </div>
//         )}
//       </div>

//     </div>
//   );
// }