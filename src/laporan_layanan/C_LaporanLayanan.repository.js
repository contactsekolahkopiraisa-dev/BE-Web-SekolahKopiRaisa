const prisma = require('../db/index.js');

const laporanLayananRepository = {
    findById: async (id) => {
        return prisma.Laporan.findFirst({
            where: { id: parseInt(id)},
            include: { 
                layanan: {
                    select: {
                        id: true,
                        instansi_asal: true,
                        jumlah_peserta: true,
                        tanggal_mulai: true,
                        tanggal_selesai: true,
                        jenisLayanan: {
                            select: {
                                nama_jenis_layanan: true
                            }
                        }
                    }
                },
                statusPelaporan: true
            }
        })
    },
    create: async (data) => {
        return prisma.Laporan.create({
            data: data,
            include: {
                layanan: {
                    select: {
                        id: true,
                        instansi_asal: true,
                        jumlah_peserta: true,
                        tanggal_mulai: true,
                        tanggal_selesai: true,
                        jenisLayanan: {
                            select: {
                                nama_jenis_layanan: true
                            }
                        }
                    }
                },
                statusPelaporan: true
            }
        })
    }
}



module.exports = {
    laporanLayananRepository
}