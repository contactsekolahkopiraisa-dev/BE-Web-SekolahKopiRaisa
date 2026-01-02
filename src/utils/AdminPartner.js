// src/utils/AdminPartner.js
// Script untuk membuat partner default untuk admin

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultAdminPartner() {
  try {
    // Cek apakah sudah ada partner default admin
    const existingDefaultPartner = await prisma.partner.findFirst({
      where: {
        name: 'Admin Sekolah Kopi Raisa'
      }
    });

    if (existingDefaultPartner) {
      console.log('✅ Partner default admin sudah ada:', existingDefaultPartner);
      return existingDefaultPartner;
    }

    // Buat partner default untuk admin
    const defaultPartner = await prisma.partner.create({
      data: {
        name: 'Admin Sekolah Kopi Raisa',
        owner_name: 'Administrator',
        phone_number: '081234567890', // no hp masih dummy
        user_id: null, // Tidak terkait dengan user tertentu
      }
    });

    console.log('✅ Partner default admin berhasil dibuat:', defaultPartner);
    return defaultPartner;
  } catch (error) {
    console.error('❌ Error membuat partner default admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan jika file ini dieksekusi langsung
if (require.main === module) {
  createDefaultAdminPartner()
    .then(() => {
      console.log('Migration selesai!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration gagal:', error);
      process.exit(1);
    });
}

module.exports = { createDefaultAdminPartner };