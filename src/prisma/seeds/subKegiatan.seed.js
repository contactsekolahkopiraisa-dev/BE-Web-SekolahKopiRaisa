export default async function seedSubKegiatan(prisma) {
  console.log('Seeding SubKegiatan...')

  const kegiatanList = await prisma.kegiatan.findMany()
  const getId = (nama) => kegiatanList.find(k => k.nama_kegiatan === nama)?.id

  const data = [
    // 1. Pengenalan Tanaman Kopi
    { id_kegiatan: getId('Pengenalan Tanaman Kopi'), nama_sub_kegiatan: 'Pengenalan Tanaman Kopi', deskripsi: 'Mengenal jenis dan morfologi kopi' },

    // 2. Persiapan Lahan
    { id_kegiatan: getId('Persiapan Lahan'), nama_sub_kegiatan: 'Pembersihan Areal', deskripsi: 'Membersihkan gulma dan semak di lahan' },
    { id_kegiatan: getId('Persiapan Lahan'), nama_sub_kegiatan: 'Pengolahan Tanah', deskripsi: 'Mencangkul dan menggemburkan tanah tanam' },
    { id_kegiatan: getId('Persiapan Lahan'), nama_sub_kegiatan: 'Pohon Pelindung', deskripsi: 'Menanam atau merawat pohon pelindung' },
    { id_kegiatan: getId('Persiapan Lahan'), nama_sub_kegiatan: 'Jarak Tanam', deskripsi: 'Menentukan jarak antar lubang tanam' },
    { id_kegiatan: getId('Persiapan Lahan'), nama_sub_kegiatan: 'Lubang Tanam', deskripsi: 'Membuat lubang sesuai ukuran standar' },
    { id_kegiatan: getId('Persiapan Lahan'), nama_sub_kegiatan: 'Tanaman Belum Menghasilkan (TBM)', deskripsi: 'Menyiapkan area untuk TBM' },
    { id_kegiatan: getId('Persiapan Lahan'), nama_sub_kegiatan: 'Tanaman Menghasilkan (TM)', deskripsi: 'Menyiapkan area untuk TM' },

    // 3. Pembibitan
    { id_kegiatan: getId('Pembibitan'), nama_sub_kegiatan: 'Perbanyakan Vegetatif', deskripsi: 'Melakukan stek atau cangkok bibit' },
    { id_kegiatan: getId('Pembibitan'), nama_sub_kegiatan: 'Perbanyakan Generatif', deskripsi: 'Menyemaikan benih dari biji kopi' },

    // 4. Penanaman
    { id_kegiatan: getId('Penanaman'), nama_sub_kegiatan: 'Kriteria Bibit Siap Tanam', deskripsi: 'Menyeleksi bibit sehat dan siap tanam' },
    { id_kegiatan: getId('Penanaman'), nama_sub_kegiatan: 'Waktu Penanaman', deskripsi: 'Menentukan waktu terbaik untuk tanam' },
    { id_kegiatan: getId('Penanaman'), nama_sub_kegiatan: 'Metode Penanaman', deskripsi: 'Melakukan penanaman sesuai metode standar' },

    // 5. Pemeliharaan
    { id_kegiatan: getId('Pemeliharaan'), nama_sub_kegiatan: 'Penyiraman', deskripsi: 'Melakukan penyiraman rutin pada tanaman' },
    { id_kegiatan: getId('Pemeliharaan'), nama_sub_kegiatan: 'Pemupukan', deskripsi: 'Memberikan pupuk sesuai dosis dan waktu' },
    { id_kegiatan: getId('Pemeliharaan'), nama_sub_kegiatan: 'Pengendalian Hama dan Gulma', deskripsi: 'Mengendalikan gulma dan hama tanaman' },
    { id_kegiatan: getId('Pemeliharaan'), nama_sub_kegiatan: 'Pemangkasan Kopi', deskripsi: 'Melakukan pemangkasan cabang tidak produktif' },

    // 6. Panen
    { id_kegiatan: getId('Panen'), nama_sub_kegiatan: 'Penentuan Lokasi', deskripsi: 'Menentukan lokasi pohon siap panen' },
    { id_kegiatan: getId('Panen'), nama_sub_kegiatan: 'Persiapan Lapangan', deskripsi: 'Menyiapkan alat dan area panen' },
    { id_kegiatan: getId('Panen'), nama_sub_kegiatan: 'Persiapan Sarana', deskripsi: 'Menyiapkan wadah dan transportasi hasil panen' },
    { id_kegiatan: getId('Panen'), nama_sub_kegiatan: 'Kriteria Buah Siap Panen', deskripsi: 'Menentukan buah kopi matang sempurna' },
    { id_kegiatan: getId('Panen'), nama_sub_kegiatan: 'Metode Pemanenan', deskripsi: 'Melakukan panen dengan cara selektif' },
    { id_kegiatan: getId('Panen'), nama_sub_kegiatan: 'Manajemen Panen', deskripsi: 'Mengatur jadwal dan tenaga panen' },
    { id_kegiatan: getId('Panen'), nama_sub_kegiatan: 'Transportasi Hasil Panen', deskripsi: 'Mengangkut hasil panen ke tempat olah' },

    // 7. Pasca Panen
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Sortasi Setelah Panen', deskripsi: 'Menyortir buah kopi berdasarkan kualitas' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Pulping (Pemecahan Buah)', deskripsi: 'Memisahkan kulit dari biji kopi' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Fermentasi', deskripsi: 'Melakukan fermentasi untuk menghilangkan lendir' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Perendaman dan Pencucian', deskripsi: 'Membersihkan biji dari sisa lendir' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Pengeringan dan Tempering', deskripsi: 'Mengeringkan biji hingga kadar air ideal' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Hulling', deskripsi: 'Mengupas kulit ari dari biji kopi' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Sortasi Kopi Green Bean', deskripsi: 'Menyeleksi biji kopi kering berkualitas' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Roasting', deskripsi: 'Menyangrai biji kopi sesuai tingkat kematangan' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Grinding', deskripsi: 'Menggiling biji kopi menjadi bubuk' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Pengemasan dan Penyimpanan', deskripsi: 'Mengemas kopi bubuk agar tahan lama' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Brewing (Penyeduhan)', deskripsi: 'Menyeduh kopi untuk uji rasa' },
    { id_kegiatan: getId('Pasca Panen'), nama_sub_kegiatan: 'Pemasaran', deskripsi: 'Mempublikasikan dan menjual hasil produk' },
  ]

  const validData = data.filter(d => d.id_kegiatan)

  for (const d of validData) {
    const exists = await prisma.subKegiatan.findFirst({
      where: {
        id_kegiatan: d.id_kegiatan,
        nama_sub_kegiatan: d.nama_sub_kegiatan,
      },
    })

    if (!exists) {
      await prisma.subKegiatan.create({ data: d })
      console.log(`✅ SubKegiatan "${d.nama_sub_kegiatan}" ditambahkan untuk kegiatan ID ${d.id_kegiatan}`)
    } else {
      console.log(`⏭️ SubKegiatan "${d.nama_sub_kegiatan}" sudah ada, dilewati`)
    }
  }

  console.log('Selesai seeding SubKegiatan.')
}