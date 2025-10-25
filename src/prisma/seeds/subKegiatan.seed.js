// export default async function seedSubKegiatan(prisma) {
//   console.log('Seeding SubKegiatan...')
//   const pembibitan = await prisma.kegiatan.findFirst({ where: { nama_kegiatan: 'Pembibitan' } })
//   const panen = await prisma.kegiatan.findFirst({ where: { nama_kegiatan: 'Panen' } })

//   if (!pembibitan || !panen) return console.warn('⚠️ Kegiatan belum ada, skip SubKegiatan')

//   await prisma.subKegiatan.createMany({
//     data: [
//       { id_kegiatan: pembibitan.id, nama_sub_kegiatan: 'Penyemaian', jam_durasi: 2, deskripsi: 'Penyemaian benih.' },
//       { id_kegiatan: pembibitan.id, nama_sub_kegiatan: 'Pemindahan Bibit', jam_durasi: 3 },
//       { id_kegiatan: panen.id, nama_sub_kegiatan: 'Pemetikan', jam_durasi: 4 },
//       { id_kegiatan: panen.id, nama_sub_kegiatan: 'Sortir Hasil', jam_durasi: 2 },
//     ],
//     skipDuplicates: true,
//   })
// }
