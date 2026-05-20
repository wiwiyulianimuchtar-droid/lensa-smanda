"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Save, Shield, CheckSquare, Square } from 'lucide-react';

export default function SystemSettings() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleClassChange = async (userId, className) => {
    setSaving(true);
    setUsers(users.map(u => u.id === userId ? { ...u, kelas_binaan: className } : u));
    
    const { error } = await supabase
      .from('sr_profiles')
      .update({ kelas_binaan: className })
      .eq('id', userId);
      
    if (error) {
      alert("Gagal menyimpan kelas binaan: " + error.message);
      fetchUsers();
    }
    setSaving(false);
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Pengaturan Sistem</h1>
          <p className="text-muted">Kelola akun, hak akses, dan fitur aplikasi secara global</p>
        </div>
      </div>

      <div className="glass-panel">
        <h2 className="mb-4" style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <Shield size={20} className="text-primary" /> Manajemen Hak Akses Pengguna
        </h2>
        <div className="flex items-center mb-4 gap-4">
          <div className="form-input flex items-center gap-2 w-full" style={{maxWidth: 400}}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Cari nama atau role..." 
              style={{background: 'transparent', border: 'none', color: 'white', width: '100%'}}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted">Memuat data pengguna...</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>Role</th>
                  <th>Status & Hak Akses Khusus</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{fontWeight: 'bold', color: 'white'}}>{user.full_name}</div>
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
                      {user.role === 'GURU' || user.role === 'ADMIN' ? (
                        <div style={{display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center'}}>
                          {/* PIKET */}
                          <div 
                            style={{display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: user.is_piket ? 'var(--secondary-color)' : 'var(--text-muted)'}}
                            onClick={() => handleToggle(user.id, 'is_piket', user.is_piket)}
                          >
                            {user.is_piket ? <CheckSquare size={18} /> : <Square size={18} />}
                            <span style={{fontSize: 14}}>Guru Piket</span>
                          </div>

                          {/* MANAJEMEN */}
                          <div 
                            style={{display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: user.is_manajemen ? '#8b5cf6' : 'var(--text-muted)'}}
                            onClick={() => handleToggle(user.id, 'is_manajemen', user.is_manajemen)}
                          >
                            {user.is_manajemen ? <CheckSquare size={18} /> : <Square size={18} />}
                            <span style={{fontSize: 14}}>Manajemen (Bisa lihat semua)</span>
                          </div>

                          {/* WALI KELAS */}
                          <div 
                            style={{display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: user.is_walikelas ? '#10b981' : 'var(--text-muted)'}}
                            onClick={() => handleToggle(user.id, 'is_walikelas', user.is_walikelas)}
                          >
                            {user.is_walikelas ? <CheckSquare size={18} /> : <Square size={18} />}
                            <span style={{fontSize: 14}}>Wali Kelas</span>
                          </div>
                          
                          {/* KELAS BINAAN */}
                          {user.is_walikelas && (
                            <input 
                              type="text"
                              value={user.kelas_binaan || ''}
                              onChange={(e) => handleClassChange(user.id, e.target.value)}
                              placeholder="Ketik Kelas (Cth: X MIPA 1)"
                              style={{
                                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', 
                                color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 13, width: 150
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted" style={{fontSize: 13}}>Tidak berlaku untuk Siswa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
