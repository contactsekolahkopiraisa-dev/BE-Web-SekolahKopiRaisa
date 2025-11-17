export default async function seedKegiatan(prisma) {
  console.log('Seeding Kegiatan...')
  await prisma.kegiatan.createMany({
    data: [
      { nama_kegiatan: 'Pengenalan Tanaman Kopi', deskripsi: 'Mengenal jenis dan karakter kopi' },
      { nama_kegiatan: 'Persiapan Lahan', deskripsi: 'Menyiapkan lahan tanam kopi' },
      { nama_kegiatan: 'Pembibitan', deskripsi: 'Membuat dan merawat bibit kopi' },
      { nama_kegiatan: 'Penanaman', deskripsi: 'Menanam bibit sesuai kriteria' },
      { nama_kegiatan: 'Pemeliharaan', deskripsi: 'Merawat dan mengendalikan hama tanaman' },
      { nama_kegiatan: 'Panen', deskripsi: 'Memanen buah kopi matang' },
      { nama_kegiatan: 'Pasca Panen', deskripsi: 'Mengolah hasil panen menjadi biji/produk siap jadi' },
    ],
    skipDuplicates: true,
  })
}
