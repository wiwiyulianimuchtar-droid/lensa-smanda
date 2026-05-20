"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, X, GraduationCap, AlertTriangle, Activity } from 'lucide-react';

export default function KesiswaanMaster() {
  const [activeTab, setActiveTab] = useState('siswa'); // 'siswa', 'aturan', 'ekskul'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Data
  const [students, setStudents] = useState([]);
  const [pointRules, setPointRules] = useState([]);
  const [extracurriculars, setExtracurriculars] = useState([]);
  
  // Lookups
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Modals
  const [showSiswaModal, setShowSiswaModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showEkskulModal, setShowEkskulModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Forms
  const [siswaForm, setSiswaForm] = useState({ 
    full_name: '', email: '', nisn: '', nis: '', gender: 'L', class_id: '' 
  });
  const [ruleForm, setRuleForm] = useState({
    code: '', name: '', type: 'NEGATIF', default_point: 5
  });
  const [ekskulForm, setEkskulForm] = useState({
    name: '', category: 'Pilihan', coach_id: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'siswa') {
      const { data, error } = await supabase
        .from('sr_student_details')
        .select(`
          *,
          profile:sr_profiles!sr_student_details_profile_id_fkey(full_name, email),
          kelas:sr_classes!sr_student_details_class_id_fkey(name)
        `);
      if (data) setStudents(data);
      
      const { data: clsData } = await supabase.from('sr_classes').select('id, name').order('name');
      if (clsData) setClasses(clsData);

    } else if (activeTab === 'aturan') {
      const { data } = await supabase.from('sr_point_rules').select('*').order('type').order('default_point', { ascending: false });
      if (data) setPointRules(data);

    } else if (activeTab === 'ekskul') {
      const { data } = await supabase.from('sr_extracurriculars').select(`
        *,
        coach:sr_profiles!sr_extracurriculars_coach_id_fkey(full_name)
      `).order('name');
      if (data) setExtracurriculars(data);

      const { data: guruData } = await supabase.from('sr_profiles').select('id, full_name').in('role', ['GURU', 'ADMIN']).order('full_name');
      if (guruData) setTeachers(guruData);
    }
    setLoading(false);
  };

  // --- SISWA LOGIC ---
  const saveSiswa = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (editingId) {
      try {
        // Edit Mode - Update Profile first
        const { error: profileError } = await supabase.from('sr_profiles').update({
          full_name: siswaForm.full_name,
        }).eq('id', editingId);

        if (profileError) throw profileError;

        // Then update Student Details
        const { error: detailError } = await supabase.from('sr_student_details').update({
          nisn: siswaForm.nisn || null,
          nis: siswaForm.nis || null,
          gender: siswaForm.gender || null,
          class_id: siswaForm.class_id || null
        }).eq('profile_id', editingId);

        if (detailError) throw detailError;

        setShowSiswaModal(false);
        setEditingId(null);
        alert("Data Siswa berhasil diperbarui!");
        await fetchData();
      } catch (err) {
        alert("Gagal memperbarui siswa: " + err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Insert Mode
    const autoPassword = `Siswa${siswaForm.nisn}`;
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: siswaForm.full_name,
          email: siswaForm.email,
          password: autoPassword,
          nisn: siswaForm.nisn,
          nis: siswaForm.nis,
          gender: siswaForm.gender,
          class_id: siswaForm.class_id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowSiswaModal(false);
      setSiswaForm({ full_name: '', email: '', nisn: '', nis: '', gender: 'L', class_id: '' });
      alert(`Siswa berhasil ditambahkan!\nPassword Default: ${autoPassword}`);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editSiswa = (siswa) => {
    setEditingId(siswa.profile_id);
    setSiswaForm({
      full_name: siswa.profile.full_name,
      email: siswa.profile.email,
      nisn: siswa.nisn || '',
      nis: siswa.nis || '',
      gender: siswa.gender || 'L',
      class_id: siswa.class_id || ''
    });
    setShowSiswaModal(true);
  };

  const deleteSiswa = async (profileId) => {
    if (!confirm("Peringatan: Menghapus siswa akan menghapus akun login dan seluruh riwayat poinnya. Yakin?")) return;
    // Note: Due to foreign keys and auth.users, deleting from sr_profiles might require backend function
    // But since cascade is usually on sr_profiles -> sr_student_details it might work if we just delete profile
    // Wait, we can't delete auth.users from client. 
    alert("Penghapusan akun siswa harus melalui menu Pengaturan Sistem oleh Admin IT.");
  };

  // --- POINT RULES LOGIC ---
  const saveRule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("Mempersiapkan data...");
    try {
      const payload = {
        code: ruleForm.code,
        name: ruleForm.name,
        type: ruleForm.type,
        default_point: Math.abs(parseInt(ruleForm.default_point)) || 0
      };
      
      let actionError = null;
      setErrorMsg("Menyimpan ke database...");
      if (editingId) {
        const { error } = await supabase.from('sr_point_rules').update(payload).eq('id', editingId);
        actionError = error;
      } else {
        const { error } = await supabase.from('sr_point_rules').insert([payload]);
        actionError = error;
      }
      
      if (actionError) throw actionError;
      
      setErrorMsg("Memuat ulang data...");
      await fetchData();

      setShowRuleModal(false);
      setEditingId(null);
      setRuleForm({ code: '', name: '', type: 'NEGATIF', default_point: 5 });
      setErrorMsg("");
    } catch (error) {
      console.error("Error saveRule:", error);
      setErrorMsg(error?.message || JSON.stringify(error) || "Terjadi kesalahan yang tidak diketahui.");
    } finally {
      setSaving(false);
    }
  };

  const editRule = (r) => {
    setEditingId(r.id);
    setRuleForm({ code: r.code, name: r.name, type: r.type, default_point: r.default_point });
    setShowRuleModal(true);
  };

  const deleteRule = async (id) => {
    if (!confirm("Yakin hapus aturan ini?")) return;
    await supabase.from('sr_point_rules').delete().eq('id', id);
    await fetchData();
  };

  // --- EKSKUL LOGIC ---
  const saveEkskul = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("Mempersiapkan data...");
    try {
      const payload = {
        name: ekskulForm.name,
        category: ekskulForm.category,
        coach_id: ekskulForm.coach_id || null
      };

      let actionError = null;
      setErrorMsg("Menyimpan ke database...");
      if (editingId) {
        const { error } = await supabase.from('sr_extracurriculars').update(payload).eq('id', editingId);
        actionError = error;
      } else {
        const { error } = await supabase.from('sr_extracurriculars').insert([payload]);
        actionError = error;
      }
      
      if (actionError) throw actionError;

      setErrorMsg("Memuat ulang data...");
      await fetchData();

      setShowEkskulModal(false);
      setEditingId(null);
      setEkskulForm({ name: '', category: 'Pilihan', coach_id: '' });
      setErrorMsg("");
    } catch (error) {
      console.error("Error saveEkskul:", error);
      setErrorMsg(error?.message || JSON.stringify(error) || "Terjadi kesalahan yang tidak diketahui.");
    } finally {
      setSaving(false);
    }
  };

  const editEkskul = (e_item) => {
    setEditingId(e_item.id);
    setEkskulForm({ name: e_item.name, category: e_item.category, coach_id: e_item.coach_id || '' });
    setShowEkskulModal(true);
  };

  const deleteEkskul = async (id) => {
    if (!confirm("Yakin hapus ekskul ini?")) return;
    await supabase.from('sr_extracurriculars').delete().eq('id', id);
    await fetchData();
  };


  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Manajemen Kesiswaan</h1>
          <p className="text-muted">Kelola Siswa, Poin Kedisiplinan, dan Ekstrakurikuler</p>
        </div>
      </div>

      <div className="tabs-container">
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'siswa' ? 'active' : ''}`} onClick={() => {setActiveTab('siswa'); setSearchQuery(''); setFilterClass('');}}>
          <GraduationCap size={18} /> Master Siswa
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'aturan' ? 'active' : ''}`} onClick={() => {setActiveTab('aturan'); setSearchQuery('');}}>
          <AlertTriangle size={18} /> Tata Tertib (Poin)
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'ekskul' ? 'active' : ''}`} onClick={() => {setActiveTab('ekskul'); setSearchQuery('');}}>
          <Activity size={18} /> Ekstrakurikuler
        </button>
      </div>

      <div className="glass-panel">
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div className="form-input flex items-center gap-2" style={{maxWidth: 400, flexGrow: 1}}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Cari data..." 
              style={{background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none'}}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === 'siswa' && (
            <select 
              className="form-input" 
              style={{maxWidth: 200}}
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">-- Semua Kelas --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {activeTab === 'siswa' && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowSiswaModal(true)}>
              <Plus size={18} /> Daftarkan Siswa
            </button>
          )}
          {activeTab === 'aturan' && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowRuleModal(true)}>
              <Plus size={18} /> Tambah Aturan Poin
            </button>
          )}
          {activeTab === 'ekskul' && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowEkskulModal(true)}>
              <Plus size={18} /> Tambah Ekskul
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-muted py-10">Memuat data...</div>
        ) : (
          <div className="data-table-container">

            {/* TAB SISWA */}
            {activeTab === 'siswa' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>NISN / NIS</th>
                    <th>Kelas</th>
                    <th>JK</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(s => s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .filter(s => filterClass ? s.class_id === filterClass : true)
                    .map((s) => (
                    <tr key={s.profile_id}>
                      <td>
                        <div style={{fontWeight: 'bold', color: 'white'}}>{s.profile?.full_name}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{s.profile?.email}</div>
                      </td>
                      <td>
                        <div>{s.nisn || '-'}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>NIS: {s.nis || '-'}</div>
                      </td>
                      <td><span className="badge badge-success">{s.kelas?.name || 'Belum ada kelas'}</span></td>
                      <td>{s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => editSiswa(s)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                        <button onClick={() => deleteSiswa(s.profile_id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Belum ada data siswa.</td></tr>}
                </tbody>
              </table>
            )}

            {/* TAB ATURAN POIN */}
            {activeTab === 'aturan' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Deskripsi Aturan</th>
                    <th>Jenis</th>
                    <th>Bobot Poin</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pointRules.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((r) => (
                    <tr key={r.id}>
                      <td><span style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>{r.code}</span></td>
                      <td style={{fontWeight: 'bold', color: 'white'}}>{r.name}</td>
                      <td>
                        <span className={`badge ${
                          r.type === 'POSITIF' ? 'badge-primary' : 
                          r.type === 'NEGATIF' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {r.type}
                        </span>
                      </td>
                      <td>
                        <span style={{color: r.type === 'NEGATIF' ? '#ef4444' : '#10b981', fontWeight: 'bold', fontSize: 16}}>
                          {r.type === 'NEGATIF' ? '-' : '+'}{r.default_point}
                        </span>
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => editRule(r)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                        <button onClick={() => deleteRule(r.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {pointRules.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Belum ada aturan poin.</td></tr>}
                </tbody>
              </table>
            )}

            {/* TAB EKSKUL */}
            {activeTab === 'ekskul' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama Ekstrakurikuler</th>
                    <th>Sifat / Kategori</th>
                    <th>Guru Pembina</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {extracurriculars.filter(e => e.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((e) => (
                    <tr key={e.id}>
                      <td style={{fontWeight: 'bold', color: 'white'}}>{e.name}</td>
                      <td><span className="badge badge-success">{e.category}</span></td>
                      <td>{e.coach?.full_name || <span className="text-muted italic">Belum ditentukan</span>}</td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => editEkskul(e)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                        <button onClick={() => deleteEkskul(e.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {extracurriculars.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Belum ada data ekskul.</td></tr>}
                </tbody>
              </table>
            )}

          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* MODAL SISWA */}
      {showSiswaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Data Siswa' : 'Registrasi Siswa Baru'}</h2>
              <button onClick={() => {setShowSiswaModal(false); setEditingId(null); setSiswaForm({ full_name: '', email: '', nisn: '', nis: '', gender: 'L', class_id: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveSiswa}>
              <div className="modal-body">
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Nama Lengkap</label>
                    <input type="text" className="form-input" required value={siswaForm.full_name} onChange={e => setSiswaForm({...siswaForm, full_name: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Email Akademik (Login)</label>
                    <input type="email" className="form-input" required value={siswaForm.email} onChange={e => setSiswaForm({...siswaForm, email: e.target.value})} placeholder="siswa@sman2.sch.id" disabled={!!editingId} />
                  </div>
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>NISN</label>
                    <input type="text" className="form-input" required value={siswaForm.nisn} onChange={e => setSiswaForm({...siswaForm, nisn: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jenis Kelamin</label>
                    <select className="form-input" value={siswaForm.gender} onChange={e => setSiswaForm({...siswaForm, gender: e.target.value})}>
                      <option value="L">Laki-Laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Kelas Saat Ini</label>
                  {classes.length === 0 ? (
                    <div className="text-danger mb-2" style={{fontSize: 13, color: 'var(--danger-color)'}}>
                      ⚠️ Belum ada data Kelas. Silakan tambahkan di menu <b>Kurikulum</b> terlebih dahulu!
                    </div>
                  ) : null}
                  <select className="form-input" required value={siswaForm.class_id} onChange={e => setSiswaForm({...siswaForm, class_id: e.target.value})}>
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {!editingId && (
                  <div className="p-2 mt-2 rounded" style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: 12, color: 'var(--text-muted)'}}>
                    ℹ️ Password *default* login akan di-generate otomatis menjadi: <code>Siswa[NISN]</code>.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowSiswaModal(false); setEditingId(null); setSiswaForm({ full_name: '', email: '', nisn: '', nis: '', gender: 'L', class_id: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Memproses...' : editingId ? 'Simpan Perubahan' : 'Daftarkan Siswa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ATURAN POIN */}
      {showRuleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Aturan Poin' : 'Tambah Aturan Poin Baru'}</h2>
              <button onClick={() => {setShowRuleModal(false); setEditingId(null); setRuleForm({ code: '', name: '', type: 'NEGATIF', default_point: 5 });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveRule}>
              <div className="modal-body">
                {errorMsg && (
                  <div className="p-3 mb-4 rounded" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)'}}>
                    {errorMsg}
                  </div>
                )}
                <div className="form-group">
                  <label>Kode Pelanggaran/Prestasi</label>
                  <input type="text" className="form-input" required value={ruleForm.code} onChange={e => {setRuleForm({...ruleForm, code: e.target.value}); setErrorMsg('');}} placeholder="Cth: PLG-01 atau PRS-01" />
                </div>
                <div className="form-group">
                  <label>Deskripsi Aturan</label>
                  <input type="text" className="form-input" required value={ruleForm.name} onChange={e => {setRuleForm({...ruleForm, name: e.target.value}); setErrorMsg('');}} placeholder="Cth: Terlambat Masuk Sekolah" />
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jenis Poin</label>
                    <select className="form-input" value={ruleForm.type} onChange={e => setRuleForm({...ruleForm, type: e.target.value})}>
                      <option value="NEGATIF">Poin Negatif (Pelanggaran)</option>
                      <option value="POSITIF">Poin Positif (Prestasi)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Bobot Poin</label>
                    <input type="number" className="form-input" required value={ruleForm.default_point} onChange={e => setRuleForm({...ruleForm, default_point: e.target.value})} min="1" max="1000" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowRuleModal(false); setEditingId(null); setRuleForm({ code: '', name: '', type: 'NEGATIF', default_point: 5 }); setErrorMsg('');}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sedang Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Aturan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EKSKUL */}
      {showEkskulModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Unit Ekstrakurikuler' : 'Tambah Unit Ekstrakurikuler'}</h2>
              <button onClick={() => {setShowEkskulModal(false); setEditingId(null); setEkskulForm({ name: '', category: 'Pilihan', coach_id: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveEkskul}>
              <div className="modal-body">
                {errorMsg && (
                  <div className="p-3 mb-4 rounded" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)'}}>
                    {errorMsg}
                  </div>
                )}
                <div className="form-group">
                  <label>Nama Ekstrakurikuler</label>
                  <input type="text" className="form-input" required value={ekskulForm.name} onChange={e => {setEkskulForm({...ekskulForm, name: e.target.value}); setErrorMsg('');}} placeholder="Cth: Pasukan Pengibar Bendera" />
                </div>
                <div className="form-group">
                  <label>Kategori/Sifat</label>
                  <select className="form-input" value={ekskulForm.category} onChange={e => setEkskulForm({...ekskulForm, category: e.target.value})}>
                    <option value="Wajib">Wajib</option>
                    <option value="Pilihan">Pilihan Ekstra</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Guru Pembina</label>
                  <select className="form-input" value={ekskulForm.coach_id} onChange={e => setEkskulForm({...ekskulForm, coach_id: e.target.value})}>
                    <option value="">-- Belum Ditentukan --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowEkskulModal(false); setEditingId(null); setEkskulForm({ name: '', category: 'Pilihan', coach_id: '' }); setErrorMsg('');}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sedang Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Ekskul'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
