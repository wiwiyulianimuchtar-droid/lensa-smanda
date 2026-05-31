"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Archive, MapPin, AlertTriangle, Plus, X, Check, Calendar, Settings, Download, FileSpreadsheet } from 'lucide-react';
import { exportToExcel, readExcel, downloadTemplateExcel } from '@/lib/excelHelper';

export default function SarprasMaster() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('aset'); // 'aset', 'pinjam', 'kerusakan'
  const [saving, setSaving] = useState(false);
  const isReadOnly = profile?.is_kepsek;

  useEffect(() => {
    if (!authLoading) {
      if (!profile || (profile.role !== 'ADMIN' && !profile.is_kepsek && !(profile.role === 'GURU' && profile.is_manajemen && profile.manajemen_role === 'SARPRAS'))) {
        router.replace('/admin');
      }
    }
  }, [profile, authLoading, router]);

  // Simulated Database State
  const [assets, setAssets] = useState([
    { id: 1, name: 'Gedung A - Ruang Kelas 10', code: 'GD-A-R10', type: 'Ruangan', qty: 1, status: 'Baik' },
    { id: 2, name: 'Proyektor Epson EB-X06', code: 'PRJ-EPS-01', type: 'Elektronik', qty: 12, status: 'Baik' },
    { id: 3, name: 'AC Daikin 1.5 PK', code: 'AC-DK-05', type: 'Elektronik', qty: 8, status: 'Butuh Perbaikan' },
    { id: 4, name: 'Kursi Belajar Chitose', code: 'KRS-CH-120', type: 'Mebel', qty: 360, status: 'Baik' },
    { id: 5, name: 'Laboratorium Komputer', code: 'LAB-KOMP', type: 'Ruangan', qty: 2, status: 'Baik' }
  ]);

  const [bookings, setBookings] = useState([
    { id: 1, room: 'Aula SMAN 2', requester: 'Wiwi Yuliani, S.T.', date: '2026-06-05', time: '08:00 - 12:00', purpose: 'Rapat Koordinasi Guru', status: 'PENDING' },
    { id: 2, room: 'Lab Komputer 1', requester: 'Hanifah Ratih Pratiwi, S.Pd', date: '2026-06-07', time: '09:00 - 11:30', purpose: 'Ujian Praktik Kimia-IT', status: 'DISETUJUI' },
    { id: 3, room: 'Lapangan Basket', requester: 'Siswa Organisasi OSIS', date: '2026-06-08', time: '14:00 - 17:00', purpose: 'Latihan Rutin Basket', status: 'PENDING' }
  ]);

  const [damages, setDamages] = useState([
    { id: 1, item: 'Proyektor XI MIPA 2', reporter: 'Mariano Nathanael', date: '2026-05-28', description: 'Lampu proyektor mati total dan berkedip merah', status: 'SEDANG_DIPERBAIKI' },
    { id: 2, item: 'AC X MIPA 1', reporter: 'Wiwi Yuliani, S.T.', date: '2026-05-29', description: 'AC hanya mengeluarkan angin panas dan tidak dingin', status: 'PENDING' },
    { id: 3, item: 'Pintu Toilet Masjid', reporter: 'Siswa Terakhir', date: '2026-05-25', description: 'Engsel pintu bawah copot', status: 'SELESAI' }
  ]);

  const [importProgress, setImportProgress] = useState(null); // { current: 0, total: 0, status: '' }

  const handleExportAssets = () => {
    const exportData = assets.map(a => ({
      'Kode Aset': a.code || '',
      'Nama Barang / Ruang': a.name || '',
      'Kategori': a.type || '',
      'Jumlah': a.qty || 1,
      'Kondisi Fisik': a.status || 'Baik'
    }));
    exportToExcel(exportData, `Daftar_Aset_Sarpras_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportAssets = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Yakin ingin mengimpor ${json.length} data Aset ke dalam inventaris lokal?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Aset...' });

      const newAssets = [];
      let count = 0;
      for (const row of json) {
        const name = row.name || row['Nama Barang / Ruang'] || row['Nama'] || '';
        const code = row.code || row['Kode Aset'] || row['Kode'] || '';
        const type = row.type || row['Kategori'] || 'Elektronik';
        const qty = parseInt(row.qty || row['Jumlah']) || 1;
        const status = row.status || row['Kondisi Fisik'] || 'Baik';

        if (!name || !code) continue;

        newAssets.push({
          id: Date.now() + count,
          name,
          code,
          type,
          qty,
          status
        });
        count++;
      }

      setAssets(prev => [...prev, ...newAssets]);
      setImportProgress(null);
      alert(`Berhasil mengimpor ${count} data Aset.`);
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor aset: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportBookings = () => {
    const exportData = bookings.map(b => ({
      'Ruang/Fasilitas': b.room || '',
      'Pemohon': b.requester || '',
      'Tanggal Pinjam': b.date || '',
      'Waktu / Jam': b.time || '',
      'Tujuan Penggunaan': b.purpose || '',
      'Status': b.status || 'PENDING'
    }));
    exportToExcel(exportData, `Daftar_Peminjaman_Fasilitas_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportBookings = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Yakin ingin mengimpor ${json.length} data peminjaman?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Peminjaman...' });

      const newBookings = [];
      let count = 0;
      for (const row of json) {
        const room = row.room || row['Ruang/Fasilitas'] || '';
        const requester = row.requester || row['Pemohon'] || '';
        const date = row.date || row['Tanggal Pinjam'] || new Date().toISOString().split('T')[0];
        const time = row.time || row['Waktu / Jam'] || '08:00 - 12:00';
        const purpose = row.purpose || row['Tujuan Penggunaan'] || '';
        const status = row.status || row['Status'] || 'PENDING';

        if (!room || !requester) continue;

        newBookings.push({
          id: Date.now() + count,
          room,
          requester,
          date,
          time,
          purpose,
          status: status.toUpperCase()
        });
         count++;
       }

       setBookings(prev => [...prev, ...newBookings]);
       setImportProgress(null);
       alert(`Berhasil mengimpor ${count} data Peminjaman.`);
     } catch (err) {
       setImportProgress(null);
       alert("Gagal impor peminjaman: " + err.message);
     }
     e.target.value = '';
  };

  const handleExportDamages = () => {
    const exportData = damages.map(d => ({
      'Barang/Fasilitas Rusak': d.item || '',
      'Pelapor': d.reporter || '',
      'Tanggal Lapor': d.date || '',
      'Kronologi / Deskripsi': d.description || '',
      'Status Perbaikan': d.status || 'PENDING'
    }));
    exportToExcel(exportData, `Laporan_Kerusakan_Sarpras_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportDamages = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Yakin ingin mengimpor ${json.length} laporan kerusakan?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Laporan Kerusakan...' });

      const newDamages = [];
      let count = 0;
      for (const row of json) {
        const item = row.item || row['Barang/Fasilitas Rusak'] || '';
        const reporter = row.reporter || row['Pelapor'] || '';
        const date = row.date || row['Tanggal Lapor'] || new Date().toISOString().split('T')[0];
        const description = row.description || row['Kronologi / Deskripsi'] || '';
        const status = row.status || row['Status Perbaikan'] || 'PENDING';

        if (!item || !reporter) continue;

        newDamages.push({
          id: Date.now() + count,
          item,
          reporter,
          date,
          description,
          status: status.toUpperCase()
        });
        count++;
      }

      setDamages(prev => [...prev, ...newDamages]);
      setImportProgress(null);
      alert(`Berhasil mengimpor ${count} laporan kerusakan.`);
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor laporan kerusakan: " + err.message);
    }
    e.target.value = '';
  };

  // Form States
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState({ name: '', code: '', type: 'Elektronik', qty: 1, status: 'Baik' });

  const saveAsset = (e) => {
    e.preventDefault();
    setAssets([...assets, { id: Date.now(), ...assetForm }]);
    setAssetForm({ name: '', code: '', type: 'Elektronik', qty: 1, status: 'Baik' });
    setShowAssetModal(false);
    alert("Asset Baru Berhasil Didaftarkan!");
  };

  const deleteAsset = (id) => {
    if (profile.role !== 'ADMIN') {
      alert("Hanya Admin Utama yang berwenang menghapus aset sekolah.");
      return;
    }
    if (!confirm("Hapus aset ini secara permanen dari inventaris?")) return;
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleBookingAction = (id, newStatus) => {
    if (!confirm(`Apakah Anda yakin ingin ${newStatus === 'DISETUJUI' ? 'MENYETUJUI' : 'MENOLAK'} peminjaman ini?`)) return;
    setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
    alert(`Status peminjaman berhasil diperbarui menjadi ${newStatus}!`);
  };

  const handleDamageStatusChange = (id, newStatus) => {
    setDamages(damages.map(d => d.id === id ? { ...d, status: newStatus } : d));
    alert(`Status perbaikan kerusakan berhasil diperbarui!`);
  };

  if (authLoading || !profile) {
    return <div className="text-center text-muted py-20">Memeriksa hak akses...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Manajemen Sarana & Prasarana (Sarpras)</h1>
          <p className="text-muted">Kelola inventaris aset sekolah, permohonan peminjaman ruangan, dan pemeliharaan kerusakan</p>
        </div>
      </div>

      <div className="tabs-container">
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'aset' ? 'active' : ''}`} onClick={() => setActiveTab('aset')}>
          <Archive size={18} /> Aset & Inventaris
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'pinjam' ? 'active' : ''}`} onClick={() => setActiveTab('pinjam')}>
          <Calendar size={18} /> Peminjaman Fasilitas
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'kerusakan' ? 'active' : ''}`} onClick={() => setActiveTab('kerusakan')}>
          <AlertTriangle size={18} /> Laporan Kerusakan
        </button>
      </div>

      <div className="glass-panel">
        {importProgress && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'white', fontWeight: 'bold' }}>
              <span>{importProgress.status}</span>
              <span>{importProgress.current} / {importProgress.total} Data</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(importProgress.current / importProgress.total) * 100}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.2s ease' }} />
            </div>
          </div>
        )}

        {/* ASET TAB */}
        {activeTab === 'aset' && (
          <div>
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
              <h3 style={{fontSize: 16}}>Daftar Inventaris Barang & Gedung Sekolah</h3>
              <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                <input type="file" id="import-aset-file" accept=".xlsx, .xls, .csv" onChange={handleImportAssets} style={{ display: 'none' }} />
                {!isReadOnly && (
                  <>
                    <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('aset')}>
                      <Download size={16} /> Template Impor
                    </button>
                    <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-aset-file').click()}>
                      <FileSpreadsheet size={16} /> Impor Excel
                    </button>
                  </>
                )}
                <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportAssets}>
                  <FileSpreadsheet size={16} /> Ekspor Excel
                </button>
                {!isReadOnly && (
                  <button className="btn-primary flex items-center gap-2" onClick={() => setShowAssetModal(true)}>
                    <Plus size={18} /> Daftarkan Aset Baru
                  </button>
                )}
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode Aset</th>
                    <th>Nama Barang / Ruang</th>
                    <th>Kategori</th>
                    <th>Jumlah</th>
                    <th>Kondisi Fisik</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id}>
                      <td><code style={{color: 'var(--text-muted)'}}>{a.code}</code></td>
                      <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{a.name}</td>
                      <td><span className="badge badge-success">{a.type}</span></td>
                      <td>{a.qty} Unit</td>
                      <td>
                        <span className={`badge ${a.status === 'Baik' ? 'badge-primary' : 'badge-warning'}`}>
                          {a.status}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => deleteAsset(a.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PINJAM TAB */}
        {activeTab === 'pinjam' && (
          <div>
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
              <h3 style={{fontSize: 16}}>Permohonan Peminjaman Ruang & Fasilitas</h3>
              <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                <input type="file" id="import-pinjam-file" accept=".xlsx, .xls, .csv" onChange={handleImportBookings} style={{ display: 'none' }} />
                {!isReadOnly && (
                  <>
                    <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('pinjam')}>
                      <Download size={16} /> Template Impor
                    </button>
                    <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-pinjam-file').click()}>
                      <FileSpreadsheet size={16} /> Impor Excel
                    </button>
                  </>
                )}
                <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportBookings}>
                  <FileSpreadsheet size={16} /> Ekspor Excel
                </button>
              </div>
            </div>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ruang/Fasilitas</th>
                    <th>Pemohon</th>
                    <th>Tanggal Pinjam</th>
                    <th>Waktu / Jam</th>
                    <th>Tujuan Penggunaan</th>
                    <th>Status</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{b.room}</td>
                      <td>{b.requester}</td>
                      <td>{new Date(b.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</td>
                      <td><code>{b.time}</code></td>
                      <td>{b.purpose}</td>
                      <td>
                        <span className={`badge ${
                          b.status === 'DISETUJUI' ? 'badge-success' : 
                          b.status === 'DITOLAK' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          {b.status === 'PENDING' ? (
                            <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
                              <button onClick={() => handleBookingAction(b.id, 'DISETUJUI')} style={{background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none'}}>
                                <Check size={14} /> Setujui
                              </button>
                              <button onClick={() => handleBookingAction(b.id, 'DITOLAK')} style={{background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none'}}>
                                <X size={14} /> Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted italic" style={{fontSize: 12}}>Diproses</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KERUSAKAN TAB */}
        {activeTab === 'kerusakan' && (
          <div>
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
              <h3 style={{fontSize: 16}}>Laporan Kerusakan & Pengajuan Maintenance</h3>
              <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                <input type="file" id="import-kerusakan-file" accept=".xlsx, .xls, .csv" onChange={handleImportDamages} style={{ display: 'none' }} />
                {!isReadOnly && (
                  <>
                    <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('kerusakan')}>
                      <Download size={16} /> Template Impor
                    </button>
                    <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-kerusakan-file').click()}>
                      <FileSpreadsheet size={16} /> Impor Excel
                    </button>
                  </>
                )}
                <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportDamages}>
                  <FileSpreadsheet size={16} /> Ekspor Excel
                </button>
              </div>
            </div>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item/Fasilitas</th>
                    <th>Pelapor</th>
                    <th>Tanggal Lapor</th>
                    <th>Uraian Kerusakan</th>
                    <th>Status Perbaikan</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {damages.map(d => (
                    <tr key={d.id}>
                      <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{d.item}</td>
                      <td>{d.reporter}</td>
                      <td>{new Date(d.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</td>
                      <td style={{maxWidth: 250}}>{d.description}</td>
                      <td>
                        <span className={`badge ${
                          d.status === 'SELESAI' ? 'badge-success' :
                          d.status === 'SEDANG_DIPERBAIKI' ? 'badge-primary' : 'badge-warning'
                        }`}>
                          {d.status === 'SEDANG_DIPERBAIKI' ? 'Sedang Diperbaiki' : d.status === 'SELESAI' ? 'Selesai Diperbaiki' : 'Menunggu Antrian'}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          <select 
                            value={d.status} 
                            onChange={(e) => handleDamageStatusChange(d.id, e.target.value)}
                            style={{
                              background: 'var(--card-inner-bg)', border: '1px solid var(--surface-border)', 
                              color: 'var(--text-light)', padding: '4px 8px', borderRadius: 4, fontSize: 12
                            }}
                          >
                            <option value="PENDING" style={{color: 'black'}}>Menunggu</option>
                            <option value="SEDANG_DIPERBAIKI" style={{color: 'black'}}>Perbaikan</option>
                            <option value="SELESAI" style={{color: 'black'}}>Selesai</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL REGISTRASI ASET */}
      {showAssetModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 450}}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>Daftarkan Aset Baru</h2>
              <button onClick={() => setShowAssetModal(false)} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveAsset}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Aset/Fasilitas</label>
                  <input type="text" className="form-input" required value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} placeholder="Cth: Meja Guru Kayu Jati" />
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Kode Inventaris</label>
                    <input type="text" className="form-input" required value={assetForm.code} onChange={e => setAssetForm({...assetForm, code: e.target.value})} placeholder="Cth: MJ-GUR-10" />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jumlah Unit</label>
                    <input type="number" className="form-input" required value={assetForm.qty} onChange={e => setAssetForm({...assetForm, qty: parseInt(e.target.value) || 1})} min="1" />
                  </div>
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Kategori Aset</label>
                    <select className="form-input" value={assetForm.type} onChange={e => setAssetForm({...assetForm, type: e.target.value})}>
                      <option value="Ruangan">Gedung / Ruangan</option>
                      <option value="Elektronik">Elektronik & Kelistrikan</option>
                      <option value="Mebel">Furnitur / Mebel</option>
                      <option value="Olahraga">Alat Olahraga</option>
                      <option value="Pustaka">Bahan Pustaka</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Kondisi Awal</label>
                    <select className="form-input" value={assetForm.status} onChange={e => setAssetForm({...assetForm, status: e.target.value})}>
                      <option value="Baik">Baik & Berfungsi</option>
                      <option value="Butuh Perbaikan">Butuh Perbaikan</option>
                      <option value="Rusak">Rusak Berat</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAssetModal(false)}>Batal</button>
                <button type="submit" className="btn-primary">Daftarkan Aset</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
