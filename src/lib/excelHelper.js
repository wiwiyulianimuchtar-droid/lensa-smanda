import * as XLSX from 'xlsx';

/**
 * Ekspor array of JSON menjadi file Excel (.xlsx)
 * @param {Array} data - Array data JSON yang ingin diekspor
 * @param {string} fileName - Nama file output (tanpa extensi)
 * @param {string} sheetName - Nama sheet di dalam Excel
 */
export function exportToExcel(data, fileName = 'laporan', sheetName = 'Data') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Auto-fit column width
    const maxCols = Object.keys(data[0] || {}).length;
    const wscols = [];
    for (let i = 0; i < maxCols; i++) {
      wscols.push({ wch: 18 }); // Lebar default yang aman
    }
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    return true;
  } catch (error) {
    console.error("Gagal melakukan ekspor Excel:", error);
    return false;
  }
}

/**
 * Membaca berkas Excel (.xlsx/.csv) dan mengubahnya menjadi JSON
 * @param {File} file - File dari input HTML
 * @returns {Promise<Array>} - Promise berisi array of JSON
 */
export function readExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(json);
      } catch (error) {
        reject(new Error("Format berkas Excel tidak didukung atau rusak."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

/**
 * Mengunduh template Excel kosong siap isi untuk keperluan import masal
 * @param {string} type - 'siswa' | 'guru' | 'mapel' | 'aturan'
 */
export function downloadTemplateExcel(type) {
  let dummyData = [];
  let fileName = `template_import_${type}`;

  if (type === 'siswa') {
    dummyData = [
      {
        full_name: "Andi Wijaya",
        email: "andiwijaya@smanda.sch.id",
        nisn: "0087654321",
        nis: "232410001",
        gender: "L",
        class_name: "X MIPA 1"
      },
      {
        full_name: "Siti Rahmawati",
        email: "sitirahma@smanda.sch.id",
        nisn: "0087654322",
        nis: "232410002",
        gender: "P",
        class_name: "X MIPA 2"
      }
    ];
  } else if (type === 'guru') {
    dummyData = [
      {
        full_name: "Wiwi Yuliani, S.T.",
        email: "wiwiyuliani@smanda.sch.id",
        nip: "198505122010012003",
        nuptk: "1234567890123456",
        gender: "P",
        birth_date: "1985-05-12",
        employment_status: "PNS",
        phone: "081234567890"
      }
    ];
  } else if (type === 'mapel') {
    dummyData = [
      { code: "IND-X", name: "Bahasa Indonesia", category: "WAJIB" },
      { code: "FIS-X", name: "Fisika Peminatan", category: "PEMINATAN" }
    ];
  } else if (type === 'aturan') {
    dummyData = [
      { code: "AT-01", name: "Terlambat masuk sekolah > 15 menit", type: "NEGATIF", default_point: 5 },
      { code: "PR-01", name: "Membantu kegiatan kebersihan mushola", type: "POSITIF", default_point: 15 }
    ];
  } else if (type === 'kelas') {
    dummyData = [
      { grade_level: "X", name: "X MIPA 1", major: "MIPA", homeroom_teacher: "Wiwi Yuliani, S.T." },
      { grade_level: "XI", name: "XI IPS 1", major: "IPS", homeroom_teacher: "Hanifah Ratih Pratiwi, S.Pd" }
    ];
  } else if (type === 'tugas_tambahan') {
    dummyData = [
      { teacher_name: "Wiwi Yuliani, S.T.", assignment_type: "Guru Wali Kelas", details: "Kelas X MIPA 1" },
      { teacher_name: "Hanifah Ratih Pratiwi, S.Pd", assignment_type: "Guru Piket KBM", details: "Hari Senin" }
    ];
  } else if (type === 'kegiatan') {
    dummyData = [
      { name: "Peringatan Hari Guru", event_date: "2026-11-25", end_date: "2026-11-25" },
      { name: "Porseni Sekolah", event_date: "2026-12-10", end_date: "2026-12-15" }
    ];
  } else if (type === 'ujian') {
    dummyData = [
      { name: "Penilaian Tengah Semester Ganjil", start_date: "2026-09-15", end_date: "2026-09-22" },
      { name: "Penilaian Akhir Tahun", start_date: "2027-06-05", end_date: "2027-06-12" }
    ];
  } else if (type === 'ekskul') {
    dummyData = [
      { name: "Pramuka", category: "Wajib", coach_name: "Hanifah Ratih Pratiwi, S.Pd" },
      { name: "Paskibra", category: "Pilihan", coach_name: "Asep Suryanto, M.Pd." }
    ];
  } else if (type === 'pelanggaran') {
    dummyData = [
      { student_name: "Andi Wijaya", rule_code: "AT-01", description: "Terlambat datang ke sekolah", event_date: "2026-05-30" }
    ];
  } else if (type === 'pengumuman') {
    dummyData = [
      { title: "Libur Semester Ganjil", content: "Diberitahukan bahwa libur semester ganjil dimulai dari tanggal 20 Desember s.d. 2 Januari.", category: "PENGUMUMAN", is_active: "TRUE" }
    ];
  } else if (type === 'aset') {
    dummyData = [
      { name: "Proyektor Epson EB-X06", code: "PRJ-EPS-01", type: "Elektronik", qty: 12, status: "Baik" },
      { name: "Kursi Belajar Chitose", code: "KRS-CH-120", type: "Mebel", qty: 360, status: "Baik" }
    ];
  } else if (type === 'pinjam') {
    dummyData = [
      { room: "Aula SMAN 2", requester: "Wiwi Yuliani, S.T.", date: "2026-06-05", time: "08:00 - 12:00", purpose: "Rapat Koordinasi Guru", status: "PENDING" }
    ];
  } else if (type === 'kerusakan') {
    dummyData = [
      { item: "AC X MIPA 1", reporter: "Wiwi Yuliani, S.T.", date: "2026-05-29", description: "AC tidak dingin", status: "PENDING" }
    ];
  }

  exportToExcel(dummyData, fileName, `Template_${type}`);
}
