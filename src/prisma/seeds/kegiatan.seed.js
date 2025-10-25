export default async function seedKegiatan(prisma) {
  console.log('Seeding Kegiatan...')
  await prisma.kegiatan.createMany({
    data: [
      { nama_kegiatan: 'Pengenalan Tanaman Kopi', deskripsi: 'Mengenal berbagai jenis tanaman kopi' },
      { nama_kegiatan: 'Persiapan Lahan', deskripsi: 'Menyiapkan lahan untuk penanaman' },
      { nama_kegiatan: 'Pembibitan', deskripsi: 'Proses penyiapan bibit tanaman' },
      { nama_kegiatan: 'Penanaman', deskripsi: 'Proses penanaman bibit kopi' },
      { nama_kegiatan: 'Pemeliharaan', deskripsi: 'Proses pemeliharaan tanaman kopi' },
      { nama_kegiatan: 'Panen', deskripsi: 'Proses pemanenan biji kopi' },
      { nama_kegiatan: 'Pasca Panen', deskripsi: 'Proses pasca pemanenan biji kopi' },
    ],
    skipDuplicates: true,
  })
}
