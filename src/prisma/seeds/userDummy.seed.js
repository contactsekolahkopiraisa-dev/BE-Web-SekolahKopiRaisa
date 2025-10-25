import bcrypt from 'bcryptjs'

async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

export default async function seedUserDummy(prisma) {
  console.log('Seeding User Dummy...')
  await prisma.user.createMany({
    data: [
      { name: "DummyPengunjung", email: "pengunjung@example.com", password: await hashPassword("pengunjung"), admin: false, },
      { name: "DummyAdmin", email: "admin@example.com", password: await hashPassword("admin"), admin: true,  }
    ],
    skipDuplicates: true,
  })
}