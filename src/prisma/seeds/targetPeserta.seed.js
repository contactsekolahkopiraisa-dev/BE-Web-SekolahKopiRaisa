export default async function seedTargetPeserta(prisma) {
  console.log('Seeding TargetPeserta...')
  await prisma.targetPeserta.createMany({
    data: [
      { nama_target: 'Siswa/Mahasiswa' },
      { nama_target: 'Umum' },
    ],
    skipDuplicates: true,
  })
}
