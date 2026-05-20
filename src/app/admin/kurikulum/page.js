"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, X, Users, BookOpen, GraduationCap } from 'lucide-react';

export default function KurikulumMaster() {
  const [activeTab, setActiveTab] = useState('guru'); // 'guru', 'kelas', 'mapel'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data States
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]); // for Wali Kelas dropdown
  
  // Modal States
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // Form States
  const [editingId, setEditingId] = useState(null);
  const [guruForm, setGuruForm] = useState({ full_name: '', email: '', nip: '', nuptk: '', gender: 'L', birth_date: '', employment_status: 'PNS', phone: '' });
  const [classForm, setClassForm] = useState({ name: '', grade_level: 'X', major: 'MIPA', homeroom_teacher_id: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', category: 'WAJIB' });

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'guru') {
        const { data, error } = await supabase.from('sr_teacher_details').select(`
          *,
          profile:sr_profiles!sr_teacher_details_profile_id_fkey(full_name, email)
        `);
        if (error) console.error(error);
        if (data) setTeachers(data);
      } else if (activeTab === 'kelas') {
        const { data, error } = await supabase.from('sr_classes').select(`
          *,
          wali_kelas:sr_profiles!sr_classes_homeroom_teacher_id_fkey(full_name)
        `).order('grade_level').order('name');
        if (error) console.error(error);
        if (data) setClasses(data);
        
        const { data: usersData } = await supabase.from('sr_profiles').select('id, full_name').eq('role', 'GURU').order('full_name');
        if (usersData) setUsers(usersData);
      } else if (activeTab === 'mapel') {
        const { data, error } = await supabase.from('sr_subjects').select('*').order('category').order('name');
        if (error) console.error(error);
        if (data) setSubjects(data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- TAB GURU LOGIC ---
  const saveGuru = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (editingId) {
      try {
        // Edit Mode - Update Profile first
        const { error: profileError } = await supabase.from('sr_profiles').update({
          full_name: guruForm.full_name,
        }).eq('id', editingId);

        if (profileError) throw profileError;

        // Then update Teacher Details
        const { error: detailError } = await supabase.from('sr_teacher_details').update({
          nip: guruForm.nip || null,
          nuptk: guruForm.nuptk || null,
          gender: guruForm.gender || null,
          birth_date: guruForm.birth_date || null,
          employment_status: guruForm.employment_status || null,
          phone: guruForm.phone || null
        }).eq('profile_id', editingId);

        if (detailError) throw detailError;

        setShowGuruModal(false);
        setEditingId(null);
        alert("Data Pendidik berhasil diperbarui!");
        await fetchData();
      } catch (err) {
        alert("Gagal memperbarui guru: " + err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Insert Mode
    const autoPassword = `Guru${guruForm.nip || '123'}`;
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: guruForm.full_name,
          email: guruForm.email,
          password: autoPassword,
          nip: guruForm.nip,
          nuptk: guruForm.nuptk,
          gender: guruForm.gender,
          birth_date: guruForm.birth_date,
          employment_status: guruForm.employment_status,
          phone: guruForm.phone
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowGuruModal(false);
      setGuruForm({ full_name: '', email: '', nip: '', nuptk: '', gender: 'L', birth_date: '', employment_status: 'PNS', phone: '' });
      alert(`Guru berhasil ditambahkan!\nPassword Default: ${autoPassword}`);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteGuru = async (profileId) => {
    alert("Penghapusan akun guru harus melalui menu Pengaturan Sistem oleh Admin IT.");
  };

  const editGuru = (guru) => {
    setEditingId(guru.profile_id);
    setGuruForm({
      full_name: guru.profile.full_name,
      email: guru.profile.email,
      nip: guru.nip || '',
      nuptk: guru.nuptk || '',
      gender: guru.gender || 'L',
      birth_date: guru.birth_date || '',
      employment_status: guru.employment_status || 'PNS',
      phone: guru.phone || ''
    });
    setShowGuruModal(true);
  };

  // --- TAB KELAS (CLASS) LOGIC ---
  const saveClass = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      name: classForm.name, 
      grade_level: classForm.grade_level,
      major: classForm.major,
      homeroom_teacher_id: classForm.homeroom_teacher_id || null
    };

    let error;
    if (editingId) {
      const res = await supabase.from('sr_classes').update(payload).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('sr_classes').insert([payload]);
      error = res.error;
    }

    if (error) {
      alert("Gagal menyimpan kelas: " + error.message);
    } else {
      setShowClassModal(false);
      setEditingId(null);
      setClassForm({ name: '', grade_level: 'X', major: 'MIPA', homeroom_teacher_id: '' });
      await fetchData();
    }
    setSaving(false);
  };

  const editClass = (cls) => {
    setEditingId(cls.id);
    setClassForm({
      name: cls.name,
      grade_level: cls.grade_level.toString(),
      homeroom_teacher_id: cls.homeroom_teacher_id || ''
    });
    setShowClassModal(true);
  };

  const deleteClass = async (id) => {
    if (!confirm("Yakin ingin menghapus kelas ini?")) return;
    const { error } = await supabase.from('sr_classes').delete().eq('id', id);
    if (error) alert("Gagal menghapus: " + error.message);
    else await fetchData();
  };

  // --- TAB MAPEL (SUBJECT) LOGIC ---
  const saveSubject = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      name: subjectForm.name, 
      code: subjectForm.code,
      category: subjectForm.category
    };

    let error;
    if (editingId) {
      const res = await supabase.from('sr_subjects').update(payload).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('sr_subjects').insert([payload]);
      error = res.error;
    }

    if (error) {
      alert("Gagal menyimpan mapel: " + error.message);
    } else {
      setShowSubjectModal(false);
      setEditingId(null);
      setSubjectForm({ name: '', code: '', category: 'WAJIB' });
      await fetchData();
    }
    setSaving(false);
  };

  const editSubject = (sub) => {
    setEditingId(sub.id);
    setSubjectForm({
      name: sub.name,
      code: sub.code,
      category: sub.category
    });
    setShowSubjectModal(true);
  };

  const deleteSubject = async (id) => {
    if (!confirm("Yakin ingin menghapus mapel ini?")) return;
    const { error } = await supabase.from('sr_subjects').delete().eq('id', id);
    if (error) alert("Gagal menghapus: " + error.message);
    else fetchData();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };


  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Manajemen Kurikulum</h1>
          <p className="text-muted">Kelola data Tenaga Pendidik, Kelas, dan Mata Pelajaran</p>
        </div>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'guru' ? 'active' : ''}`}
          onClick={() => {setActiveTab('guru'); setSearchQuery('');}}
        >
          <GraduationCap size={18} /> Master Guru
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'kelas' ? 'active' : ''}`}
          onClick={() => {setActiveTab('kelas'); setSearchQuery('');}}
        >
          <Users size={18} /> Master Kelas
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'mapel' ? 'active' : ''}`}
          onClick={() => {setActiveTab('mapel'); setSearchQuery('');}}
        >
          <BookOpen size={18} /> Master Mapel
        </button>
      </div>

      <div className="glass-panel">
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div className="form-input flex items-center gap-2" style={{maxWidth: 400, flexGrow: 1}}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Cari data..." 
              style={{background: 'transparent', border: 'none', color: 'white', width: '100%'}}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === 'guru' && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowGuruModal(true)}>
              <Plus size={18} /> Tambah Guru
            </button>
          )}

          {activeTab === 'kelas' && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowClassModal(true)}>
              <Plus size={18} /> Tambah Kelas
            </button>
          )}

          {activeTab === 'mapel' && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowSubjectModal(true)}>
              <Plus size={18} /> Tambah Mapel
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-muted py-10">Memuat data...</div>
        ) : (
          <div className="data-table-container">

            {/* RENDER GURU */}
            {activeTab === 'guru' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama Pendidik</th>
                    <th>NIP / NUPTK</th>
                    <th>JK</th>
                    <th>Tgl Lahir</th>
                    <th>Status</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.filter(t => t.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((t) => (
                    <tr key={t.profile_id}>
                      <td>
                        <div style={{fontWeight: 'bold', color: 'white'}}>{t.profile?.full_name}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{t.profile?.email}</div>
                      </td>
                      <td>
                        <div>{t.nip || '-'}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>NUPTK: {t.nuptk || '-'}</div>
                      </td>
                      <td>{t.gender === 'L' ? 'Laki-laki' : t.gender === 'P' ? 'Perempuan' : '-'}</td>
                      <td>{formatDate(t.birth_date)}</td>
                      <td>
                        <span className={`badge ${t.employment_status === 'PNS' || t.employment_status === 'PPPK' ? 'badge-primary' : 'badge-warning'}`}>
                          {t.employment_status || 'GTT'}
                        </span>
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => editGuru(t)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                        <button onClick={() => deleteGuru(t.profile_id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {teachers.length === 0 && <tr><td colSpan="6" className="text-center text-muted">Belum ada data guru.</td></tr>}
                </tbody>
              </table>
            )}

            {/* RENDER KELAS */}
            {activeTab === 'kelas' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tingkat</th>
                    <th>Nama Kelas</th>
                    <th>Wali Kelas</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                    <tr key={c.id}>
                      <td><span className="badge badge-success">Kelas {c.grade_level}</span></td>
                      <td style={{fontWeight: 'bold', color: 'white'}}>{c.name}</td>
                      <td>{c.wali_kelas?.full_name || <span className="text-muted italic">Belum ditentukan</span>}</td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => editClass(c)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                        <button onClick={() => deleteClass(c.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {classes.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Belum ada data kelas.</td></tr>}
                </tbody>
              </table>
            )}

            {/* RENDER MAPEL */}
            {activeTab === 'mapel' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode Mapel</th>
                    <th>Nama Mata Pelajaran</th>
                    <th>Kategori</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((s) => (
                    <tr key={s.id}>
                      <td><span style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>{s.code}</span></td>
                      <td style={{fontWeight: 'bold', color: 'white'}}>{s.name}</td>
                      <td>
                        <span className={`badge ${s.category === 'WAJIB' ? 'badge-primary' : 'badge-warning'}`}>
                          {s.category}
                        </span>
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => editSubject(s)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                        <button onClick={() => deleteSubject(s.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {subjects.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Belum ada data mapel.</td></tr>}
                </tbody>
              </table>
            )}

          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* MODAL TAMBAH GURU */}
      {showGuruModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Data Pendidik' : 'Registrasi Tenaga Pendidik'}</h2>
              <button onClick={() => {setShowGuruModal(false); setEditingId(null); setGuruForm({ full_name: '', email: '', nip: '', nuptk: '', gender: 'L', birth_date: '', employment_status: 'PNS', phone: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveGuru}>
              <div className="modal-body">
                {/* Baris 1: Nama dan Email */}
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Nama Lengkap (Beserta Gelar)</label>
                    <input type="text" className="form-input" required value={guruForm.full_name} onChange={e => setGuruForm({...guruForm, full_name: e.target.value})} placeholder="Budi Santoso, S.Pd." />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Email Akademik (Login)</label>
                    <input type="email" className="form-input" required value={guruForm.email} onChange={e => setGuruForm({...guruForm, email: e.target.value})} placeholder="guru@sman2.sch.id" disabled={!!editingId} />
                  </div>
                </div>

                {/* Baris 2: NIP, NUPTK, Jenis Kelamin */}
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>NIP</label>
                    <input type="text" className="form-input" required value={guruForm.nip} onChange={e => setGuruForm({...guruForm, nip: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>NUPTK (Opsional)</label>
                    <input type="text" className="form-input" value={guruForm.nuptk} onChange={e => setGuruForm({...guruForm, nuptk: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jenis Kelamin</label>
                    <select className="form-input" value={guruForm.gender} onChange={e => setGuruForm({...guruForm, gender: e.target.value})}>
                      <option value="L">Laki-Laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>

                {/* Baris 3: Tanggal Lahir, Status, No WA */}
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Tanggal Lahir</label>
                    <input type="date" className="form-input" required value={guruForm.birth_date} onChange={e => setGuruForm({...guruForm, birth_date: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Status</label>
                    <select className="form-input" value={guruForm.employment_status} onChange={e => setGuruForm({...guruForm, employment_status: e.target.value})}>
                      <option value="PNS">PNS</option>
                      <option value="PPPK">PPPK</option>
                      <option value="HONORER">Honorer</option>
                      <option value="GTT">GTT</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>No. WhatsApp</label>
                    <input type="text" className="form-input" value={guruForm.phone} onChange={e => setGuruForm({...guruForm, phone: e.target.value})} />
                  </div>
                </div>

                {!editingId && (
                  <div className="p-2 rounded" style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: 12, color: 'var(--text-muted)', marginTop: 4}}>
                    ℹ️ Password *default* login akan di-generate otomatis menjadi: <code>Guru[NIP]</code>.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowGuruModal(false); setEditingId(null); setGuruForm({ full_name: '', email: '', nip: '', nuptk: '', gender: 'L', birth_date: '', employment_status: 'PNS', phone: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Memproses...' : editingId ? 'Simpan Perubahan' : 'Daftarkan Guru'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH KELAS */}
      {showClassModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}</h2>
              <button onClick={() => {setShowClassModal(false); setEditingId(null); setClassForm({ name: '', grade_level: '10', wali_kelas_id: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveClass}>
              <div className="modal-body">
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Tingkat Kelas</label>
                    <select 
                      className="form-input" 
                      value={classForm.grade_level}
                      onChange={(e) => setClassForm({...classForm, grade_level: e.target.value})}
                    >
                      <option value="X">Kelas X</option>
                      <option value="XI">Kelas XI</option>
                      <option value="XII">Kelas XII</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jurusan / Peminatan</label>
                    <select 
                      className="form-input" 
                      value={classForm.major}
                      onChange={(e) => setClassForm({...classForm, major: e.target.value})}
                    >
                      <option value="MIPA">MIPA</option>
                      <option value="IPS">IPS</option>
                      <option value="BAHASA">Bahasa</option>
                      <option value="UMUM">Umum (Kurmer)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nama Ruang Kelas (Cth: X MIPA 1)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={classForm.name}
                    onChange={(e) => setClassForm({...classForm, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pilih Wali Kelas (Opsional)</label>
                  <select 
                    className="form-input"
                    value={classForm.homeroom_teacher_id}
                    onChange={(e) => setClassForm({...classForm, homeroom_teacher_id: e.target.value})}
                  >
                    <option value="">-- Belum Ditentukan --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowClassModal(false); setEditingId(null); setClassForm({ name: '', grade_level: '10', wali_kelas_id: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH MAPEL */}
      {showSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</h2>
              <button onClick={() => {setShowSubjectModal(false); setEditingId(null); setSubjectForm({ name: '', code: '', category: 'WAJIB' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveSubject}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Kode Mapel (Harus Unik)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({...subjectForm, code: e.target.value})}
                    required
                    placeholder="Cth: MAT-X"
                  />
                </div>
                <div className="form-group">
                  <label>Nama Mata Pelajaran</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                    required
                    placeholder="Cth: Matematika Wajib"
                  />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select 
                    className="form-input" 
                    value={subjectForm.category}
                    onChange={(e) => setSubjectForm({...subjectForm, category: e.target.value})}
                  >
                    <option value="WAJIB">Wajib</option>
                    <option value="PEMINATAN">Peminatan</option>
                    <option value="MUATAN_LOKAL">Muatan Lokal</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowSubjectModal(false); setEditingId(null); setSubjectForm({ name: '', code: '', category: 'WAJIB' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
