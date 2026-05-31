/**
 * Kompresi berkas gambar menggunakan HTML5 Canvas
 * @param {File} file - Berkas gambar asli dari input file
 * @param {number} maxWidth - Resolusi lebar maksimum (default: 800px)
 * @param {number} quality - Kualitas gambar output JPEG (default: 0.7)
 * @returns {Promise<File>} - Promise yang me-resolve berkas File yang sudah dikompresi
 */
export function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    // Jika bukan file gambar, langsung return file asli
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize proporsional jika lebar melebihi batas
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            // Konversi blob kembali menjadi objek File
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
