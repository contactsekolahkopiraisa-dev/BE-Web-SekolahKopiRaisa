export default async function seedStatusKode(prisma) {
  console.log('Seeding StatusKode...')
  await prisma.statusKode.createMany({
    data: [
      { nama_status_kode: 'Menunggu Persetujuan' },
      { nama_status_kode: 'Belum Tersedia' },
      { nama_status_kode: 'Belum Terlaksana' },
      { nama_status_kode: 'Sedang Berjalan' },
      { nama_status_kode: 'Disetujui' },
      { nama_status_kode: 'Ditolak' },
      { nama_status_kode: 'Selesai' },
    ],
    skipDuplicates: true,
  })
}
