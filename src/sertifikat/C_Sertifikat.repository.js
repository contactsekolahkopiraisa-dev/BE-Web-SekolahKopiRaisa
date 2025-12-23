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
                    },
                    include: {
                        konfigurasiLayanan: {
                            include: {
                                detailKonfigurasis: {
                                    include: {
                                        kegiatan: true,
                                        subKegiatan: true,
                                    },
                                    orderBy: { urutan_ke: "asc" },
                                },
                            },
                        },
                    }
                }
            }
        })
    },
    create: async (data) => {
        return prisma.sertifikat.create({
            data,
            include: {
                layanan: {
                    include: {
                        user: {
                            select: {
                                email: true
                            }
                        },
                        konfigurasiLayanan: {
                            include: {
                                detailKonfigurasis: {
                                    include: {
                                        kegiatan: true,
                                        subKegiatan: true,
                                    },
                                    orderBy: { urutan_ke: "asc" },
                                },
                            },
                        },
                    }
                }
            }
        })
    }
}


module.exports = {
    sertifikatRepository
}