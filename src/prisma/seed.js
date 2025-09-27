const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcryptjs')

async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

async function main() {
  // Seed data User
  await prisma.user.createMany({
    data: [
      { name: "DummyPengunjung", email: "pengunjung@example.com", password: await hashPassword("pengunjung"), admin: false, },
      { name: "DummyAdmin", email: "admin@example.com", password: await hashPassword("admin"), admin: true,  }
    ],
    skipDuplicates: true,
  })


}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
