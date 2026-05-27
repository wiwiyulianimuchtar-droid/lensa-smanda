"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, PlusCircle, CheckCircle, Clock, XCircle, Send, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function PerizinanPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'request'

  // Form State
  const [tipe, setTipe] = useState('Izin Keluar Lingkungan Sekolah');
  const [alasan, setAlasan] = useState('');
  const [waktu, setWaktu] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchMyPermissions();
    }
  }, [user]);

  const fetchMyPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sr_permissions')
        .select(`
          *,
          approver:approver_id (full_name)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPermissions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!alasan.trim()) {
      alert("Masukkan alasan perizinan Anda.");
      return;
    }
    if (!waktu.trim()) {
      alert("Masukkan rentang waktu izin Anda (misal: Jam Pelajaran 3-4, atau 09:00 - 10:00).");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('sr_permissions')
        .insert([{
          student_id: user.id,
          tipe: tipe,
          alasan: alasan,
          waktu: waktu,
          status: 'PENDING'
        }]);

      if (error) throw error;

      alert("Permintaan izin berhasil diajukan. Silakan temui guru piket untuk konfirmasi persetujuan.");
      
      // Reset Form
      setAlasan('');
      setWaktu('');
      
      // Switch back to list and refresh
      setActiveTab('list');
      fetchMyPermissions();
    } catch (err) {
      console.error(err);
      alert("Gagal mengajukan izin: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DISETUJUI':
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <CheckCircle size={12} /> Disetujui
          </span>
        );
      case 'SELESAI':
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <CheckCircle size={12} /> Selesai
          </span>
        );
      case 'DITOLAK':
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <XCircle size={12} /> Ditolak
          </span>
        );
      default:
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/siswa" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>E-Perizinan Siswa</h2>
      </div>

      {/* Warning Box */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(59,130,246,0.05)' }}>
        <ShieldAlert size={24} color="var(--secondary-color)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0 }}>Alur Persetujuan Izin</h4>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
            Ajukan izin lewat aplikasi terlebih dahulu, lalu temui Guru Piket di meja piket sekolah untuk memverifikasi dan mengubah status izin menjadi DISETUJUI.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: 4
      }}>
        <button 
          onClick={() => setActiveTab('list')}
          style={{
            flex: 1, padding: '12px 0', background: 'transparent',
            color: activeTab === 'list' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'list' ? 'bold' : 'normal',
            borderBottom: activeTab === 'list' ? '2px solid var(--primary-color)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Riwayat Perizinan
        </button>
        <button 
          onClick={() => setActiveTab('request')}
          style={{
            flex: 1, padding: '12px 0', background: 'transparent',
            color: activeTab === 'request' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'request' ? 'bold' : 'normal',
            borderBottom: activeTab === 'request' ? '2px solid var(--primary-color)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Ajukan Izin Baru
        </button>
      </div>

      {/* Content */}
      {activeTab === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          
          <div style={{ display: 'flex', justifyBetween: true, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total {permissions.length} perizinan</span>
            <button 
              onClick={() => setActiveTab('request')}
              style={{
                fontSize: 12, fontWeight: 'bold', color: 'var(--primary-color)',
                background: 'transparent', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <PlusCircle size={14} /> Ajukan Baru
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', py: 20 }}>Memuat data izin...</p>
          ) : permissions.length === 0 ? (
            <div style={{
              border: '1px dashed var(--surface-border)', borderRadius: 16,
              padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              textAlign: 'center', color: 'var(--text-muted)'
            }}>
              <CheckCircle size={32} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Belum pernah mengajukan izin.</p>
              <button onClick={() => setActiveTab('request')} className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px', marginTop: 4 }}>
                Ajukan Sekarang
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {permissions.map((perm) => (
                <div key={perm.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 'bold', color: 'white', margin: 0 }}>
                        {perm.tipe}
                      </h4>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Diajukan: {new Date(perm.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Alasan: </span>
                      <span style={{ color: 'white', fontWeight: '500' }}>{perm.alasan}</span>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Waktu: </span>
                      <span style={{ color: 'white', fontWeight: '500' }}>{perm.waktu}</span>
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--surface-border)', margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getStatusBadge(perm.status)}
                    {perm.approver && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Oleh: <strong>{perm.approver.full_name}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        /* Request Tab */
        <form onSubmit={handleSubmit} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Jenis Perizinan</label>
            <select 
              value={tipe}
              onChange={(e) => setTipe(e.target.value)}
              className="form-input"
              required
              style={{ width: '100%' }}
            >
              <option value="Izin Keluar Lingkungan Sekolah">Izin Keluar Lingkungan Sekolah (KBM)</option>
              <option value="Izin Terlambat Masuk Sekolah">Izin Terlambat Masuk Sekolah</option>
              <option value="Izin Dispensasi Kegiatan Sekolah">Izin Dispensasi Kegiatan Sekolah</option>
              <option value="Izin Penggunaan Jaket/Pakaian Khusus">Izin Penggunaan Jaket/Pakaian Khusus</option>
              <option value="Izin Pulang Lebih Cepat (Sakit/Keperluan)">Izin Pulang Lebih Cepat</option>
            </select>
          </div>

          <div className="form-group">
            <label>Alasan Izin</label>
            <textarea 
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Tulis alasan detail perizinan Anda..."
              rows={3}
              className="form-input"
              required
              style={{ width: '100%', resize: 'none', padding: 12 }}
            />
          </div>

          <div className="form-group">
            <label>Waktu / Durasi Izin</label>
            <input 
              type="text"
              value={waktu}
              onChange={(e) => setWaktu(e.target.value)}
              placeholder="Contoh: Jam Pelajaran 5-6, atau 10:00 - 11:30 WIB"
              className="form-input"
              required
              style={{ width: '100%' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={submitting}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              gap: 8, padding: '12px 0', fontSize: 14, fontWeight: 'bold', marginTop: 8
            }}
          >
            <Send size={16} />
            {submitting ? "Mengirim Pengajuan..." : "Kirim Pengajuan Izin"}
          </button>
        </form>
      )}

    </div>
  );
}
