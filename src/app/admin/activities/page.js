"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Image as ImageIcon } from 'lucide-react';

export default function ApprovalAktivitas() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    // Join sr_activities with sr_profiles and sr_point_rules
    const { data, error } = await supabase
      .from('sr_activities')
      .select(`
        id,
        description,
        event_date,
        attachment_url,
        status,
        type,
        student_id,
        point_override,
        sr_profiles:student_id (full_name, class_name),
        sr_point_rules:rule_id (name, default_point)
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActivities(data);
    }
    setLoading(false);
  };

  const handleAction = async (id, action) => {
    if(!confirm(`Yakin ingin ${action === 'APPROVED' ? 'MENGESAHKAN' : 'MENOLAK'} aktivitas ini?`)) return;

    // 1. Update status di sr_activities
    const { error } = await supabase
      .from('sr_activities')
      .update({ status: action })
      .eq('id', id);

    if (error) {
      alert('Gagal update status: ' + error.message);
      return;
    }

    // 2. Jika APPROVED, insert ke sr_point_ledgers
    if (action === 'APPROVED') {
      const act = activities.find(a => a.id === id);
      if (act) {
        const points = act.point_override || act.sr_point_rules?.default_point || 0;
        const { error: ledgerError } = await supabase
          .from('sr_point_ledgers')
          .insert([{
            student_id: act.student_id,
            source_type: 'AKTIVITAS_POSITIF',
            source_id: id,
            delta_point: points
          }]);
          
        if (ledgerError) {
          console.error('Gagal menulis ke ledger:', ledgerError);
        }
      }
    }

    alert(`Aktivitas berhasil di ${action}`);
    fetchActivities();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Persetujuan Aktivitas</h1>
          <p className="text-muted">Menunggu validasi dari Guru/Admin</p>
        </div>
      </div>

      <div className="glass-panel">
        {loading ? (
          <p className="text-center text-muted">Memuat data aktivitas...</p>
        ) : activities.length === 0 ? (
          <div className="text-center" style={{padding: '40px 0'}}>
            <Check size={48} color="var(--secondary-color)" style={{margin: '0 auto 16px'}} />
            <h3 style={{color: 'white'}}>Semua Bersih!</h3>
            <p className="text-muted">Tidak ada pengajuan aktivitas yang menunggu persetujuan saat ini.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu Pelaksanaan</th>
                  <th>Siswa</th>
                  <th>Kategori</th>
                  <th>Keterangan</th>
                  <th>Bukti</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((act) => (
                  <tr key={act.id}>
                    <td>{new Date(act.event_date).toLocaleString('id-ID', {day: 'numeric', month:'short', hour: '2-digit', minute:'2-digit'})}</td>
                    <td>
                      <div style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{act.sr_profiles?.full_name}</div>
                      <div className="text-muted" style={{fontSize: 12}}>{act.sr_profiles?.class_name}</div>
                    </td>
                    <td>
                      <span className={`badge ${act.type === 'POSITIF' ? 'badge-primary' : 'badge-danger'}`}>
                        {act.sr_point_rules?.name || act.type}
                      </span>
                    </td>
                    <td style={{maxWidth: 200}}>{act.description}</td>
                    <td>
                      {act.attachment_url ? (
                        <a href={act.attachment_url} target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: 4}}>
                          <ImageIcon size={16} /> Lihat
                        </a>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: 8}}>
                        <button onClick={() => handleAction(act.id, 'APPROVED')} style={{background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4}}>
                          <Check size={16} /> Setujui
                        </button>
                        <button onClick={() => handleAction(act.id, 'REJECTED')} style={{background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4}}>
                          <X size={16} /> Tolak
                        </button>
                      </div>
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
