// import crypto from 'crypto'

// export default async function seedKonfigurasiLayanan(prisma) {
//   console.log('Seeding KonfigurasiLayanan...')

//   const jenis = await prisma.jenisLayanan.findMany()
//   for (const j of jenis) {
//     const hash = crypto.createHash('sha256').update(`${j.id}:[1,2,3]`).digest('hex')
//     await prisma.konfigurasiLayanan.upsert({
//       where: { id_jenis_layanan: j.id },
//       update: {},
//       create: {
//         id_jenis_layanan: j.id,
//         hash_konfigurasi: hash,
//         catatan: `Default konfigurasi untuk ${j.nama_jenis_layanan}`,
//       },
//     })
//   }
// }
