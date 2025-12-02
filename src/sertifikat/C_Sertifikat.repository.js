const prisma = require('../db/index.js');

const sertifikatRepository = {
    getById: async (id) => {
        return prisma.sertifikat.findFirst({
            where: { id: parseInt(id) },
            select: {
                id: true,
                created_at: true,
                link_sertifikat: true,
                file_sertifikat: true,
                layanan: {
                    select: {
                        id: true,
                        id_user: true,
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