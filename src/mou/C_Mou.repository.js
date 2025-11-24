const prisma = require('../db/index.js');


const mouRepository = {
    findById: async (id, tx = prisma) => {
        return tx.Mou.findUnique({
            where: { id: parseInt(id) },
            include: {
                statusKode: true,
                mouRejection: true
            }
        })
    },
    create: async (data, tx = prisma) => {
        return tx.Mou.create({
            data,
            include: {
                statusKode: true,
                mouRejection: true
            }
        })
    },
    update: async (id, data, tx = prisma) => {
        return tx.Mou.update({
            where: { id: parseInt(id) },
            data: {
                file_mou: data.file_mou,
                id_status_pengajuan: data.id_status_pengajuan,
                tanggal_disetujui: data.tanggal_disetujui
            },
            include: {
                statusKode: true,
                mouRejection: true
            }
        })
    },
};

const mouRejectionRepository = {
    findById: async (id = tx = prisma) => {
        return tx.MouRejection.findUnique({
            where: { id: parseInt(id) }
        })
    },
    create: async (data, tx = prisma) => {
        return tx.MouRejection.create({
            data
        })
    },
    delete: async (id, tx = prisma) => {
        return tx.MouRejection.delete({
            where: { id: parseInt(id) }
        })
    },
}


module.exports = {
    mouRepository,
    mouRejectionRepository
};