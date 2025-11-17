import crypto from 'crypto'

export default async function seedKonfigurasiDefault(prisma) {
  console.log('🚀 Seeding Konfigurasi Default untuk semua jenis layanan...')

  // 1️⃣ Ambil semua kegiatan + subkegiatannya (skip sub "Pemasaran")
  const kegiatanList = await prisma.kegiatan.findMany({
    include: {
      subKegiatans: {
        where: { nama_sub_kegiatan: { not: 'Pemasaran' } },
      },
    },
  })

  if (kegiatanList.length === 0) {
    console.warn('⚠️ Tidak ada kegiatan ditemukan, skip konfigurasi.')
    return
  }

  // 2️⃣ Ambil semua jenis layanan
  const semuaLayanan = await prisma.jenisLayanan.findMany()
  if (semuaLayanan.length === 0) {
    console.warn('⚠️ Tidak ada jenis layanan ditemukan, skip konfigurasi.')
    return
  }

  // 3️⃣ Buat kombinasi kegiatan-subkegiatan → hash struktur umum
  const kombinasi = kegiatanList.map(keg => ({
    kegiatan: keg.id,
    sub: keg.subKegiatans.map(sub => sub.id),
  }))

  const kombinasiString = JSON.stringify(kombinasi)
  const strukturHash = crypto.createHash('sha256').update(kombinasiString).digest('hex')

  // 4️⃣ Loop tiap jenis layanan → buat konfigurasi masing-masing
  for (const jenis of semuaLayanan) {
    // Cek apakah sudah ada untuk kombinasi struktur + jenis layanan ini
    const existing = await prisma.konfigurasiLayanan.findFirst({
      where: {
        hash_konfigurasi: strukturHash,
        id_jenis_layanan: jenis.id,
      },
    })

    if (existing) {
      console.log(`✅ Konfigurasi sudah ada untuk layanan "${jenis.nama_jenis_layanan}", skip.`)
      continue
    }

    // Jalankan transaksi agar atomic
    await prisma.$transaction(async (tx) => {
      // 1️⃣ Buat konfigurasi_layanan
      const konfigurasi = await tx.konfigurasiLayanan.create({
        data: {
          id_jenis_layanan: jenis.id,
          hash_konfigurasi: strukturHash,
          catatan: `Konfigurasi default untuk ${jenis.nama_jenis_layanan}`,
        },
      })

      console.log(`🧩 Membuat konfigurasi_layanan id=${konfigurasi.id} (${jenis.nama_jenis_layanan})`)

      // 2️⃣ Siapkan data detail
      const detailData = []
      let urutan = 1

      for (const keg of kegiatanList) {
        for (const sub of keg.subKegiatans) {
          detailData.push({
            id_konfigurasi_layanan: konfigurasi.id,
            id_kegiatan: keg.id,
            id_sub_kegiatan: sub.id,
            urutan_ke: urutan++,
          })
        }
      }

      // 3️⃣ Masukkan semua detail
      await tx.detailKonfigurasi.createMany({ data: detailData })

      console.log(
        `   ↳ ${detailData.length} detail_konfigurasi berhasil dibuat untuk "${jenis.nama_jenis_layanan}"`
      )
    })
  }

  console.log('🎉 Semua konfigurasi default berhasil dibuat untuk semua jenis layanan!')
}
