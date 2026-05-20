"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Printer } from 'lucide-react';
import Link from 'next/link';

export default function ReportsList() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    // Fetch students and calculate their total points via RPC or a simple join if using view.
    // For MVP, we will fetch profiles and we can calculate it on the fly or just display the profiles first.
    const { data, error } = await supabase
      .from('sr_profiles')
      .select('*')
      .eq('role', 'SISWA')
      .order('full_name');
    
    if (data) {
      setStudents(data);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.class_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Cetak Rapor Karakter</h1>
          <p className="text-muted">Pilih siswa untuk melihat dan mencetak Rapor Karakter & Ekskul</p>
        </div>
      </div>

      <div className="glass-panel">
        <div className="flex items-center mb-4 gap-4">
          <div className="form-input flex items-center gap-2 w-full" style={{maxWidth: 400}}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Cari nama atau kelas siswa..." 
              style={{background: 'transparent', border: 'none', color: 'white', width: '100%'}}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted">Memuat data siswa...</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>Kelas</th>
                  <th>NISN</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((siswa) => (
                  <tr key={siswa.id}>
                    <td style={{fontWeight: 'bold'}}>{siswa.full_name}</td>
                    <td><span className="badge badge-primary">{siswa.class_name || 'Belum Diatur'}</span></td>
                    <td className="text-muted">{siswa.nisn || '-'}</td>
                    <td>
                      <Link href={`/admin/reports/${siswa.id}`}>
                        <button className="btn-primary flex items-center gap-2" style={{padding: '6px 12px', fontSize: 14}}>
                          <Printer size={16} /> Buka Rapor
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-4">Tidak ada siswa yang ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
