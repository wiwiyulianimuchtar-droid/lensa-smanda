"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    totalPelanggaran: 0,
    geofenceActive: false
  });

  useEffect(() => {
    // In a real app, this would fetch actual stats from Supabase
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: siswaCount } = await supabase.from('sr_profiles').select('*', { count: 'exact', head: true }).eq('role', 'SISWA');
      const { count: guruCount } = await supabase.from('sr_profiles').select('*', { count: 'exact', head: true }).eq('role', 'GURU');
      const { count: pelanggaranCount } = await supabase.from('sr_activities').select('*', { count: 'exact', head: true }).eq('type', 'NEGATIF').eq('status', 'APPROVED');

      setStats({
        totalSiswa: siswaCount || 0,
        totalGuru: guruCount || 0,
        totalPelanggaran: pelanggaranCount || 0
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getDashboardTitle = () => {
    if (!profile) return 'Dashboard';
    if (profile.role === 'ADMIN') return 'Dashboard Administrator';
    if (profile.is_manajemen) return 'Dashboard Manajemen';
    if (profile.is_walikelas) return `Dashboard Wali Kelas (${profile.kelas_binaan || '-'})`;
    return 'Dashboard Guru';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>{getDashboardTitle()}</h1>
          <p className="text-muted">
            Selamat datang, {profile?.full_name || 'Pengguna'}! Berikut ringkasan data hari ini.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <ShieldCheck size={20} />
          <span>Generate Laporan Harian</span>
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <span className="stat-title">Total Siswa</span>
          <span className="stat-value">{stats.totalSiswa}</span>
        </div>
        
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#34d399'}}>
            <ShieldCheck size={24} />
          </div>
          <span className="stat-title">Total Guru / Wali Kelas</span>
          <span className="stat-value">{stats.totalGuru}</span>
        </div>
        
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{background: 'rgba(239, 68, 68, 0.1)', color: '#f87171'}}>
            <AlertTriangle size={24} />
          </div>
          <span className="stat-title">Aktivitas Negatif (Bulan Ini)</span>
          <span className="stat-value">{stats.totalPelanggaran}</span>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa'}}>
            <MapPin size={24} />
          </div>
          <span className="stat-title">Status Geofence Sekolah</span>
          <span className="stat-value" style={{fontSize: '1.5rem', color: '#34d399'}}>
            {stats.geofenceActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </div>

      <h2>Aktivitas Terbaru</h2>
      <div className="glass-panel mt-4">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Siswa</th>
                <th>Tipe</th>
                <th>Deskripsi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Simulasi Data Presensi Harian (Sebaiknya dari DB di produksi sebenarnya) */}
              <tr>
                <td>Hari ini, 07:00 WIB</td>
                <td>Siswa Terakhir Scan</td>
                <td><span className="badge badge-success">PRESENSI</span></td>
                <td>Hadir Sesi Pagi</td>
                <td><span className="text-muted">Selesai</span></td>
              </tr>
            </tbody>
          </table>
          <p style={{textAlign: 'center', marginTop: 15, fontSize: 12, color: 'var(--text-muted)'}}>
            (Daftar Presensi Harian Lengkap Sedang Dimuat dari Server...)
          </p>
        </div>
      </div>
    </div>
  );
}
