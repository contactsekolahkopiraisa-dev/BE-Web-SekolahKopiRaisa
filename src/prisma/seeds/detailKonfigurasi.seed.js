// export default async function seedDetailKonfigurasi(prisma) {
//   console.log('Seeding DetailKonfigurasi...')
//   const konfigs = await prisma.konfigurasiLayanan.findMany()
//   const kegiatan = await prisma.kegiatan.findMany()
//   const sub = await prisma.subKegiatan.findMany()

//   if (!konfigs.length || !kegiatan.length || !sub.length)
//     return console.warn('⚠️ Data belum lengkap, skip DetailKonfigurasi')

//   for (const k of konfigs) {
//     await prisma.detailKonfigurasi.createMany({
//       data: [
//         {
//           id_konfigurasi_layanan: k.id,
//           id_kegiatan: kegiatan[0].id,
//           id_sub_kegiatan: sub[0].id,
//         },
//       ],
//       skipDuplicates: true,
//     })
//   }
// }
