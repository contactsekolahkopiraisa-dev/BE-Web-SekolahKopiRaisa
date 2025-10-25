import { PrismaClient } from '@prisma/client'
import seedTargetPeserta from './seeds/targetPeserta.seed.js'
import seedStatusKode from './seeds/statusKode.seed.js'
import seedJenisLayanan from './seeds/jenisLayanan.seed.js'
import seedKegiatan from './seeds/detailKonfigurasi.seed.js'
import seedSubKegiatan from './seeds/subKegiatan.seed.js'
import seedKonfigurasiLayanan from './seeds/konfigurasiLayanan.seed.js'
import seedDetailKonfigurasi from './seeds/detailKonfigurasi.seed.js'
import seedUserDummy from './seeds/userDummy.seed.js'

const prisma = new PrismaClient()

async function main() {
  console.log('starting modular seeding...')

  await seedTargetPeserta(prisma)
  await seedStatusKode(prisma)
  await seedJenisLayanan(prisma)
  await seedKegiatan(prisma)
  // await seedSubKegiatan(prisma)
  // await seedKonfigurasiLayanan(prisma)
  // await seedDetailKonfigurasi(prisma)
  await seedUserDummy(prisma)

  console.log('seeding completed!')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
