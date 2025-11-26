const prisma = require('../db/index.js');

const sertifikatRepository = {
    getById: async (id) => {
        return prisma.sertifikat.findFirst({
            where: { id: parseInt(id) },
            select: {
                id: true,
                tanggal_terbit: true,
                no_sertifikat: true,
                file_sertifikat: true,
                layanan: {
                    select: {
                        id: true,
                        user_id: true,
                    }
                }
            }
        })
    },
    create: async (data) => {
        return prisma.sertifikat.create({
            data
        })
    }
}


module.exports = {
    sertifikatRepository
}