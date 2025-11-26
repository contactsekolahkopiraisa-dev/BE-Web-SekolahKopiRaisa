const prisma = require('../db/index.js');

const subKegiatanRepository = {
    findActiveSubKegiatanByJenisLayanan: async (kegiatanId, jenisLayananId) => {
        const rows = await prisma.detailKonfigurasi.findMany({
            where: {
                id_kegiatan: kegiatanId,
                konfigurasiLayanan: {
                    id_jenis_layanan: jenisLayananId,
                    is_active: true,
                },
            },
            select: {
                id_sub_kegiatan: true,
                subKegiatan: true
            }
        });
        return rows.map(r => r.subKegiatan);
    }
}

const konfigurasiLayananRepository = {
    findByHashAndJenis: async (hash, idJenisLayanan) => prisma.KonfigurasiLayanan.findFirst({
        where: {
            hash_konfigurasi: hash,
            id_jenis_layanan: idJenisLayanan
        },
        include: {
            detailKonfigurasis: {
                include: {
                    kegiatan: true,
                    subKegiatan: true
                },
                orderBy: { urutan_ke: "asc" }
            }
        }
    }),
    create: async (idJenis, hash, isActive, listDetail) => {
        return prisma.$transaction(async (tx) => {
            // 1. Create header
            const header = await tx.konfigurasiLayanan.create({
                data: {
                    id_jenis_layanan: idJenis,
                    hash_konfigurasi: hash,
                    is_active: isActive
                }
            });
            // 2. Generate detail rows
            let urutan = 1;
            const detailRows = listDetail
                .flatMap(item =>
                    item.id_sub_kegiatan.map(sub => ({
                        id_konfigurasi_layanan: header.id,
                        id_kegiatan: item.id_kegiatan,
                        id_sub_kegiatan: sub,
                        urutan_ke: urutan++
                    }))
                );
            // 3. Insert detail
            await tx.detailKonfigurasi.createMany({ data: detailRows });
            // 4. Fetch ulang hasil lengkap (with include) ✔
            return tx.konfigurasiLayanan.findUnique({
                where: { id: header.id },
                include: {
                    detailKonfigurasis: {
                        include: {
                            kegiatan: true,
                            subKegiatan: true
                        },
                        orderBy: { urutan_ke: "asc" }
                    }
                }
            });
        });
    }
}

