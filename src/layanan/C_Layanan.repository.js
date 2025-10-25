const prisma = require('../db/index.js');

// const layananRepository = {
//     findAllLayanan: () => prisma.Layanan.findMany(),
//     findLayananById: (id) => prisma.Layanan.findUnique({
//         where: { id: parseInt(id) },
//     }),

// };

const jenisLayananRepository = {
    findAll: async () => await prisma.JenisLayanan.findMany({
        include: {
            targetPeserta: true,
        },
    }),
    findById: async (id) => await prisma.JenisLayanan.findUnique({
        where: { id: parseInt(id) },
        include: {
            targetPeserta: true,
        },
    }),
    update: async (id, safeData) => prisma.JenisLayanan.update({
        where: { id: parseInt(id)},
        data: safeData
    })
};

const targetPesertaRepository = {
    findAll: async () => await prisma.TargetPeserta.findMany(),
    findById: async (id) => await prisma.TargetPeserta.findUnique({
        where: { id: parseInt(id) },
    })
}


module.exports = {
    // layananRepository,
    jenisLayananRepository,
    targetPesertaRepository
};