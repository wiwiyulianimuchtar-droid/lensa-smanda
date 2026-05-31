"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, Clock, Calendar, ShieldCheck, ShieldAlert, Award, FileText, Search } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [totalPoints, setTotalPoints] = useState(2000);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'PRESENSI' | 'POSITIF' | 'NEGATIF'
  const [search, setSearch] = useState('');

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ledgers
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('sr_point_ledgers')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (ledgerError) throw ledgerError;

      // 2. Fetch linked source details to get friendly descriptions
      // Let's resolve transaction detail descriptions
      // We will perform client-side queries or join resolving since the source_id can point to either activities or attendance_records
      const resolved = [];
      const BASE_POINT = 2000;
      
      if (ledgerData && ledgerData.length > 0) {
        // Find all attendance records
        const attendanceIds = ledgerData.filter(l => l.source_type === 'PRESENSI').map(l => l.source_id);
        // Find all activities
        const activityIds = ledgerData.filter(l => l.source_type === 'AKTIVITAS_POSITIF' || l.source_type === 'AKTIVITAS_NEGATIF').map(l => l.source_id);

        let attendanceMap = {};
        let activityMap = {};

        // Fetch attendance sessions details
        if (attendanceIds.length > 0) {
          const recRes = await fetch('/api/records');
          const attData = recRes.ok ? await recRes.json() : [];
          const sessionRes = await fetch('/api/sessions');
          const sessionsList = sessionRes.ok ? await sessionRes.json() : [];

          const getSessionTypeLabel = (session_type) => {
            switch (session_type) {
              case 'HARIAN_MASUK': return 'Presensi Masuk Harian';
              case 'HARIAN_PULANG': return 'Presensi Pulang Harian';
              case 'MAPEL': return 'Mapel KBM';
              case 'KEGIATAN': return 'Kegiatan';
              case 'UJIAN': return 'Ujian';
              case 'EKSKUL': return 'Ekskul';
              default: return 'Sesi Kelas';
            }
          };

          if (attData) {
            attData.forEach(r => {
              if (attendanceIds.includes(r.id)) {
                const session = sessionsList.find(s => s.id === r.session_id);
                const label = getSessionTypeLabel(session?.session_type || r.session?.session_type);
                attendanceMap[r.id] = `${label} (${r.status})`;
              }
            });
          }
        }

        // Fetch activities details
        if (activityIds.length > 0) {
          const { data: actData } = await supabase
            .from('sr_activities')
            .select(`
              id, description,
              rule:rule_id (name)
            `)
            .in('id', activityIds);
          if (actData) {
            actData.forEach(r => {
              activityMap[r.id] = r.rule?.name || r.description;
            });
          }
        }

        // Map ledgers with resolved details
        ledgerData.forEach(item => {
          let desc = 'Perubahan Poin';
          if (item.source_type === 'PRESENSI') {
            desc = attendanceMap[item.source_id] || 'Presensi Sesi Kehadiran';
          } else if (item.source_type === 'AKTIVITAS_POSITIF' || item.source_type === 'AKTIVITAS_NEGATIF') {
            desc = activityMap[item.source_id] || 'Laporan Jurnal Karakter';
          } else if (item.source_type === 'ADJUSTMENT') {
            desc = 'Penyesuaian Poin oleh Administrator';
          }

          resolved.push({
            id: item.id,
            type: item.source_type, // 'PRESENSI', 'AKTIVITAS_POSITIF', 'AKTIVITAS_NEGATIF', 'ADJUSTMENT'
            delta: item.delta_point,
            description: desc,
            date: new Date(item.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })
          });
        });
      }

      setTransactions(resolved);

      // Sum points
      const total = BASE_POINT + ledgerData.reduce((acc, curr) => acc + curr.delta_point, 0);
      setTotalPoints(total);

    } catch (e) {
      console.error("Error fetching report details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchLedgerData();
    }
  }, [user]);

  const getPredicate = (points) => {
    if (points >= 2500) return { label: 'ISTIMEWA', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
    if (points >= 2200) return { label: 'LUAR BIASA', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
    if (points >= 1900) return { label: 'NORMAL', color: '#22c55e', bg: 'rgba(16, 185, 129, 0.15)' };
    if (points >= 1800) return { label: 'PEMBINAAN 1', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.15)' };
    if (points >= 1700) return { label: 'PEMBINAAN 2', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
    if (points >= 1600) return { label: 'PEMBINAAN 3', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    if (points >= 1500) return { label: 'PEMBINAAN 4', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
    return { label: 'INTERVENSI KHUSUS', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  };

  const predikat = getPredicate(totalPoints);

  // Filter transactions based on selection and search
  const filtered = transactions.filter(t => {
    // 1. Filter Type
    if (filterType === 'PRESENSI' && t.type !== 'PRESENSI') return false;
    if (filterType === 'POSITIF' && t.type !== 'AKTIVITAS_POSITIF') return false;
    if (filterType === 'NEGATIF' && t.type !== 'AKTIVITAS_NEGATIF') return false;
    
    // 2. Search query
    if (search.trim()) {
      return t.description.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/siswa" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Rapor Karakter Anda</h2>
      </div>

      {/* Points Summary Panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, py: 20 }}>
        <FileText size={28} color="var(--primary-color)" />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: '500' }}>TOTAL POIN ANDA SAAT INI</span>
        <span style={{ fontSize: 44, fontWeight: '900', color: 'white', lineHeight: 1 }}>{totalPoints}</span>
        <span style={{ 
          fontSize: 12, fontWeight: 'bold', color: predikat.color, background: predikat.bg, 
          padding: '6px 16px', borderRadius: 20, marginTop: 4, letterSpacing: 1
        }}>
          PREDIKAT: {predikat.label}
        </span>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0 0', lineHeight: 1.4 }}>
          Poin awal Anda adalah 2000. Prestasi/kehadiran menambah poin, pelanggaran mengurangi poin.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
        <div className="form-input flex items-center gap-2" style={{ width: '100%' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Cari deskripsi aktivitas..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
          />
        </div>

        {/* Filter categories */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { label: 'Semua', value: 'ALL' },
            { label: 'Presensi', value: 'PRESENSI' },
            { label: 'Positif', value: 'POSITIF' },
            { label: 'Negatif', value: 'NEGATIF' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: '500',
                background: filterType === opt.value ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                color: filterType === opt.value ? 'white' : 'var(--text-muted)',
                whiteSpace: 'nowrap', border: '1px solid var(--surface-border)',
                transition: 'all 0.2s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger History List */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Riwayat Transaksi Poin</h3>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', py: 20 }}>Memuat buku besar...</p>
        ) : filtered.length === 0 ? (
          <div style={{
            border: '1px dashed var(--surface-border)', borderRadius: 16,
            padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            textAlign: 'center', color: 'var(--text-muted)'
          }}>
            <Clock size={32} style={{ opacity: 0.5 }} />
            <p style={{ fontSize: 13, margin: 0 }}>Tidak ada transaksi poin ditemukan.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(t => {
              const isPositive = t.delta >= 0;
              return (
                <div 
                  key={t.id} 
                  className="glass-panel"
                  style={{
                    display: 'flex', alignItems: 'center', justifyBetween: true,
                    padding: '14px 16px', gap: 12, borderRadius: 16
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    color: isPositive ? '#10b981' : '#ef4444'
                  }}>
                    {isPositive ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                  </div>

                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0, lineHeight: 1.4 }}>
                      {t.description}
                    </h4>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                      {t.date}
                    </span>
                  </div>

                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={{
                      fontSize: 15, fontWeight: 'bold',
                      color: isPositive ? '#10b981' : '#ef4444'
                    }}>
                      {isPositive ? `+${t.delta}` : t.delta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