const layananRepository = {
    findAll: async (filterOptions = {}) => {
        return prisma.layanan.findMany({
            ...filterOptions,
            select: {
                id: true,
                nama_kegiatan: true,
                tempat_kegiatan: true,
                jumlah_peserta: true,
                instansi_asal: true,
                tanggal_mulai: true,
                tanggal_selesai: true,
                link_logbook: true,
                file_proposal: true,
                file_surat_permohonan: true,
                file_surat_pengantar: true,
                file_surat_undangan: true,
                created_at: true,
                jenisLayanan: {
                    select: { id: true, nama_jenis_layanan: true }
                },
                layananRejection: true,
                statusKodePengajuan: true,
                statusKodePelaksanaan: true,
                user: {
                    select: { id: true, name: true }
                },
                pesertas: {
                    select: {
                        id: true,
                        nama_peserta: true,
                        instansi_asal: true,
                        fakultas: true,
                        program_studi: true,
                        nim: true,
                    }
                },
                mou: {
                    select: {
                        id: true,
                        statusKode: true,
                        file_mou: true,
                        tanggal_upload: true,
                        mouRejection: true
                    }
                },
                laporan: {
                    select: {
                        id: true,
                        nama_p4s: true,
                        asal_kab_kota: true,
                        foto_kegiatan: true,
                        statusPelaporan: true,
                        layanan: {
                            select: {
                                nama_kegiatan: true,
                                jenisLayanan: {
                                    select: {
                                        nama_jenis_layanan: true
                                    }
                                }
                            }
                        }
                    }
                },
                sertifikat: {
                    select: {
                        id: true,
                        tanggal_terbit: true,
                        no_sertifikat: true,
                        file_sertifikat: true,
                    }
                },
                konfigurasiLayanan: {
                    select: {
                        detailKonfigurasis: {
                            select: {
                                kegiatan: {
                                    select: {
                                        id: true,
                                        nama_kegiatan: true

                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    },
    findById: async (filterOptions = {}) => {
        return prisma.layanan.findFirst({
            ...filterOptions,
            select: {
                id: true,
                nama_kegiatan: true,
                tempat_kegiatan: true,
                jumlah_peserta: true,
                instansi_asal: true,
                tanggal_mulai: true,
                tanggal_selesai: true,
                link_logbook: true,
                file_proposal: true,
                file_surat_permohonan: true,
                file_surat_pengantar: true,
                file_surat_undangan: true,
                created_at: true,
                jenisLayanan: {
                    select: { id: true, nama_jenis_layanan: true }
                },
                layananRejection: true,
                statusKodePengajuan: true,
                statusKodePelaksanaan: true,
                user: {
                    select: { id: true, name: true }
                },
                pesertas: {
                    select: {
                        id: true,
                        nama_peserta: true,
                        instansi_asal: true,
                        fakultas: true,
                        program_studi: true,
                        nim: true,
                    }
                },
                mou: {
                    select: {
                        id: true,
                        statusKode: true,
                        file_mou: true,
                        tanggal_upload: true,
                        mouRejection: true
                    }
                },
                laporan: {
                    select: {
                        id: true,
                        nama_p4s: true,
                        asal_kab_kota: true,
                        foto_kegiatan: true,
                        statusPelaporan: true,
                        layanan: {
                            select: {
                                nama_kegiatan: true,
                                jenisLayanan: {
                                    select: {
                                        nama_jenis_layanan: true
                                    }
                                }
                            }
                        }
                    }
                },
                sertifikat: {
                    select: {
                        id: true,
                        tanggal_terbit: true,
                        no_sertifikat: true,
                        file_sertifikat: true,
                    }
                },
                konfigurasiLayanan: {
                    select: {
                        detailKonfigurasis: {
                            select: {
                                kegiatan: {
                                    select: {
                                        id: true,
                                        nama_kegiatan: true

                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    },
    // DEV NOTES : INI MASIH HARD CODE SEPERTI INI KARENA KEBUTUHANNYA MASIH HANYA INI
    // KALAU NANTI BUTUH FIND DENGAN PARAM LEBIH BANYAK, CONSIDER PAKAI QUERY PARAM DAN FIND SECARA DYNAMIC
    findOngoingByUserAndJenis: async (userId, jenisList) => {
        return prisma.layanan.findMany({
            where: {
                id_user: userId,
                jenisLayanan: {
                    nama_jenis_layanan: { in: jenisList }
                },
                tanggal_selesai: { gte: new Date() }
            }
        });
    },
    create: async (data) => {
        return prisma.layanan.create({
            data,
            include: {
                konfigurasiLayanan: {
                    include: {
                        detailKonfigurasis: {
                            include: {
                                kegiatan: true,
                                subKegiatan: true
                            },
                            orderBy: { urutan_ke: "asc" }
                        }
                    }
                },
                statusKodePengajuan: true,
                statusKodePelaksanaan: true,
                jenisLayanan: true,
                user: true
            },
        });
    },
    update: async (idLayanan, data) => {
        return prisma.Layanan.update({
            where: {
                id: Number(idLayanan)
            },
            data: data,
            include: {
                layananRejection: true,
                statusKodePengajuan: true,
                statusKodePelaksanaan: true,
                pesertas: true
            }
        });
    },
};

const layananRejectionRepository = {
    create: async (data) => {
        return prisma.layananRejection.create({
            data
        })
    }
}

const pesertaRepository = {
    create: (data) => prisma.Peserta.create({
        data
    }),
    createMany: (list) => prisma.Peserta.createMany({
        data: list
    }),
}

const jenisLayananRepository = {
    // cari semua jenis. ini pakai include semua : $jenis->konfigurasi->kegiatan2->sub2
    findAll: async () =>
        await prisma.jenisLayanan.findMany({
            include: {
                targetPeserta: true,

                konfigurasiLayanans: {
                    where: { is_active: true },
                    include: {
                        detailKonfigurasis: {
                            include: {
                                kegiatan: true,
                                subKegiatan: true,
                            },
                            orderBy: { urutan_ke: 'asc' }, // opsional: urutkan sesuai urutan
                        },
                    },
                },
            },
        }),

    findById: async (id) => await prisma.JenisLayanan.findUnique({
        where: { id: parseInt(id) },
        include: {
            targetPeserta: true,
        },
    }),
    findByName: async (name) => {
        return await prisma.JenisLayanan.findFirst({
            where: {
                nama_jenis_layanan: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        })
    },
    update: async (id, safeData) => prisma.JenisLayanan.update({
        where: { id: parseInt(id) },
        data: safeData
    })
};

const targetPesertaRepository = {
    findAll: async () => await prisma.TargetPeserta.findMany(),
    findById: async (id) => await prisma.TargetPeserta.findUnique({
        where: { id: parseInt(id) },
    })
}

const statusKodeRepository = {
    getAll: async () => prisma.statusKode.findMany(),
    findById: async (id) => await prisma.StatusKode.findUnique({
        where: { id: parseInt(id) }
    }),
    findByName: async (name) => {
        return await prisma.StatusKode.findFirst({
            where: {
                nama_status_kode: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        })
    }
}


module.exports = {
    layananRepository,
    jenisLayananRepository,
    targetPesertaRepository,
    statusKodeRepository,
    konfigurasiLayananRepository,
    pesertaRepository,
    subKegiatanRepository,
    layananRejectionRepository,
};