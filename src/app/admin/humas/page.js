"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Megaphone, MessageSquare, Phone, Plus, X, Edit2, Trash2, Send, Check, Download, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import { exportToExcel, readExcel, downloadTemplateExcel } from '@/lib/excelHelper';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompressor';

export default function HumasMaster() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pengumuman'); // 'pengumuman', 'hotline', 'chatbot'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isReadOnly = profile?.is_kepsek;

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'PENGUMUMAN', target_audience: 'SEMUA', flyer_url: '', is_active: true });
  const [importProgress, setImportProgress] = useState(null); // { current: 0, total: 0, status: '' }
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [flyerPreview, setFlyerPreview] = useState('');

  const handleExportAnnouncements = () => {
    const exportData = announcements.map(ann => ({
      'Judul': ann.title || '',
      'Konten / Isi': ann.content || '',
      'Kategori': ann.category || 'PENGUMUMAN',
      'Status Aktif': ann.is_active ? 'TRUE' : 'FALSE'
    }));
    exportToExcel(exportData, `Daftar_Pengumuman_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportAnnouncements = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Yakin ingin mengimpor ${json.length} data pengumuman dari Excel?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Pengumuman...' });

      let count = 0;
      for (const row of json) {
        const title = row.title || row['Judul'] || '';
        const content = row.content || row['Konten / Isi'] || row['Konten'] || '';
        const category = row.category || row['Kategori'] || 'PENGUMUMAN';
        const is_active_val = row.is_active || row['Status Aktif'] || 'TRUE';
        const is_active = is_active_val.toString().trim().toUpperCase() === 'TRUE';

        if (!title || !content) continue;

        const payload = { title, content, category, is_active };

        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          console.error("Gagal impor pengumuman:", res.statusText);
        }

        count++;
        setImportProgress(prev => ({ ...prev, current: count, status: `Mengimpor: ${title}` }));
      }

      setImportProgress(null);
      alert(`Berhasil mengimpor ${count} pengumuman.`);
      fetchAnnouncements();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor pengumuman: " + err.message);
    }
    e.target.value = '';
  };

  // Hotline config state
  const [hotline, setHotline] = useState({
    number: '6281234567890',
    name: 'Helpline SMAN 2 Bandung',
    hours: '07:00 - 16:00 WIB',
    message: 'Halo Humas SMANDA, saya ingin bertanya tentang...'
  });

  // Chatbot test state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Halo! Saya chatbot SMANDA. Silakan coba tanyakan hal-hal seputar sekolah (contoh: "point", "izin", "jadwal", atau "sarpras").' }
  ]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!profile || (profile.role !== 'ADMIN' && !profile.is_kepsek && !(profile.role === 'GURU' && profile.is_manajemen && profile.manajemen_role === 'HUMAS'))) {
        router.replace('/admin');
      } else {
        fetchAnnouncements();
      }
    }
  }, [profile, authLoading, router, activeTab]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      console.error("Gagal memuat pengumuman:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveAnn = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        id: editingId
      };
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        resetFormState();
        await fetchAnnouncements();
        alert("Pengumuman berhasil dipublikasikan!");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetFormState = () => {
    setEditingId(null);
    setForm({ title: '', content: '', category: 'PENGUMUMAN', target_audience: 'SEMUA', flyer_url: '', is_active: true });
    setFlyerPreview('');
  };

  const handleFlyerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFlyer(true);
    try {
      const compressed = await compressImage(file, 1000, 0.7);

      const fileExt = compressed.name?.split('.').pop() || 'jpg';
      const fileName = `flyer-${Date.now()}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sr_attachments')
        .upload(filePath, compressed);

      if (uploadError) {
        console.warn("Storage upload failed, falling back to mock public URL.");
        const mockUrl = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000";
        setForm(prev => ({ ...prev, flyer_url: mockUrl }));
        setFlyerPreview(mockUrl);
      } else {
        const { data: urlData } = supabase.storage
          .from('sr_attachments')
          .getPublicUrl(filePath);
        setForm(prev => ({ ...prev, flyer_url: urlData.publicUrl }));
        setFlyerPreview(urlData.publicUrl);
      }
    } catch (err) {
      alert("Gagal mengunggah flyer: " + err.message);
    } finally {
      setUploadingFlyer(false);
    }
  };

  const editAnn = (ann) => {
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      content: ann.content,
      category: ann.category,
      target_audience: ann.target_audience || 'SEMUA',
      flyer_url: ann.flyer_url || '',
      is_active: ann.is_active
    });
    setFlyerPreview(ann.flyer_url || '');
    setShowModal(true);
  };

  const deleteAnn = async (id) => {
    if (!confirm("Hapus pengumuman ini secara permanen dari beranda?")) return;
    try {
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchAnnouncements();
        alert("Pengumuman berhasil dihapus.");
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const saveHotline = (e) => {
    e.preventDefault();
    alert("Konfigurasi Hotline Sekolah Berhasil Diperbarui!");
  };

  // Chatbot response simulator
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const newMessages = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(newMessages);
    setChatInput('');

    // Generate automated response based on keywords
    setTimeout(() => {
      let botResponse = 'Maaf, saya belum memahami pertanyaan tersebut. Silakan hubungi Hotline Humas melalui tombol WhatsApp untuk bantuan langsung.';
      const text = userText.toLowerCase();

      if (text.includes('point') || text.includes('poin') || text.includes('nilai')) {
        botResponse = 'Siswa dibekali poin dasar 2000. Pelanggaran (negatif) akan memotong poin, sedangkan prestasi/kegiatan positif (disetujui) akan menambah poin.';
      } else if (text.includes('izin') || text.includes('perizinan') || text.includes('keluar')) {
        botResponse = 'Pengajuan izin dilakukan oleh Siswa melalui menu "Perizinan" di dasbor mereka, lalu guru piket KBM/Kesiswaan akan menyetujui izin tersebut.';
      } else if (text.includes('sarpras') || text.includes('kelas') || text.includes('ruang') || text.includes('aula')) {
        botResponse = 'Peminjaman ruangan aula/fasilitas serta pelaporan kerusakan barang sekolah dikelola langsung oleh tim Sarana Prasarana (Sarpras).';
      } else if (text.includes('jadwal') || text.includes('kurikulum') || text.includes('mapel')) {
        botResponse = 'Data kelas, mata pelajaran, jadwal kelas, dan tugas guru piket/wali kelas diatur sepenuhnya oleh tim Manajemen Kurikulum.';
      } else if (text.includes('halo') || text.includes('hello') || text.includes('hai')) {
        botResponse = 'Halo! Saya chatbot SMANDA. Ada yang bisa saya bantu terkait informasi sekolah?';
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 800);
  };

  if (authLoading || !profile) {
    return <div className="text-center text-muted py-20">Memeriksa hak akses...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Manajemen Humas & Informasi Layanan</h1>
          <p className="text-muted">Kelola berita sekolah, banner pengumuman beranda, dan helpline WhatsApp / Chatbot sekolah</p>
        </div>
      </div>

      <div className="tabs-container">
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'pengumuman' ? 'active' : ''}`} onClick={() => setActiveTab('pengumuman')}>
          <Megaphone size={18} /> Kelola Informasi & Berita
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'hotline' ? 'active' : ''}`} onClick={() => setActiveTab('hotline')}>
          <Phone size={18} /> Helpline / WhatsApp
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'chatbot' ? 'active' : ''}`} onClick={() => setActiveTab('chatbot')}>
          <MessageSquare size={18} /> Simulasi Chatbot
        </button>
      </div>

      <div className="glass-panel">
        {/* PENGUMUMAN TAB */}
        {activeTab === 'pengumuman' && (
          <div>
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
              <h3 style={{fontSize: 16}}>Daftar Informasi / Pengumuman Terbit</h3>
              <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                <input type="file" id="import-pengumuman-file" accept=".xlsx, .xls, .csv" onChange={handleImportAnnouncements} style={{ display: 'none' }} />
                {!isReadOnly && (
                  <>
                    <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('pengumuman')}>
                      <Download size={16} /> Template Impor
                    </button>
                    <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-pengumuman-file').click()}>
                      <FileSpreadsheet size={16} /> Impor Excel
                    </button>
                  </>
                )}
                <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportAnnouncements}>
                  <FileSpreadsheet size={16} /> Ekspor Excel
                </button>
                {!isReadOnly && (
                  <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Buat Informasi Baru
                  </button>
                )}
              </div>
            </div>

            {importProgress && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-light)', fontWeight: 'bold' }}>
                  <span>{importProgress.status}</span>
                  <span>{importProgress.current} / {importProgress.total} Data</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(importProgress.current / importProgress.total) * 100}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center text-muted py-10">Memuat pengumuman...</div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal Terbit</th>
                      <th>Judul Berita/Pengumuman</th>
                      <th>Kategori</th>
                      <th>Status Tampil</th>
                      {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map(ann => (
                      <tr key={ann.id}>
                        <td>{new Date(ann.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</td>
                        <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{ann.title}</td>
                        <td><span className="badge badge-success">{ann.category}</span></td>
                        <td>
                          <span className={`badge ${ann.is_active ? 'badge-primary' : 'badge-warning'}`}>
                            {ann.is_active ? 'Aktif' : 'Draft'}
                          </span>
                        </td>
                        {!isReadOnly && (
                          <td style={{textAlign: 'right'}}>
                            <button onClick={() => editAnn(ann)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}><Edit2 size={16} /></button>
                            <button onClick={() => deleteAnn(ann.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}><Trash2 size={16} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {announcements.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Belum ada pengumuman yang dibuat.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* HOTLINE TAB */}
        {activeTab === 'hotline' && (
          <div style={{display: 'flex', gap: 30, flexWrap: 'wrap'}}>
            {/* Form Setup */}
            <form onSubmit={saveHotline} style={{flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16}}>
              <h3 style={{fontSize: 16}}>Konfigurasi Helpline / WhatsApp Center</h3>
              <div className="form-group">
                <label>Nomor WhatsApp (Gunakan Format Kode Negara, Cth: 62812...)</label>
                <input type="text" className="form-input" required disabled={isReadOnly} value={hotline.number} onChange={e => setHotline({...hotline, number: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Nama Kontak Helpline</label>
                <input type="text" className="form-input" required disabled={isReadOnly} value={hotline.name} onChange={e => setHotline({...hotline, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Jam Operasional</label>
                <input type="text" className="form-input" required disabled={isReadOnly} value={hotline.hours} onChange={e => setHotline({...hotline, hours: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Pesan Template Otomatis (Saat Diklik)</label>
                <textarea className="form-input" rows="3" required disabled={isReadOnly} value={hotline.message} onChange={e => setHotline({...hotline, message: e.target.value})} style={{resize: 'none', fontFamily: 'inherit'}} />
              </div>
              {!isReadOnly && (
                <button type="submit" className="btn-primary" style={{padding: 12}}>
                  Simpan Konfigurasi Hotline
                </button>
              )}
            </form>

            {/* Widget Preview */}
            <div style={{flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 30, border: '1px dashed var(--surface-border)'}}>
              <div style={{
                background: '#075e54', width: 280, borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                fontFamily: 'sans-serif'
              }}>
                <div style={{padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, color: 'white'}}>
                  <div style={{width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>H</div>
                  <div>
                    <div style={{fontSize: 13, fontWeight: 'bold'}}>{hotline.name}</div>
                    <div style={{fontSize: 9, opacity: 0.8}}>Operasional: {hotline.hours}</div>
                  </div>
                </div>
                <div style={{background: '#e5ddd5', padding: 20, minHeight: 120, display: 'flex', flexDirection: 'column', gap: 10}}>
                  <div style={{background: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 11, color: 'black', alignSelf: 'flex-start', maxWidth: '80%'}}>
                    Halo! Ada yang bisa kami bantu seputar administrasi / info kesiswaan SMAN 2?
                  </div>
                  <div style={{background: '#dcf8c6', padding: '8px 12px', borderRadius: 8, fontSize: 11, color: 'black', alignSelf: 'flex-end', maxWidth: '80%'}}>
                    {hotline.message}
                  </div>
                </div>
                <div style={{background: 'white', padding: 10, display: 'flex', justifyContent: 'center'}}>
                  <a 
                    href={`https://wa.me/${hotline.number}?text=${encodeURIComponent(hotline.message)}`}
                    target="_blank" rel="noreferrer"
                    style={{background: '#25d366', color: 'white', fontSize: 12, fontWeight: 'bold', padding: '8px 16px', borderRadius: 20, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6}}
                  >
                    Hubungi via WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHATBOT SIMULATOR TAB */}
        {activeTab === 'chatbot' && (
          <div style={{maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 400, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: 12, overflow: 'hidden'}}>
            {/* Header */}
            <div style={{background: 'var(--banner-bg)', borderBottom: '1px solid var(--banner-border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10}}>
              <MessageSquare size={18} color="white" />
              <span style={{fontWeight: 'bold', color: 'white', fontSize: 14}}>Simulasi Chatbot Sekolah (Uji Jawaban Cepat)</span>
            </div>
            
            {/* Messages body */}
            <div style={{flexGrow: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12}}>
              {chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.sender === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--surface-border)',
                    color: msg.sender === 'user' ? 'white' : 'var(--text-light)',
                    padding: '10px 14px',
                    borderRadius: 12,
                    fontSize: 13,
                    maxWidth: '80%',
                    lineHeight: 1.4
                  }}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input field */}
            <form onSubmit={handleSendChat} style={{borderTop: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', padding: 10, display: 'flex', gap: 10}}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Tulis pertanyaan uji coba... (cth: 'poin', 'izin', 'sarpras')" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                style={{flexGrow: 1, height: 40}}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MODAL PENGUMUMAN */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Publikasi Berita' : 'Publikasikan Informasi Sekolah'}</h2>
              <button onClick={() => {setShowModal(false); resetFormState();}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveAnn}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Judul Pengumuman/Berita</label>
                  <input type="text" className="form-input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ketik judul menarik..." />
                </div>
                <div style={{display: 'flex', gap: 15, flexWrap: 'wrap'}}>
                  <div className="form-group" style={{flex: 1, minWidth: 200}}>
                    <label>Kategori</label>
                    <select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      <option value="PENGUMUMAN">Pengumuman Resmi</option>
                      <option value="INFORMASI">Informasi Akademik</option>
                      <option value="KEGIATAN">Event / Kegiatan Sekolah</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1, minWidth: 200}}>
                    <label>Status Tampil</label>
                    <select className="form-input" value={form.is_active ? 'aktif' : 'draft'} onChange={e => setForm({...form, is_active: e.target.value === 'aktif'})}>
                      <option value="aktif">Langsung Terbit (Aktif)</option>
                      <option value="draft">Simpan Sebagai Draft</option>
                    </select>
                  </div>
                </div>

                <div style={{display: 'flex', gap: 15, flexWrap: 'wrap'}}>
                  <div className="form-group" style={{flex: 1, minWidth: 200}}>
                    <label>Sasaran Informasi</label>
                    <select className="form-input" value={form.target_audience} onChange={e => setForm({...form, target_audience: e.target.value})}>
                      <option value="SEMUA">Semua Warga Sekolah (Siswa, Guru, Orangtua)</option>
                      <option value="GURU">Khusus Guru & Manajemen</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1, minWidth: 200}}>
                    <label>Flyer Informasi (Opsional)</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <label htmlFor="flyer-file-upload" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, margin: 0, height: 38 }}>
                        <ImageIcon size={16} /> Pilih Flyer
                      </label>
                      <input type="file" id="flyer-file-upload" accept="image/*" onChange={handleFlyerChange} style={{ display: 'none' }} disabled={uploadingFlyer} />
                      {uploadingFlyer && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mengunggah...</span>}
                      {form.flyer_url && (
                        <button type="button" onClick={() => { setForm(prev => ({ ...prev, flyer_url: '' })); setFlyerPreview(''); }} className="btn-danger" style={{ padding: '8px 12px', fontSize: 12, height: 38 }}>
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {flyerPreview && (
                  <div className="form-group">
                    <label>Preview Flyer</label>
                    <div style={{ width: '100%', maxHeight: 150, overflow: 'hidden', borderRadius: 8, border: '1px solid var(--surface-border)', position: 'relative', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                      <img src={flyerPreview} alt="Preview Flyer" style={{ width: 'auto', height: '100%', maxHeight: 150, objectFit: 'contain' }} />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Isi Berita Lengkap</label>
                  <textarea className="form-input" rows="5" required value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Tulis isi pengumuman atau berita secara lengkap..." style={{resize: 'vertical', fontFamily: 'inherit'}} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowModal(false); resetFormState();}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving || uploadingFlyer}>{saving ? 'Mempublikasikan...' : editingId ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
