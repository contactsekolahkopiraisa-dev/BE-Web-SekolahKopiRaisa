export default async function seedJenisLayanan(prisma) {
  console.log('Seeding JenisLayanan...')

  // Pastikan TargetPeserta sudah ada
  const targetMahasiswa = await prisma.targetPeserta.findFirst({
    where: { nama_target: 'Siswa/Mahasiswa' },
  })
  const targetUmum = await prisma.targetPeserta.findFirst({
    where: { nama_target: 'Umum' },
  })

  if (!targetMahasiswa) {
    console.warn('WARNING TargetPeserta belum ada, skip JenisLayanan')
    return
  }

  await prisma.jenisLayanan.createMany({
    data: [
      {
        nama_jenis_layanan: 'Praktek Kerja Lapangan (PKL)',
        deskripsi_singkat: 'PKL bagi siswa dan mahasiswa di industri kopi',
        deskripsi_lengkap:
          'Program PKL di Sekolah Kopi RAISA memberikan kesempatan bagi siswa dan mahasiswa untuk belajar langsung di lingkungan industri kopi. Peserta akan memahami tahapan budidaya kopi, panen, pasca panen, roasting, hingga penyajian (barista). Kegiatan ini dilaksanakan secara terstruktur dengan pendampingan mentor profesional dari RAISA.',
        estimasi_waktu: '2 – 4 Bulan',
        id_target_peserta: targetMahasiswa.id,
      },
      {
        nama_jenis_layanan: 'Magang',
        deskripsi_singkat: 'Magang profesional di bidang kopi',
        deskripsi_lengkap:
          'Magang di Sekolah Kopi RAISA dirancang untuk mahasiswa dan lulusan perguruan tinggi yang ingin memperdalam keterampilan dan pengalaman kerja di bidang kopi. Peserta akan terlibat dalam kegiatan operasional seperti pengelolaan kebun kopi, pengolahan biji, quality control, serta manajemen bisnis kopi. Program ini cocok untuk mereka yang berorientasi pada karier di sektor pertanian dan industri kopi.',
        estimasi_waktu: '2 – 4 Bulan',
        id_target_peserta: targetMahasiswa.id,
      },
      {
        nama_jenis_layanan: 'Pelatihan Kopi',
        deskripsi_singkat: 'Pelatihan dasar kopi untuk masyarakat umum',
        deskripsi_lengkap:
          'Program Pelatihan Kopi di Sekolah Kopi RAISA terbuka bagi siapa saja yang tertarik mempelajari dunia kopi. Materi pelatihan meliputi pengenalan kopi nusantara, teknik penyeduhan manual brew, dasar-dasar roasting, serta aspek bisnis kedai kopi. Pelatihan ini difasilitasi oleh trainer bersertifikat dan dilaksanakan secara intensif di ruang praktik RAISA Coffee Lab.',
        estimasi_waktu: '1 – 2 Hari',
        id_target_peserta: targetUmum.id,
      },
      {
        nama_jenis_layanan: 'Undangan Narasumber',
        deskripsi_singkat: 'Layanan narasumber untuk kegiatan anda',
        deskripsi_lengkap:
          'Sekolah Kopi RAISA menyediakan layanan narasumber untuk kegiatan eksternal seperti seminar, workshop, atau pelatihan yang diselenggarakan oleh instansi pendidikan, pemerintah, maupun komunitas. Narasumber yang dihadirkan merupakan praktisi berpengalaman dalam bidang budidaya, pasca panen, dan pengembangan usaha kopi. Materi dapat disesuaikan dengan kebutuhan penyelenggara.',
        estimasi_waktu: '1 Hari',
        id_target_peserta: targetUmum.id,
      },
      {
        nama_jenis_layanan: 'Kunjungan Edukatif',
        deskripsi_singkat: 'Kunjungan pembelajaran ke Sekolah Kopi RAISA',
        deskripsi_lengkap:
          'Program Kunjungan Edukatif diperuntukkan bagi sekolah, universitas, dan masyarakat umum yang ingin mengenal lebih dekat proses dan ekosistem industri kopi. Peserta akan diajak berkeliling ke area kebun, laboratorium roasting, dan ruang barista untuk memahami rantai nilai kopi secara menyeluruh. Kegiatan disertai sesi diskusi interaktif dan demo seduh.',
        estimasi_waktu: '1 Hari',
        id_target_peserta: targetUmum.id,
      },
    ],
    skipDuplicates: true,
  })
}
