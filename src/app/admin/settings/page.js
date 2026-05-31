"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Shield, CheckSquare, Square, Lock, Key, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function SystemSettings() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('access'); // 'access', 'passwords'
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [tempPasswords, setTempPasswords] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.role !== 'ADMIN') {
        router.replace('/admin');
      } else {
        fetchUsers();
        fetchClasses();
        fetchTempPasswords();
      }
    }
  }, [profile, authLoading, router]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sr_profiles')
      .select('*')
      .order('role')
      .order('full_name');
    
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('sr_classes')
        .select('id, name')
        .order('name');
      if (!error && data) {
        setClasses(data);
      }
    } catch (e) {
      console.error("Gagal memuat daftar kelas:", e);
    }
  };

  const fetchTempPasswords = async () => {
    try {
      const res = await fetch('/api/reset-password');
      if (res.ok) {
        const data = await res.json();
        setTempPasswords(data);
      }
    } catch (e) {
      console.error("Gagal memuat temp passwords:", e);
    }
  };

  const handleToggle = async (userId, field, currentValue) => {
    setSaving(true);
    const newValue = !currentValue;
    
    // Optimistic update
    setUsers(users.map(u => u.id === userId ? { ...u, [field]: newValue } : u));
    
    const { error } = await supabase
      .from('sr_profiles')
      .update({ [field]: newValue })
      .eq('id', userId);
      
    if (error) {
      alert("Gagal menyimpan perubahan: " + error.message);
      fetchUsers(); // revert
    }
    setSaving(false);
  };

  const handleManajemenRoleChange = async (userId, roleValue) => {
    setSaving(true);
    setUsers(users.map(u => u.id === userId ? { ...u, manajemen_role: roleValue } : u));
    
    const { error } = await supabase
      .from('sr_profiles')
      .update({ manajemen_role: roleValue || null })
      .eq('id', userId);
      
    if (error) {
      alert("Gagal menyimpan jabatan manajemen: " + error.message);
      fetchUsers();
    }
    setSaving(false);
  };

  const handleResetPassword = async (userId, userEmail, nomorInduk, role) => {
    // Saran password: Siswa[NISN] atau Guru[NIP]
    const defaultSuggestion = role === 'SISWA' 
      ? `Siswa${nomorInduk || '12345'}` 
      : `Guru${nomorInduk || '12345'}`;

    const newPass = prompt(
      `Reset Password untuk ${userEmail}:\n(Ketik password baru, minimal 6 karakter)`, 
      defaultSuggestion
    );

    if (newPass === null) return; // Batal
    if (newPass.trim().length < 6) {
      alert("Password minimal harus 6 karakter!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password: newPass })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Sandi berhasil direset!");
        setTempPasswords(prev => ({ ...prev, [userId]: newPass }));
      } else {
        alert("Gagal mereset sandi: " + data.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !profile) {
    return <div className="text-center text-muted py-20">Memeriksa hak akses...</div>;
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.role?.toLowerCase().includes(search.toLowerCase()) ||
    u.nomor_induk?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Pengaturan Sistem</h1>
          <p className="text-muted">Kelola akun, hak akses, dan fitur aplikasi secara global</p>
        </div>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'access' ? 'active' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          <Shield size={18} /> Hak Akses & Jabatan
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'passwords' ? 'active' : ''}`}
          onClick={() => setActiveTab('passwords')}
        >
          <Key size={18} /> Manajemen Kata Sandi
        </button>
      </div>

      <div className="glass-panel">
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div className="form-input flex items-center gap-2" style={{maxWidth: 420, flexGrow: 1}}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Cari pengguna berdasarkan nama, email, atau NIP/NISN..." 
              style={{background: 'transparent', border: 'none', color: 'var(--text-light)', width: '100%', outline: 'none'}}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {saving && <span className="text-sm text-yellow-500 animate-pulse">Menyimpan perubahan...</span>}
        </div>

        {loading ? (
          <p className="text-center text-muted py-10">Memuat data pengguna...</p>
        ) : (
          <div className="data-table-container">
            {activeTab === 'access' ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama Lengkap</th>
                    <th>Role Utama</th>
                    <th>Status & Hak Akses Khusus</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{user.full_name || 'Tidak Ada Nama'}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{user.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${
                          user.role === 'ADMIN' ? 'badge-primary' : 
                          user.role === 'GURU' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.role === 'GURU' ? (
                          <div style={{display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center'}}>
                            {/* MANAJEMEN */}
                            <div 
                              style={{display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: user.is_manajemen ? '#8b5cf6' : 'var(--text-muted)'}}
                              onClick={() => handleToggle(user.id, 'is_manajemen', user.is_manajemen)}
                            >
                              {user.is_manajemen ? <CheckSquare size={18} /> : <Square size={18} />}
                              <span style={{fontSize: 14, fontWeight: '500'}}>Manajemen Sekolah</span>
                            </div>

                            {/* JABATAN MANAJEMEN */}
                            {user.is_manajemen && (
                              <>
                                <select
                                  value={user.manajemen_role || ''}
                                  onChange={(e) => handleManajemenRoleChange(user.id, e.target.value)}
                                  style={{
                                    background: 'var(--input-bg)', border: '1px solid var(--surface-border)', 
                                    color: 'var(--text-light)', padding: '4px 8px', borderRadius: 4, fontSize: 13, width: 160
                                  }}
                                >
                                  <option value="" style={{color: 'var(--text-light)', background: 'var(--surface-dark)'}}>-- Pilih Divisi --</option>
                                  <option value="KURIKULUM" style={{color: 'var(--text-light)', background: 'var(--surface-dark)'}}>Kurikulum</option>
                                  <option value="KESISWAAN" style={{color: 'var(--text-light)', background: 'var(--surface-dark)'}}>Kesiswaan</option>
                                  <option value="HUMAS" style={{color: 'var(--text-light)', background: 'var(--surface-dark)'}}>Humas</option>
                                  <option value="SARPRAS" style={{color: 'var(--text-light)', background: 'var(--surface-dark)'}}>Sarpras</option>
                                </select>

                                {/* Sebagai Waka */}
                                <div 
                                  style={{display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: user.is_waka ? '#3b82f6' : 'var(--text-muted)'}}
                                  onClick={() => handleToggle(user.id, 'is_waka', user.is_waka)}
                                >
                                  {user.is_waka ? <CheckSquare size={18} /> : <Square size={18} />}
                                  <span style={{fontSize: 13, fontWeight: '500'}}>Sebagai Waka</span>
                                </div>
                              </>
                            )}

                            {/* KEPALA SEKOLAH */}
                            <div 
                              style={{display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: user.is_kepsek ? '#f97316' : 'var(--text-muted)'}}
                              onClick={() => handleToggle(user.id, 'is_kepsek', user.is_kepsek)}
                            >
                              {user.is_kepsek ? <CheckSquare size={18} /> : <Square size={18} />}
                              <span style={{fontSize: 14, fontWeight: '500'}}>Kepala Sekolah</span>
                            </div>
                          </div>
                        ) : user.role === 'ADMIN' ? (
                          <span style={{fontSize: 13, color: 'var(--primary-color)', fontWeight: 'bold'}}>Admin (Kendali Penuh Sistem)</span>
                        ) : user.role === 'SISWA' ? (
                          <span style={{fontSize: 13, color: 'var(--text-muted)'}}>Siswa (Akses Presensi & Poin)</span>
                        ) : (
                          <span style={{fontSize: 13, color: 'var(--text-muted)'}}>Orang Tua (Akses Pantau Anak)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Pengguna tidak ditemukan.</td></tr>}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama & Email</th>
                    <th>Role</th>
                    <th>No. Induk (NIS/NIP)</th>
                    <th>Kata Sandi Terdaftar (Simpanan)</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{user.full_name || 'Tidak Ada Nama'}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{user.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${
                          user.role === 'ADMIN' ? 'badge-primary' : 
                          user.role === 'GURU' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <code style={{fontSize: 13, color: 'var(--text-muted)'}}>{user.nomor_induk || '-'}</code>
                      </td>
                      <td>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                          <Lock size={14} className="text-muted" />
                          <span style={{fontFamily: 'monospace', fontWeight: 'bold', color: tempPasswords[user.id] ? '#34d399' : 'var(--text-muted)'}}>
                            {tempPasswords[user.id] || 'Telah Diubah / Rahasia'}
                          </span>
                        </div>
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <button 
                          onClick={() => handleResetPassword(user.id, user.email, user.nomor_induk, user.role)} 
                          className="btn-secondary" 
                          style={{
                            padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
                            border: '1px solid var(--surface-border)', color: 'var(--text-light)', background: 'transparent'
                          }}
                          disabled={saving}
                        >
                          <RefreshCw size={12} /> Reset Sandi
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Pengguna tidak ditemukan.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
